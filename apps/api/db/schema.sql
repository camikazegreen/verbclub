CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255), -- NULL for OAuth-only users
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth providers table for Google, Facebook, Apple
CREATE TABLE IF NOT EXISTS oauth_providers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'apple'
  provider_user_id VARCHAR(255) NOT NULL, -- OAuth provider's user ID
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider_user ON oauth_providers(provider, provider_user_id);

-- People table: identity that can exist without user account
-- Allows inviting people who haven't registered yet
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT, -- NULL for users who register without phone (can be added later)
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL until registered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for phone lookup (not unique - multiple records allowed before registration)
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone_number);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id) WHERE user_id IS NOT NULL;

-- People connections (friends/connections)
-- Bidirectional: if A connects to B, query both directions
CREATE TABLE IF NOT EXISTS people_connections (
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  connected_person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  initiated_by_person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE, -- Who initiated the connection
  status TEXT NOT NULL DEFAULT 'connected', -- 'pending', 'connected' (for future: pending requests)
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (person_id, connected_person_id),
  CHECK (person_id != connected_person_id) -- Can't connect to yourself
);

CREATE INDEX IF NOT EXISTS idx_people_connections_person ON people_connections(person_id);
CREATE INDEX IF NOT EXISTS idx_people_connections_connected ON people_connections(connected_person_id);

-- People blocks
-- Unidirectional: person_id blocks blocked_person_id
CREATE TABLE IF NOT EXISTS people_blocks (
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  blocked_person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (person_id, blocked_person_id),
  CHECK (person_id != blocked_person_id) -- Can't block yourself
);

CREATE INDEX IF NOT EXISTS idx_people_blocks_person ON people_blocks(person_id);
CREATE INDEX IF NOT EXISTS idx_people_blocks_blocked ON people_blocks(blocked_person_id);

-- Areas table for hierarchical geographic regions
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
  breadcrumb TEXT[], -- Array of IDs from root to current area

  -- Center point (OpenBeta)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Optional full polygon for boundaries
  geometry GEOMETRY(POLYGON, 4326),
  centroid GEOMETRY(POINT, 4326),
  bbox GEOMETRY(POLYGON, 4326),

  -- Hierarchical metadata
  leaf BOOLEAN,
  metadata JSONB
);

-- Spatial indices for areas
CREATE INDEX IF NOT EXISTS idx_areas_geom ON areas USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_areas_bbox ON areas USING GIST (bbox);

-- Routes table for climbing routes
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  grade TEXT,
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,

  -- Location from OpenBeta metadata
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Point geometry (generated or enriched)
  geometry GEOMETRY(POINT, 4326),

  -- Route types
  type_sport BOOLEAN,
  type_trad BOOLEAN,
  type_toprope BOOLEAN,

  metadata JSONB
);

-- Spatial index for map interactions
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST (geometry); 