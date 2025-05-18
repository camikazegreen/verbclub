const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const turf = require('@turf/turf');
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

async function importAreas() {
    try {
        // Read the GeoJSON file
        const geojsonPath = path.join(__dirname, 'climbingAreas_merged.geojson');
        const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

        console.log(`Found ${geojsonData.features.length} areas to import`);

        // Process each feature
        for (const feature of geojsonData.features) {
            const { properties, geometry } = feature;
            
            // Calculate bbox and centroid from geometry
            const bbox = turf.bbox(geometry);
            const centroid = turf.centroid(geometry);
            
            // Extract metadata fields explicitly
            const metadata = {
                lat: centroid.geometry.coordinates[1],
                lng: centroid.geometry.coordinates[0],
                bbox: bbox,
                leaf: properties.metadata?.leaf || false,
                mp_id: properties.metadata?.mp_id || '',
                areaId: properties.metadata?.areaId || '',
                polygon: properties.metadata?.polygon || null,
                isBoulder: properties.metadata?.isBoulder || false,
                isDestination: properties.metadata?.isDestination || false
            };

            // Update the area in the database
            const result = await query(
                `UPDATE areas 
                SET 
                    metadata = $1,
                    geometry = ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
                    centroid = ST_SetSRID(ST_MakePoint($3, $4), 4326),
                    bbox = ST_MakeEnvelope($5, $6, $7, $8, 4326),
                    parent_id = $9
                WHERE id = $10
                RETURNING id, name, parent_id;`,
                [
                    metadata,
                    JSON.stringify(geometry),
                    metadata.lng,
                    metadata.lat,
                    bbox[0], bbox[1], bbox[2], bbox[3],
                    properties.parent || null,
                    properties.id
                ]
            );

            if (result.rows[0]) {
                console.log(`✅ Updated area ${result.rows[0].name} (${result.rows[0].id})`);
                if (result.rows[0].parent_id) {
                    console.log(`   Parent: ${result.rows[0].parent_id}`);
                }
            } else {
                console.log(`⚠️ Area with ID ${properties.id} not found in database`);
            }
        }

        console.log('Import completed successfully');
    } catch (error) {
        console.error('Error importing areas:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the import
importAreas().catch(console.error); 