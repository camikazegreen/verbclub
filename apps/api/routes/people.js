console.log('Loading people route...');

// Helper: Get person_id for a user_id
async function getPersonIdForUser(db, userId) {
  const result = await db.query(
    'SELECT id FROM people WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Helper: Normalize phone number (basic normalization - can be enhanced)
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // If starts with 1 and has 11 digits, assume US number
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }
  // If 10 digits, assume US number without country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Otherwise, add + if not present
  return phone.startsWith('+') ? phone : `+${digits}`;
}

module.exports = async function (fastify, opts) {
  // ============================================
  // PEOPLE ROUTES
  // ============================================

  // GET /api/people/me - Get current user's person record
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      
      // Get person record for this user
      const result = await fastify.db.query(
        `SELECT id, name, phone_number, user_id, created_at, updated_at 
         FROM people 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      return result.rows[0];
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/people - Create a new person (for inviting non-users)
  // Can be called by authenticated users to create person records for invites
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { name, phone_number } = request.body;

      if (!name || !phone_number) {
        return reply.code(400).send({ error: 'Name and phone_number are required' });
      }

      const normalizedPhone = normalizePhoneNumber(phone_number);

      // Create person record (user_id will be NULL until they register)
      const result = await fastify.db.query(
        `INSERT INTO people (name, phone_number) 
         VALUES ($1, $2) 
         RETURNING id, name, phone_number, user_id, created_at, updated_at`,
        [name, normalizedPhone]
      );

      return reply.code(201).send(result.rows[0]);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // PATCH /api/people/me - Update own person record
  fastify.patch('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const { name, phone_number } = request.body;

      // Get person record for this user
      const personResult = await fastify.db.query(
        'SELECT id FROM people WHERE user_id = $1',
        [userId]
      );

      if (personResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      const personId = personResult.rows[0].id;

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }

      if (phone_number !== undefined) {
        updates.push(`phone_number = $${paramIndex++}`);
        values.push(normalizePhoneNumber(phone_number));
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(personId);

      const result = await fastify.db.query(
        `UPDATE people 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING id, name, phone_number, user_id, created_at, updated_at`,
        values
      );

      return result.rows[0];
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/people/:id - Get a specific person
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const personId = parseInt(request.params.id);
      const userId = request.user.userId;

      const result = await fastify.db.query(
        `SELECT id, name, phone_number, user_id, created_at, updated_at 
         FROM people 
         WHERE id = $1`,
        [personId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Person not found' });
      }

      const person = result.rows[0];

      // Check if current user is blocked by this person
      const blockCheck = await fastify.db.query(
        'SELECT 1 FROM people_blocks WHERE person_id = $1 AND blocked_person_id = $2',
        [personId, userId]
      );

      if (blockCheck.rows.length > 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      return person;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // CONNECTIONS ROUTES
  // ============================================

  // GET /api/people/me/connections - Get all connections for current user
  fastify.get('/me/connections', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const personId = await getPersonIdForUser(fastify.db, userId);

      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      // Get all connections (bidirectional - both directions)
      const result = await fastify.db.query(
        `SELECT 
          p.id, 
          p.name, 
          p.phone_number, 
          p.user_id,
          pc.connected_at,
          pc.initiated_by_person_id,
          pc.status
         FROM people_connections pc
         JOIN people p ON (
           CASE 
             WHEN pc.person_id = $1 THEN pc.connected_person_id
             ELSE pc.person_id
           END = p.id
         )
         WHERE (pc.person_id = $1 OR pc.connected_person_id = $1)
         AND pc.status = 'connected'
         ORDER BY pc.connected_at DESC`,
        [personId]
      );

      return result.rows;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/people/me/connections - Create a connection (add friend)
  fastify.post('/me/connections', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const { person_id } = request.body;

      if (!person_id) {
        return reply.code(400).send({ error: 'person_id is required' });
      }

      const personId = await getPersonIdForUser(fastify.db, userId);
      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      const targetPersonId = parseInt(person_id);

      // Can't connect to yourself
      if (personId === targetPersonId) {
        return reply.code(400).send({ error: 'Cannot connect to yourself' });
      }

      // Check if target person exists
      const targetCheck = await fastify.db.query(
        'SELECT id FROM people WHERE id = $1',
        [targetPersonId]
      );

      if (targetCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Target person not found' });
      }

      // Check if already connected (either direction)
      const existingCheck = await fastify.db.query(
        `SELECT 1 FROM people_connections 
         WHERE (person_id = $1 AND connected_person_id = $2)
         OR (person_id = $2 AND connected_person_id = $1)`,
        [personId, targetPersonId]
      );

      if (existingCheck.rows.length > 0) {
        return reply.code(400).send({ error: 'Already connected' });
      }

      // Check if blocked
      const blockCheck = await fastify.db.query(
        `SELECT 1 FROM people_blocks 
         WHERE (person_id = $1 AND blocked_person_id = $2)
         OR (person_id = $2 AND blocked_person_id = $1)`,
        [personId, targetPersonId]
      );

      if (blockCheck.rows.length > 0) {
        return reply.code(403).send({ error: 'Cannot connect - blocked' });
      }

      // Create bidirectional connection (insert both directions for easier querying)
      await fastify.db.query(
        `INSERT INTO people_connections (person_id, connected_person_id, initiated_by_person_id, status)
         VALUES ($1, $2, $1, 'connected'),
                ($2, $1, $1, 'connected')`,
        [personId, targetPersonId]
      );

      return reply.code(201).send({ message: 'Connection created' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /api/people/me/connections/:personId - Remove a connection
  fastify.delete('/me/connections/:personId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const targetPersonId = parseInt(request.params.personId);

      const personId = await getPersonIdForUser(fastify.db, userId);
      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      // Delete both directions of the connection
      const result = await fastify.db.query(
        `DELETE FROM people_connections 
         WHERE (person_id = $1 AND connected_person_id = $2)
         OR (person_id = $2 AND connected_person_id = $1)`,
        [personId, targetPersonId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      return { message: 'Connection removed' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // BLOCKS ROUTES
  // ============================================

  // GET /api/people/me/blocks - Get all blocked people
  fastify.get('/me/blocks', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const personId = await getPersonIdForUser(fastify.db, userId);

      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      const result = await fastify.db.query(
        `SELECT 
          p.id, 
          p.name, 
          p.phone_number, 
          p.user_id,
          pb.blocked_at
         FROM people_blocks pb
         JOIN people p ON pb.blocked_person_id = p.id
         WHERE pb.person_id = $1
         ORDER BY pb.blocked_at DESC`,
        [personId]
      );

      return result.rows;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/people/me/blocks - Block a person
  fastify.post('/me/blocks', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const { person_id } = request.body;

      if (!person_id) {
        return reply.code(400).send({ error: 'person_id is required' });
      }

      const personId = await getPersonIdForUser(fastify.db, userId);
      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      const targetPersonId = parseInt(person_id);

      // Can't block yourself
      if (personId === targetPersonId) {
        return reply.code(400).send({ error: 'Cannot block yourself' });
      }

      // Check if target person exists
      const targetCheck = await fastify.db.query(
        'SELECT id FROM people WHERE id = $1',
        [targetPersonId]
      );

      if (targetCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Target person not found' });
      }

      // Check if already blocked
      const existingCheck = await fastify.db.query(
        'SELECT 1 FROM people_blocks WHERE person_id = $1 AND blocked_person_id = $2',
        [personId, targetPersonId]
      );

      if (existingCheck.rows.length > 0) {
        return reply.code(400).send({ error: 'Already blocked' });
      }

      // Remove any existing connections
      await fastify.db.query(
        `DELETE FROM people_connections 
         WHERE (person_id = $1 AND connected_person_id = $2)
         OR (person_id = $2 AND connected_person_id = $1)`,
        [personId, targetPersonId]
      );

      // Create block
      await fastify.db.query(
        `INSERT INTO people_blocks (person_id, blocked_person_id)
         VALUES ($1, $2)`,
        [personId, targetPersonId]
      );

      return reply.code(201).send({ message: 'Person blocked' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /api/people/me/blocks/:personId - Unblock a person
  fastify.delete('/me/blocks/:personId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const targetPersonId = parseInt(request.params.personId);

      const personId = await getPersonIdForUser(fastify.db, userId);
      if (!personId) {
        return reply.code(404).send({ error: 'Person record not found' });
      }

      const result = await fastify.db.query(
        `DELETE FROM people_blocks 
         WHERE person_id = $1 AND blocked_person_id = $2`,
        [personId, targetPersonId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Block not found' });
      }

      return { message: 'Person unblocked' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

