const bcrypt = require('bcrypt');

async function authRoutes(fastify, options) {
  // Register route
  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body;
    
    try {
      // Check if user exists using Prisma
      const existingUser = await fastify.prisma.user.findUnique({
        where: { username }
      });

      if (existingUser) {
        return reply.code(400).send({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user using Prisma
      const user = await fastify.prisma.user.create({
        data: {
          username,
          password: hashedPassword
        },
        select: {
          id: true,
          username: true
        }
      });

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
      // Find user using Prisma
      const user = await fastify.prisma.user.findUnique({
        where: { username }
      });

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