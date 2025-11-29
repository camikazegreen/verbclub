console.log('Loading OAuth routes...');

// Helper: Normalize phone number
function normalizePhoneNumber(phone) {
  if (!phone) return null;
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
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const peopleRecordsResult = await db.query(
    'SELECT id, name FROM people WHERE phone_number = $1 AND user_id IS NULL ORDER BY created_at ASC',
    [normalizedPhone]
  );
  const peopleRecords = peopleRecordsResult.rows;

  if (peopleRecords.length === 0) {
    const result = await db.query(
      'INSERT INTO people (name, phone_number, user_id) VALUES ($1, $2, $3) RETURNING id',
      [defaultName, normalizedPhone, userId]
    );
    return result.rows[0].id;
  }

  if (peopleRecords.length === 1) {
    await db.query(
      'UPDATE people SET user_id = $1 WHERE id = $2',
      [userId, peopleRecords[0].id]
    );
    return peopleRecords[0].id;
  }

  // Multiple records: merge them
  const primaryId = peopleRecords[0].id;
  const otherIds = peopleRecords.slice(1).map(p => p.id);

  await db.query(
    'UPDATE people SET user_id = $1 WHERE id = $2',
    [userId, primaryId]
  );

  await db.query(
    'DELETE FROM people WHERE id = ANY($1)',
    [otherIds]
  );

  return primaryId;
}

// Helper: Create or find user from OAuth provider
async function createOrFindOAuthUser(db, provider, providerUserId, email, name, phoneNumber) {
  // Check if OAuth account already exists
  const existingOAuth = await db.query(
    'SELECT user_id FROM oauth_providers WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerUserId]
  );

  if (existingOAuth.rows.length > 0) {
    // User already exists, return their user_id
    return existingOAuth.rows[0].user_id;
  }

  // Check if user exists by email (for account linking)
  let userId = null;
  if (email) {
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    }
  }

  // Create new user if doesn't exist
  if (!userId) {
    // Generate username from email or use provider + ID
    const username = email 
      ? email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5)
      : `${provider}_${providerUserId}`;

    // Ensure username is unique
    let uniqueUsername = username;
    let counter = 1;
    while (true) {
      const check = await db.query('SELECT id FROM users WHERE username = $1', [uniqueUsername]);
      if (check.rows.length === 0) break;
      uniqueUsername = `${username}_${counter}`;
      counter++;
    }

    const userResult = await db.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
      [uniqueUsername, email]
    );
    userId = userResult.rows[0].id;

    // Create person record
    if (phoneNumber) {
      await linkPersonToUser(db, phoneNumber, userId, name || uniqueUsername);
    } else {
      await db.query(
        'INSERT INTO people (name, user_id) VALUES ($1, $2)',
        [name || uniqueUsername, userId]
      );
    }
  }

  // Create OAuth provider record
  await db.query(
    'INSERT INTO oauth_providers (user_id, provider, provider_user_id, email) VALUES ($1, $2, $3, $4)',
    [userId, provider, providerUserId, email]
  );

  return userId;
}

module.exports = async function (fastify, options) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // ============================================
  // GOOGLE OAUTH
  // ============================================

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    fastify.register(require('@fastify/oauth2'), {
      name: 'googleOAuth2',
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET
        },
        auth: require('@fastify/oauth2').GOOGLE_CONFIGURATION
      },
      startRedirectPath: '/auth/google',
      callbackUri: `${baseUrl}/auth/google/callback`,
      scope: ['profile', 'email']
    });

    fastify.get('/google/callback', async function (request, reply) {
      const token = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.token.access_token}` }
      });
      const googleUser = await userResponse.json();

      // Create or find user
      const userId = await createOrFindOAuthUser(
        fastify.db,
        'google',
        googleUser.id,
        googleUser.email,
        googleUser.name,
        null // Google doesn't provide phone number
      );

      // Generate JWT token
      const jwtToken = fastify.jwt.sign({ userId });

      // Redirect to frontend with token
      reply.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);
    });
  }

  // ============================================
  // FACEBOOK OAUTH
  // ============================================

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    fastify.register(require('@fastify/oauth2'), {
      name: 'facebookOAuth2',
      credentials: {
        client: {
          id: process.env.FACEBOOK_CLIENT_ID,
          secret: process.env.FACEBOOK_CLIENT_SECRET
        },
        auth: require('@fastify/oauth2').FACEBOOK_CONFIGURATION
      },
      startRedirectPath: '/auth/facebook',
      callbackUri: `${baseUrl}/auth/facebook/callback`,
      scope: ['email', 'public_profile']
    });

    fastify.get('/facebook/callback', async function (request, reply) {
      const token = await this.facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      // Get user info from Facebook
      const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${token.token.access_token}`);
      const facebookUser = await userResponse.json();

      // Create or find user
      const userId = await createOrFindOAuthUser(
        fastify.db,
        'facebook',
        facebookUser.id,
        facebookUser.email,
        facebookUser.name,
        null // Facebook doesn't provide phone number in basic scope
      );

      // Generate JWT token
      const jwtToken = fastify.jwt.sign({ userId });

      // Redirect to frontend with token
      reply.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);
    });
  }

  // ============================================
  // APPLE OAUTH
  // ============================================

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    // Apple requires JWT-based client secret generation
    const jwt = require('jsonwebtoken');
    const fs = require('fs');

    // Generate Apple client secret (JWT) - must be regenerated for each request
    function generateAppleClientSecret() {
      const privateKey = process.env.APPLE_PRIVATE_KEY || 
        (process.env.APPLE_PRIVATE_KEY_PATH ? 
          fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8') : null);

      if (!privateKey) {
        throw new Error('Apple private key not configured');
      }

      const token = jwt.sign(
        {
          iss: process.env.APPLE_TEAM_ID,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
          aud: 'https://appleid.apple.com',
          sub: process.env.APPLE_CLIENT_ID
        },
        privateKey,
        {
          algorithm: 'ES256',
          keyid: process.env.APPLE_KEY_ID
        }
      );

      return token;
    }

    fastify.register(require('@fastify/oauth2'), {
      name: 'appleOAuth2',
      credentials: {
        client: {
          id: process.env.APPLE_CLIENT_ID,
          secret: generateAppleClientSecret() // Generated at startup (valid for 6 months)
        },
        auth: {
          authorizeHost: 'https://appleid.apple.com',
          authorizePath: '/auth/authorize',
          tokenHost: 'https://appleid.apple.com',
          tokenPath: '/auth/token'
        }
      },
      startRedirectPath: '/auth/apple',
      callbackUri: `${baseUrl}/auth/apple/callback`,
      scope: ['name', 'email']
    });

    fastify.get('/apple/callback', async function (request, reply) {
      const token = await this.appleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      // Decode Apple ID token to get user info
      const idToken = token.token.id_token;
      const decoded = jwt.decode(idToken);
      
      // Apple provides email in the token, name might be in initial request
      const email = decoded.email;
      const appleUserId = decoded.sub;
      const name = request.query.name || email?.split('@')[0] || 'Apple User';

      // Create or find user
      const userId = await createOrFindOAuthUser(
        fastify.db,
        'apple',
        appleUserId,
        email,
        name,
        null // Apple doesn't provide phone number
      );

      // Generate JWT token
      const jwtToken = fastify.jwt.sign({ userId });

      // Redirect to frontend with token
      reply.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);
    });
  }
};

