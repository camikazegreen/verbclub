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

async function backupAreas() {
    try {
        // Get all areas with their current state
        const { rows: areas } = await query(`
            SELECT *
            FROM areas
            ORDER BY id;
        `);

        // Create backup directory if it doesn't exist
        const backupDir = path.join(__dirname, 'backups');
        await fs.mkdir(backupDir, { recursive: true });

        // Generate timestamp for the backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `areas-backup-${timestamp}.json`);

        // Write the backup to file
        await fs.writeFile(
            backupFile,
            JSON.stringify(areas, null, 2)
        );

        console.log(`✅ Backup created successfully at: ${backupFile}`);
        console.log(`📊 Total areas backed up: ${areas.length}`);

    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the backup
backupAreas().catch(console.error); 