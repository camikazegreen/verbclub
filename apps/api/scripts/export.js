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
    statement_timeout: 30000 // 30 second timeout
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

async function getAreasWithHierarchy() {
    console.log('Starting to fetch areas...');
    
    // First, let's see all areas in the database
    const allAreas = await query(`
        WITH RECURSIVE area_hierarchy AS (
            -- Base case: start with root nodes (no parent or self-referential)
            SELECT 
                id,
                parent_id,
                0 as level
            FROM areas
            WHERE parent_id IS NULL OR parent_id = id

            UNION ALL

            -- Recursive case: join child areas with their parents
            SELECT 
                a.id,
                a.parent_id,
                ah.level + 1
            FROM areas a
            INNER JOIN area_hierarchy ah ON a.parent_id = ah.id
            WHERE a.id != a.parent_id  -- Exclude self-referential nodes
        )
        SELECT 
            a.id,
            a.name,
            a.parent_id,
            ST_AsGeoJSON(a.geometry)::json as geometry,
            a.metadata,
            COALESCE(ah.level, 0) as level,
            ST_X(ST_Centroid(a.geometry)) as centroid_lng,
            ST_Y(ST_Centroid(a.geometry)) as centroid_lat,
            ST_AsGeoJSON(ST_Envelope(a.geometry))::json as bbox
        FROM areas a
        LEFT JOIN area_hierarchy ah ON a.id = ah.id
        ORDER BY a.name;
    `);

    console.log('\nAll areas in database:');
    allAreas.rows.forEach(area => {
        const indent = '  '.repeat(area.level || 0);
        console.log(`${indent}${area.name} (${area.id}) - Parent: ${area.parent_id || 'none'}`);
    });

    return allAreas.rows;
}

async function convertToGeoJSON(areas) {
    console.log('Converting areas to GeoJSON format...');
    const features = areas.map(area => {
        // Ensure metadata is a proper object
        let metadata = area.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                console.warn(`Warning: Could not parse metadata for area ${area.name}, using empty object`);
                metadata = {};
            }
        } else if (!metadata || typeof metadata !== 'object') {
            metadata = {};
        }

        // Update metadata with PostGIS-calculated values
        metadata.lat = area.centroid_lat;
        metadata.lng = area.centroid_lng;
        metadata.bbox = area.bbox;

        return {
            type: 'Feature',
            properties: {
                id: area.id,
                name: area.name,
                parent: area.parent_id,
                level: area.level,
                metadata: metadata
            },
            geometry: area.geometry
        };
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

async function main() {
    try {
        console.log('Starting export process...');
        const areas = await getAreasWithHierarchy();
        console.log(`\nFound ${areas.length} areas`);

        console.log('\nConverting to GeoJSON...');
        const geojson = await convertToGeoJSON(areas);

        const outputPath = path.join(__dirname, 'areas.geojson');
        console.log(`\nWriting to ${outputPath}...`);
        await fs.writeFile(outputPath, JSON.stringify(geojson, null, 2));

        console.log('\nExport complete!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main(); 