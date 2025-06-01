const { Pool } = require('pg');
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

async function addBreadcrumbColumn() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Checking if breadcrumb column exists...');
        
        // Check if column exists
        const { rows: [columnCheck] } = await client.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'areas' 
                AND column_name = 'breadcrumb'
            );
        `);

        if (columnCheck.exists) {
            console.log('Breadcrumb column already exists, skipping...');
            await client.query('COMMIT');
            return;
        }

        console.log('Adding breadcrumb column (nullable first)...');
        
        // First add the column as nullable
        await client.query(`
            ALTER TABLE areas 
            ADD COLUMN breadcrumb TEXT[];
        `);

        console.log('Setting initial values...');
        
        // Then set the initial values
        await client.query(`
            UPDATE areas 
            SET breadcrumb = ARRAY[id];
        `);

        console.log('Making column NOT NULL...');
        
        // Finally make it NOT NULL
        await client.query(`
            ALTER TABLE areas 
            ALTER COLUMN breadcrumb SET NOT NULL;
        `);

        console.log('✅ Successfully added breadcrumb column to areas table');

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding breadcrumb column:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
addBreadcrumbColumn().catch(console.error); 