CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Areas table for hierarchical geographic regions
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES areas(id) ON DELETE CASCADE,

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