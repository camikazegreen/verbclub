const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

async function getBackupFiles() {
    const backupDir = path.join(__dirname, 'backups');
    try {
        const files = await fs.readdir(backupDir);
        return files
            .filter(file => file.startsWith('areas-backup-') && file.endsWith('.json'))
            .sort()
            .reverse(); // Most recent first
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No backups directory found');
            return [];
        }
        throw error;
    }
}

async function selectBackup() {
    const backups = await getBackupFiles();
    if (backups.length === 0) {
        console.log('No backup files found');
        process.exit(1);
    }

    console.log('\nAvailable backups:');
    backups.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
    });

    // Get backup number from command line argument
    const backupNumber = parseInt(process.argv[2]);
    if (!backupNumber || backupNumber < 1 || backupNumber > backups.length) {
        console.log(`\nPlease provide a valid backup number (1-${backups.length}) as a command line argument`);
        console.log('Example: node restore-backup.js 1');
        process.exit(1);
    }

    return backups[backupNumber - 1];
}

function sortAreasByHierarchy(areas) {
    // Create a map of areas by their ID for quick lookup
    const areaMap = new Map(areas.map(area => [area.id, area]));
    
    // Function to get the depth of an area
    function getDepth(area) {
        if (!area.parent_id || area.parent_id === area.id) return 0;
        const parent = areaMap.get(area.parent_id);
        return parent ? getDepth(parent) + 1 : 0;
    }

    // Sort areas by their depth in the hierarchy
    return areas.sort((a, b) => getDepth(a) - getDepth(b));
}

async function restoreBackup() {
    try {
        // Select backup file
        const backupFile = await selectBackup();
        const backupPath = path.join(__dirname, 'backups', backupFile);
        console.log(`\nSelected backup: ${backupFile}`);
        
        // Read backup data
        console.log('Reading backup file...');
        const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
        console.log(`Found ${backupData.length} areas to restore`);

        // Sort areas by hierarchy
        console.log('Sorting areas by hierarchy...');
        const sortedAreas = sortAreasByHierarchy(backupData);
        console.log('Areas sorted by hierarchy');

        // Start transaction
        console.log('\nConnecting to database...');
        const client = await pool.connect();
        try {
            console.log('Starting transaction...');
            await client.query('BEGIN');

            // Clear existing data
            console.log('Clearing existing data...');
            await client.query('TRUNCATE TABLE areas CASCADE');

            // Insert areas
            console.log('\nRestoring areas...');
            let restored = 0;
            for (const area of sortedAreas) {
                await client.query(`
                    INSERT INTO areas (
                        id, name, description, parent_id, 
                        geometry, centroid, bbox,
                        leaf, metadata
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6, $7,
                        $8, $9
                    )
                `, [
                    area.id,
                    area.name,
                    area.description,
                    area.parent_id,
                    area.geometry,
                    area.centroid,
                    area.bbox,
                    area.leaf,
                    area.metadata
                ]);
                restored++;
                if (restored % 50 === 0) {
                    console.log(`Restored ${restored} areas...`);
                }
            }

            await client.query('COMMIT');
            console.log(`\n✅ Successfully restored ${restored} areas from backup`);

            // Verify the restore
            const { rows: [count] } = await client.query('SELECT COUNT(*) as count FROM areas');
            console.log(`\nVerification: Database now contains ${count.count} areas`);

        } catch (error) {
            console.error('\n❌ Error during restore, rolling back...');
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('\n❌ Error restoring backup:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the restore
restoreBackup().catch(console.error); 