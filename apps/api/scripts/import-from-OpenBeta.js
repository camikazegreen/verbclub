const { Pool } = require('pg');
const path = require('path');

// Use the same database configuration as the API
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text: text.split('\n')[0], duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Error executing query', { text, error });
        throw error;
    }
};

// Helper to validate and format geometry
function validateAndFormatGeometry(polygon) {
    if (!polygon || !Array.isArray(polygon)) return null;
    // Ensure polygon is closed (first and last points are the same)
    if (polygon[0] !== polygon[polygon.length - 1]) {
        polygon.push(polygon[0]);
    }
    return JSON.stringify({ type: 'Polygon', coordinates: [polygon] });
}

// Helper to validate and format bbox
function validateAndFormatBbox(bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return null;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    return JSON.stringify({
        type: 'Polygon',
        coordinates: [[
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat]
        ]]
    });
}

async function fetchAreaByName(name) {
    const endpoint = 'https://api.openbeta.io/graphql';
    const queryBody = {
        query: `
            query {
              areas(filter: {area_name: {exactMatch: true, match: "${name}"}}) {
                id
                area_name
                metadata {
                  lat
                  lng
                  leaf
                  polygon
                  bbox
                  mp_id
                  isDestination
                  isBoulder
                  areaId
                }
                children {
                  id
                  area_name
                  metadata {
                    lat
                    lng
                    leaf
                    polygon
                    bbox
                    areaId
                  }
                  climbs {
                    name
                    metadata {
                      lat
                      lng
                    }
                    type {
                      sport
                      trad
                      tr
                    }
                    grades {
                      yds
                    }
                  }
                }
              }
            }
        `
    };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody)
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        if (json.errors) throw new Error(JSON.stringify(json.errors));
        return json.data.areas;
    } catch (error) {
        console.error('Error fetching area:', error);
        throw error;
    }
}

async function insertArea(area, parentId = null) {
    if (!area.id || !area.area_name) {
        console.warn('Skipping area with missing required fields:', area);
        return;
    }

    const meta = area.metadata || {};
    const polygon = meta.polygon;
    const bbox = meta.bbox;

    try {
        // Get parent's breadcrumb if parent exists
        let breadcrumb = [area.id];
        if (parentId) {
            const parentResult = await query('SELECT breadcrumb FROM areas WHERE id = $1', [parentId]);
            if (parentResult.rows[0]) {
                breadcrumb = [...parentResult.rows[0].breadcrumb, area.id];
            }
        }

        // First, let's log what we're trying to insert
        console.log('Polygon data:', polygon);
        console.log('Bbox data:', bbox);

        const result = await query(
            `INSERT INTO areas (id, name, description, parent_id, lat, lng, geometry, centroid, metadata, leaf, bbox, breadcrumb)
             VALUES ($1, $2, $3, $4, $5, $6, 
                    CASE WHEN $7::jsonb IS NOT NULL THEN 
                         ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
                            ${polygon ? polygon.map(coord => `ST_MakePoint(${coord[0]}, ${coord[1]})`).join(', ') : ''}
                         ])), 4326)
                    ELSE NULL END,
                    CASE WHEN $7::jsonb IS NOT NULL THEN 
                         ST_Centroid(ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
                            ${polygon ? polygon.map(coord => `ST_MakePoint(${coord[0]}, ${coord[1]})`).join(', ') : ''}
                         ])), 4326))
                    ELSE NULL END,
                    $8, $9,
                    ${bbox ? `ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
                        ST_MakePoint(${bbox[0]}, ${bbox[1]}),
                        ST_MakePoint(${bbox[2]}, ${bbox[1]}),
                        ST_MakePoint(${bbox[2]}, ${bbox[3]}),
                        ST_MakePoint(${bbox[0]}, ${bbox[3]}),
                        ST_MakePoint(${bbox[0]}, ${bbox[1]})
                    ])), 4326)` : 'NULL'},
                    $10)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                parent_id = EXCLUDED.parent_id,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                geometry = EXCLUDED.geometry,
                centroid = EXCLUDED.centroid,
                metadata = EXCLUDED.metadata,
                leaf = EXCLUDED.leaf,
                bbox = EXCLUDED.bbox,
                breadcrumb = EXCLUDED.breadcrumb
             RETURNING id, name;`,
            [
                area.id,
                area.area_name,
                null,
                parentId,
                meta.lat,
                meta.lng,
                JSON.stringify(polygon),
                meta,
                meta.leaf,
                breadcrumb
            ]
        );
        
        if (result.rows[0]) {
            console.log(`✅ Area ${result.rows[0].name} (${result.rows[0].id}) ${result.rowCount === 1 ? 'added' : 'updated'}`);
        }
    } catch (error) {
        console.error('Error inserting area:', error);
        throw error;
    }
}

