const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Use the same database configuration as the API
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    statement_timeout: 30000
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        console.log('Executing query:', text.split('\n')[0]);
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Query completed', { duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Error executing query', { text: text.split('\n')[0], error });
        throw error;
    }
};

async function importDemoUsers(filepath = null) {
    console.log('Starting to import demo users...');

    try {
        // Determine file path
        let dataFile;
        if (filepath) {
            dataFile = path.isAbsolute(filepath) ? filepath : path.join(__dirname, 'backups', filepath);
        } else {
            // Default to latest
            dataFile = path.join(__dirname, 'backups', 'demo-users-latest.json');
        }

        console.log(`Loading demo data from: ${dataFile}`);
        const fileContent = await fs.readFile(dataFile, 'utf8');
        const demoData = JSON.parse(fileContent);

        console.log(`Found ${demoData.users.length} users, ${demoData.people.length} people, ${demoData.connections.length} connections`);

        // Start transaction
        await query('BEGIN');

        try {
            // Clear existing demo users (id > 1) and their related data
            console.log('Clearing existing demo data...');
            await query('DELETE FROM people_connections WHERE person_id > 1 OR connected_person_id > 1');
            await query('DELETE FROM people_blocks WHERE person_id > 1 OR blocked_person_id > 1');
            await query('DELETE FROM oauth_providers WHERE user_id > 1');
            await query('DELETE FROM people WHERE user_id > 1');
            await query('DELETE FROM users WHERE id > 1');

            // Import users (need to handle ID mapping)
            console.log('Importing users...');
            const userIdMap = new Map(); // old_id -> new_id

            // Check if email column exists
            const emailColumnCheck = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'email'
            `);
            const hasEmailColumn = emailColumnCheck.rows.length > 0;

            for (const user of demoData.users) {
                const result = await query(
                    hasEmailColumn
                        ? `INSERT INTO users (username, password, email, created_at)
                           VALUES ($1, $2, $3, $4)
                           RETURNING id`
                        : `INSERT INTO users (username, password, created_at)
                           VALUES ($1, $2, $3)
                           RETURNING id`,
                    hasEmailColumn
                        ? [user.username, user.password, user.email || null, user.created_at]
                        : [user.username, user.password, user.created_at]
                );
                const newUserId = result.rows[0].id;
                userIdMap.set(user.id, newUserId);
                console.log(`  Imported user: ${user.username} (old id: ${user.id} -> new id: ${newUserId})`);
            }

            // Import people records
            console.log('Importing people records...');
            const personIdMap = new Map(); // old_id -> new_id

            for (const person of demoData.people) {
                const newUserId = userIdMap.get(person.user_id);
                if (!newUserId) {
                    console.warn(`  Skipping person ${person.name}: user_id ${person.user_id} not found`);
                    continue;
                }

                const result = await query(
                    `INSERT INTO people (name, phone_number, user_id, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [person.name, person.phone_number, newUserId, person.created_at, person.updated_at]
                );
                const newPersonId = result.rows[0].id;
                personIdMap.set(person.id, newPersonId);
                console.log(`  Imported person: ${person.name} (old id: ${person.id} -> new id: ${newPersonId})`);
            }

            // Import connections (map old person IDs to new ones)
            console.log('Importing connections...');
            let connectionCount = 0;
            for (const conn of demoData.connections) {
                const newPersonId = personIdMap.get(conn.person_id);
                const newConnectedPersonId = personIdMap.get(conn.connected_person_id);
                const newInitiatedById = personIdMap.get(conn.initiated_by_person_id);

                // Skip if either person doesn't exist (or if it's the main user, id=1)
                if (!newPersonId || !newConnectedPersonId || !newInitiatedById) {
                    // Check if it's a connection with the main user (id=1)
                    if (conn.person_id === 1 || conn.connected_person_id === 1) {
                        // Get the main user's person_id
                        const mainUserPersonResult = await query('SELECT id FROM people WHERE user_id = 1');
                        if (mainUserPersonResult.rows.length === 0) {
                            console.warn(`  Skipping connection: main user has no person record`);
                            continue;
                        }
                        const mainUserPersonId = mainUserPersonResult.rows[0].id;

                        const personId = conn.person_id === 1 ? mainUserPersonId : newPersonId;
                        const connectedPersonId = conn.connected_person_id === 1 ? mainUserPersonId : newConnectedPersonId;
                        const initiatedById = conn.initiated_by_person_id === 1 ? mainUserPersonId : newInitiatedById;

                        // Check if connection already exists
                        const existing = await query(
                            `SELECT 1 FROM people_connections 
                             WHERE person_id = $1 AND connected_person_id = $2`,
                            [personId, connectedPersonId]
                        );

                        if (existing.rows.length === 0) {
                            await query(
                                `INSERT INTO people_connections (person_id, connected_person_id, initiated_by_person_id, status, connected_at)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [personId, connectedPersonId, initiatedById, conn.status, conn.connected_at]
                            );
                            connectionCount++;
                        }
                    } else {
                        console.warn(`  Skipping connection: person_id ${conn.person_id} or ${conn.connected_person_id} not found`);
                    }
                    continue;
                }

                // Check if connection already exists
                const existing = await query(
                    `SELECT 1 FROM people_connections 
                     WHERE person_id = $1 AND connected_person_id = $2`,
                    [newPersonId, newConnectedPersonId]
                );

                if (existing.rows.length === 0) {
                    await query(
                        `INSERT INTO people_connections (person_id, connected_person_id, initiated_by_person_id, status, connected_at)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [newPersonId, newConnectedPersonId, newInitiatedById, conn.status, conn.connected_at]
                    );
                    connectionCount++;
                }
            }
            console.log(`  Imported ${connectionCount} connections`);

            // Import OAuth providers
            if (demoData.oauth_providers && demoData.oauth_providers.length > 0) {
                console.log('Importing OAuth providers...');
                for (const oauth of demoData.oauth_providers) {
                    const newUserId = userIdMap.get(oauth.user_id);
                    if (!newUserId) {
                        console.warn(`  Skipping OAuth provider: user_id ${oauth.user_id} not found`);
                        continue;
                    }

                    await query(
                        `INSERT INTO oauth_providers (user_id, provider, provider_user_id, email, created_at)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [newUserId, oauth.provider, oauth.provider_user_id, oauth.email || null, oauth.created_at]
                    );
                }
                console.log(`  Imported ${demoData.oauth_providers.length} OAuth providers`);
            }

            // Commit transaction
            await query('COMMIT');
            console.log('Demo users imported successfully!');

        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error importing demo users:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    const filepath = process.argv[2] || null;
    importDemoUsers(filepath)
        .then(() => {
            console.log('Import completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importDemoUsers };

