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

async function computeBreadcrumbs() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Compute all breadcrumbs in a single recursive query
        await client.query(`
            WITH RECURSIVE area_hierarchy AS (
                -- Base case: start with root nodes
                SELECT 
                    id,
                    parent_id,
                    ARRAY[id] as breadcrumb,
                    0 as level
                FROM areas
                WHERE parent_id IS NULL OR parent_id = id

                UNION ALL

                -- Recursive case: join child areas with their parents
                SELECT 
                    a.id,
                    a.parent_id,
                    ah.breadcrumb || a.id,
                    ah.level + 1
                FROM areas a
                INNER JOIN area_hierarchy ah ON a.parent_id = ah.id
                WHERE a.id != a.parent_id  -- Exclude self-referential nodes
            )
            UPDATE areas a
            SET breadcrumb = h.breadcrumb
            FROM area_hierarchy h
            WHERE a.id = h.id;
        `);

        console.log('✅ Successfully updated all breadcrumbs!');

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error computing breadcrumbs:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
computeBreadcrumbs().catch(console.error); 