async function insertClimb(climb, areaId) {
    if (!climb.name || !areaId) {
        console.warn('Skipping climb with missing required fields:', climb);
        return;
    }

    const meta = climb.metadata || {};
    const type = climb.type || {};
    const grade = climb.grades?.yds || null;

    try {
        const result = await query(
            `INSERT INTO routes (id, name, description, grade, area_id, lat, lng, geometry, metadata, type_sport, type_trad, type_toprope)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::float, $6::float, 
                    CASE WHEN $5::float IS NOT NULL AND $6::float IS NOT NULL 
                         THEN ST_SetSRID(ST_MakePoint($6::float, $5::float), 4326) 
                         ELSE NULL END,
                    $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                grade = EXCLUDED.grade,
                area_id = EXCLUDED.area_id,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                geometry = EXCLUDED.geometry,
                metadata = EXCLUDED.metadata,
                type_sport = EXCLUDED.type_sport,
                type_trad = EXCLUDED.type_trad,
                type_toprope = EXCLUDED.type_toprope
             RETURNING id, name, grade;`,
            [
                climb.name,
                null,
                grade,
                areaId,
                meta.lat,
                meta.lng,
                meta,
                type.sport || false,
                type.trad || false,
                type.tr || false
            ]
        );

        if (result.rows[0]) {
            const types = [];
            if (type.sport) types.push('sport');
            if (type.trad) types.push('trad');
            if (type.tr) types.push('toprope');
            const typeStr = types.length ? ` (${types.join(', ')})` : '';
            console.log(`✅ Route ${result.rows[0].name}${typeStr} ${result.rows[0].grade || 'ungraded'} ${result.rowCount === 1 ? 'added' : 'updated'}`);
        }
    } catch (error) {
        console.error('Error inserting climb:', error);
        throw error;
    }
}

// Add delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processAreaRecursively(areaName, parentId = null, depth = 0) {
    if (depth > 10) {
        console.warn(`Max recursion depth reached for area: ${areaName}`);
        return;
    }

    try {
        console.log(`\n🔍 Fetching area: ${areaName}`);
        const areas = await fetchAreaByName(areaName);
        if (!areas || areas.length === 0) {
            console.log('No areas found');
            return;
        }
        
        for (const area of areas) {
            await insertArea(area, parentId);
            if (area.children && area.children.length > 0) {
                console.log(`\n📂 Processing ${area.children.length} sub-areas in ${area.area_name}`);
                for (const child of area.children) {
                    await insertArea(child, area.id);
                    if (child.climbs && child.climbs.length > 0) {
                        console.log(`\n🧗 Processing ${child.climbs.length} routes in ${child.area_name}`);
                        for (const climb of child.climbs) {
                            await insertClimb(climb, child.id);
                        }
                    }
                    if (!child.metadata?.leaf) {
                        await delay(1000); // Add 1 second delay between API calls
                        await processAreaRecursively(child.area_name, child.id, depth + 1);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing area ${areaName}:`, error);
        throw error;
    }
}

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0].now);
        await processAreaRecursively('Mount Lemmon (Catalina Highway)');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main(); 