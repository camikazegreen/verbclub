const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    // Connect to the database
    const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    });

    try {
        // Test the connection with retries
        let retries = 5;
        while (retries > 0) {
            try {
                await pool.query('SELECT 1');
                console.log('Database connection successful');
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                console.log(`Database not ready, retrying in 5 seconds... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute each statement in the schema file
        await pool.query(schemaSQL);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error; // Re-throw to ensure the API doesn't start with a broken database
    } finally {
        await pool.end();
    }
}

module.exports = initDatabase; 