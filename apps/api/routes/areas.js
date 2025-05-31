console.log('Loading areas route...');

module.exports = async function (fastify, opts) {
  // GET /api/areas/info
  fastify.get('/info', async (request, reply) => {
    console.log('GET /api/areas/info called');
    try {
      let ids = request.query.ids;
      let query = `
        WITH RECURSIVE area_hierarchy AS (
          -- Base case: get the requested areas
          SELECT
            id,
            name,
            parent_id,
            CASE
              WHEN bbox IS NOT NULL THEN
                ARRAY[
                  ST_XMin(bbox), ST_YMin(bbox),
                  ST_XMax(bbox), ST_YMax(bbox)
                ]
              ELSE NULL
            END AS bbox,
            leaf,
            lat,
            lng,
            0 as level
          FROM areas
          WHERE id = ANY($1)
          
          UNION ALL
          
          -- Recursive case: get the ancestors
          SELECT
            a.id,
            a.name,
            a.parent_id,
            CASE
              WHEN a.bbox IS NOT NULL THEN
                ARRAY[
                  ST_XMin(a.bbox), ST_YMin(a.bbox),
                  ST_XMax(a.bbox), ST_YMax(a.bbox)
                ]
              ELSE NULL
            END AS bbox,
            a.leaf,
            a.lat,
            a.lng,
            h.level + 1
          FROM areas a
          INNER JOIN area_hierarchy h ON a.id = h.parent_id
        )
        SELECT * FROM area_hierarchy
        ORDER BY level DESC, name;
      `;
      let params = [];
      if (ids) {
        const idList = ids.split(',').map(id => id.trim());
        params.push(idList);
      } else {
        // If no IDs provided, return empty result
        params.push([]);
      }
      const { rows } = await fastify.db.query(query, params);
      console.log('API Response:', JSON.stringify(rows, null, 2));
      reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch area info' });
    }
  });
}; 