const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    // Connect to the database
    const pool = new Pool({
        user: 'verbuser',
        password: 'secretpassword',
        host: 'db',
        port: 5432,
        database: 'verbclub'
    });

    try {
        // Test the connection
        await pool.query('SELECT 1');
        console.log('Database connection successful');

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute each statement in the schema file
        await pool.query(schemaSQL);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await pool.end();
    }
}

module.exports = initDatabase; 