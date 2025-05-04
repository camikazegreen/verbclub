const bcrypt = require('bcrypt');

async function authRoutes(fastify, options) {
  // Register route
  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body;
    
    try {
      // Check if user exists
      const existingUser = await fastify.db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(400).send({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await fastify.db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );

      const user = result.rows[0];
      const token = fastify.jwt.sign({ userId: user.id });
      return { token };
    } catch (error) {
      console.error('Registration error:', error);
      reply.code(500).send({ 
        error: 'Internal server error',
        details: error.message 
      });
    }
  });

  // Login route
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;

    try {
      // Find user
      const result = await fastify.db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      const user = result.rows[0];

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ userId: user.id });
      return { token };
    } catch (error) {
      console.error('Login error:', error);
      reply.code(500).send({ 
        error: 'Internal server error',
        details: error.message 
      });
    }
  });
}

module.exports = authRoutes; 