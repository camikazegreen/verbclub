async function protectedRoutes(fastify, options) {
  // Protected route example
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const result = await fastify.db.query(
        'SELECT id, username FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return result.rows[0];
    } catch (error) {
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

module.exports = protectedRoutes; 