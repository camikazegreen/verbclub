const bcrypt = require('bcrypt');

// Helper: Normalize phone number
function normalizePhoneNumber(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Helper: Link person records to user (merge on registration)
async function linkPersonToUser(db, phoneNumber, userId, defaultName) {
  if (!phoneNumber) {
    // No phone provided, create new person record
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Find all unlinked people with this phone
  const peopleRecordsResult = await db.query(
    'SELECT id, name FROM people WHERE phone_number = $1 AND user_id IS NULL ORDER BY created_at ASC',
    [normalizedPhone]
  );
  const peopleRecords = peopleRecordsResult.rows;

  if (peopleRecords.length === 0) {
    // No existing records, create new one linked to user
    const result = await db.query(
      'INSERT INTO people (name, phone_number, user_id) VALUES ($1, $2, $3) RETURNING id',
      [defaultName, normalizedPhone, userId]
    );
    return result.rows[0].id;
  }

  if (peopleRecords.length === 1) {
    // Simple case: just link it
    await db.query(
      'UPDATE people SET user_id = $1 WHERE id = $2',
      [userId, peopleRecords[0].id]
    );
    return peopleRecords[0].id;
  }

  // Multiple records: merge them
  const primaryId = peopleRecords[0].id; // oldest
  const otherIds = peopleRecords.slice(1).map(p => p.id);

  // Note: We'll handle verb_participants updates when we add Verbs
  // For now, just update the primary and delete others

  // Link primary to user
  await db.query(
    'UPDATE people SET user_id = $1 WHERE id = $2',
    [userId, primaryId]
  );

  // Delete merged records (they'll be merged into primary when we add Verbs)
  await db.query(
    'DELETE FROM people WHERE id = ANY($1)',
    [otherIds]
  );

  return primaryId;
}

async function authRoutes(fastify, options) {
  // Register route
  fastify.post('/register', async (request, reply) => {
    const { username, password, phone_number } = request.body;
    
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

      // Link person record if phone number provided
      if (phone_number) {
        await linkPersonToUser(fastify.db, phone_number, user.id, username);
      } else {
        // Create person record with username as name (user can update later)
        await fastify.db.query(
          'INSERT INTO people (name, user_id) VALUES ($1, $2)',
          [username, user.id]
        );
      }

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

  // Login route (username/password only - OAuth users use OAuth routes)
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

      // Check if user has a password (OAuth-only users won't have one)
      if (!user.password) {
        return reply.code(401).send({ 
          error: 'This account uses OAuth login. Please sign in with your OAuth provider.' 
        });
      }

      if (!password) {
        return reply.code(401).send({ error: 'Password is required' });
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