const fs = require('fs');
const path = require('path');
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

async function importAreas() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Read the GeoJSON file
        const geojsonPath = path.join(__dirname, 'climbingAreas_merged.geojson');
        const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

        console.log(`Found ${geojsonData.features.length} areas to import`);

        // First, collect all area IDs
        const areaIds = new Set(geojsonData.features.map(f => f.properties.id));
        console.log(`Found ${areaIds.size} unique area IDs`);

        // Check for invalid parent references
        console.log('\nChecking for invalid parent references...');
        const invalidParents = geojsonData.features.filter(f => {
            const parentId = f.properties.parent;
            return parentId && !areaIds.has(parentId);
        });

        if (invalidParents.length > 0) {
            console.log('\n❌ Found areas with invalid parent references:');
            invalidParents.forEach(area => {
                console.log(`- ${area.properties.name} (${area.properties.id}) references non-existent parent ${area.properties.parent}`);
            });
        } else {
            console.log('✅ All parent references are valid');
        }

        // Convert features to areas and sort by hierarchy
        console.log('\nSorting areas by hierarchy...');
        const areas = geojsonData.features.map(feature => ({
            id: feature.properties.id,
            name: feature.properties.name,
            description: feature.properties.description || null,
            parent_id: feature.properties.parent || null,
            geometry: feature.geometry,
            metadata: {
                leaf: feature.properties.metadata?.leaf || false,
                mp_id: feature.properties.metadata?.mp_id || '',
                areaId: feature.properties.metadata?.areaId || '',
                polygon: feature.properties.metadata?.polygon || null,
                isBoulder: feature.properties.metadata?.isBoulder || false,
                isDestination: feature.properties.metadata?.isDestination || false
            }
        }));

        const sortedAreas = sortAreasByHierarchy(areas);
        console.log('Areas sorted by hierarchy');

        // Import areas in hierarchical order
        console.log('\nImporting areas...');
        for (const area of sortedAreas) {
            // Skip areas with invalid parent references
            if (area.parent_id && !areaIds.has(area.parent_id)) {
                console.log(`Skipping ${area.name} (${area.id}) due to invalid parent reference`);
                continue;
            }

            const result = await client.query(
                `INSERT INTO areas (
                    id,
                    name,
                    description,
                    metadata,
                    geometry,
                    centroid,
                    bbox,
                    parent_id,
                    leaf
                ) VALUES (
                    $1, $2, $3, $4,
                    ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
                    ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)),
                    ST_Envelope(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)),
                    $6,
                    $7
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    metadata = EXCLUDED.metadata,
                    geometry = EXCLUDED.geometry,
                    centroid = EXCLUDED.centroid,
                    bbox = EXCLUDED.bbox,
                    parent_id = EXCLUDED.parent_id,
                    leaf = EXCLUDED.leaf
                RETURNING id, name, parent_id;`,
                [
                    area.id,
                    area.name,
                    area.description,
                    area.metadata,
                    JSON.stringify(area.geometry),
                    area.parent_id,
                    area.metadata.leaf
                ]
            );

            if (result.rows[0]) {
                console.log(`✅ ${result.rows[0].parent_id ? 'Updated' : 'Added'} area ${result.rows[0].name} (${result.rows[0].id})`);
            }
        }

        // Calculate breadcrumbs
        console.log('\nCalculating breadcrumbs...');
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

        console.log('✅ Successfully imported areas and calculated breadcrumbs');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error importing areas:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the import
importAreas().catch(console.error); 