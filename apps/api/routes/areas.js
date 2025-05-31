console.log('Loading areas route...');

module.exports = async function (fastify, opts) {
  // GET /api/areas/info
  fastify.get('/info', async (request, reply) => {
    console.log('GET /api/areas/info called');
    try {
      let ids = request.query.ids;
      let query = `
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
          lng
        FROM areas
      `;
      let params = [];
      if (ids) {
        const idList = ids.split(',').map(id => id.trim());
        query += ` WHERE id = ANY($1)`;
        params.push(idList);
      }
      const { rows } = await fastify.db.query(query, params);
      reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch area info' });
    }
  });
}; 