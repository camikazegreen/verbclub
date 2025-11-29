const path = require('path');
const fs = require('fs');
const initDatabase = require('./config/init-db');
const db = require('./config/db');

const fastify = require('fastify')({ 
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    }
});

// Initialize database before starting the server
const start = async () => {
    try {
        // Initialize database
        await initDatabase();
        
        // Register plugins
        fastify.register(require('@fastify/cors'));
        fastify.register(require('./plugins/auth'));

        // Decorate fastify instance with db
        fastify.decorate('db', db);

        // Register routes
        fastify.register(require('./routes/auth'), { prefix: '/auth' });
        fastify.register(require('./routes/oauth'), { prefix: '/auth' });
        fastify.register(require('./routes/protected'), { prefix: '/api' });
        fastify.register(require('./routes/areas'), { prefix: '/api/areas' });
        fastify.register(require('./routes/people'), { prefix: '/api/people' });

        // Public route
        fastify.get('/', async (request, reply) => {
            return { message: 'Hello from Verb Club API' };
        });

        // Print all registered routes
        fastify.ready(err => {
            if (err) throw err;
            console.log(fastify.printRoutes());
        });

        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        console.log(`API server running on port ${process.env.PORT || 3000}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start(); 