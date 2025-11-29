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

async function exportDemoUsers() {
    console.log('Starting to export demo users...');

    try {
        // Export demo users (excluding the main user, id=1)
        // Check if email column exists
        const emailColumnCheck = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email'
        `);
        const hasEmailColumn = emailColumnCheck.rows.length > 0;
        
        const usersResult = await query(`
            SELECT id, username, password, ${hasEmailColumn ? 'email,' : ''} created_at
            FROM users
            WHERE id > 1
            ORDER BY id
        `);

        // Export people records for demo users
        const peopleResult = await query(`
            SELECT p.id, p.name, p.phone_number, p.user_id, p.created_at, p.updated_at
            FROM people p
            WHERE p.user_id > 1
            ORDER BY p.id
        `);

        // Export connections between demo users (and connections with main user)
        const connectionsResult = await query(`
            SELECT 
                pc.person_id,
                pc.connected_person_id,
                pc.initiated_by_person_id,
                pc.status,
                pc.connected_at
            FROM people_connections pc
            WHERE pc.person_id > 1 OR pc.connected_person_id > 1
            ORDER BY pc.person_id, pc.connected_person_id
        `);

        // Export OAuth providers for demo users (if any)
        const oauthResult = await query(`
            SELECT 
                op.id,
                op.user_id,
                op.provider,
                op.provider_user_id,
                op.email,
                op.created_at
            FROM oauth_providers op
            WHERE op.user_id > 1
            ORDER BY op.id
        `);

        const demoData = {
            exported_at: new Date().toISOString(),
            users: usersResult.rows,
            people: peopleResult.rows,
            connections: connectionsResult.rows,
            oauth_providers: oauthResult.rows
        };

        // Create backups directory if it doesn't exist
        const backupsDir = path.join(__dirname, 'backups');
        await fs.mkdir(backupsDir, { recursive: true });

        // Save to file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `demo-users-${timestamp}.json`;
        const filepath = path.join(backupsDir, filename);

        await fs.writeFile(filepath, JSON.stringify(demoData, null, 2));
        console.log(`Demo users exported to: ${filepath}`);
        console.log(`Exported ${usersResult.rows.length} users, ${peopleResult.rows.length} people, ${connectionsResult.rows.length} connections`);

        // Also save as latest
        const latestFilepath = path.join(backupsDir, 'demo-users-latest.json');
        await fs.writeFile(latestFilepath, JSON.stringify(demoData, null, 2));
        console.log(`Also saved as: ${latestFilepath}`);

        return demoData;
    } catch (error) {
        console.error('Error exporting demo users:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    exportDemoUsers()
        .then(() => {
            console.log('Export completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Export failed:', error);
            process.exit(1);
        });
}

module.exports = { exportDemoUsers };

