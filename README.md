# Verb Club

A platform for connecting people with activities and places.

## 🏗️ Project Structure

```
verb-club/
├── apps/
│   ├── api/          # Fastify API server
│   └── web/          # React frontend
├── scripts/          # Database import/export scripts
└── docker-compose.yml
```

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL client (optional, for direct DB access)

### Environment Variables
Create a `.env` file in the root directory:
```env
# Database
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=verbclub

# API
PORT=3000
JWT_SECRET=your_jwt_secret
```

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd apps/web
npm install
```

3. Install API dependencies:
```bash
cd apps/api
npm install
```

## 🏃‍♂️ Running the Application

### Development Mode (Recommended)

1. Start the frontend development server:
```bash
cd apps/web
npm run dev
```
The frontend will be available at http://localhost:5173

2. In a separate terminal, start the API and database:
```bash
docker-compose up api db
```
The API will be available at http://localhost:3000

### Production Mode

To run everything in Docker containers:
```bash
docker-compose up
```

## 🔧 Available Scripts

From the root directory:

- `npm run dev:frontend` - Start frontend development server
- `npm run dev:api` - Start API and database in Docker
- `npm run dev` - Start both frontend and API (requires concurrently)
- `npm run start` - Start all services in Docker
- `npm run build` - Build all Docker containers
- `npm run down` - Stop all Docker containers

## 🗄️ Database

The application uses PostgreSQL with PostGIS extension. The database runs in a Docker container and persists data in a Docker volume.

To import sample data:
```bash
docker-compose run import
```

## 🛠️ Technology Stack

- **Frontend**: React + Vite
- **API**: Fastify
- **Database**: PostgreSQL + PostGIS
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Docker and Docker Compose
- pgAdmin (optional, for database management)

## Project Structure

```
verb-club/
├── apps/
│   ├── api/          # Backend API server
│   └── web/          # Frontend application
├── docker-compose.yml # Docker configuration for all services
├── .env.example      # Example environment variables
└── README.md
```

## Initial Setup

1. **Copy the environment file**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file**
   - Open `.env` in your text editor
   - Replace the placeholder values with your desired configuration
   - Make sure to use a strong, unique JWT_SECRET
   - The database credentials will be used by both the database and API services

## Services

The application consists of three services:

1. **Database (PostgreSQL/PostGIS)**
   - Container name: verbclub-db
   - Port: 5432
   - Credentials: Configured in `.env` file

2. **API Server**
   - Container name: verbclub-api
   - Port: 3000
   - Framework: Fastify
   - Environment variables: Configured in `.env` file

3. **Frontend**
   - Runs on Vite dev server in development (http://localhost:5173)
   - In production, can be built and served as static files (optionally with Express or Nginx)

## Quick Start

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your desired configuration
   ```

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

3. **Access the services**
   - Frontend: http://localhost:8080
   - API: http://localhost:3000
   - Database: localhost:5432

## Database Management

### Using pgAdmin

1. Connect to the database using credentials from your `.env` file:
   - Host: localhost
   - Port: 5432
   - Database: [from POSTGRES_DB in .env]
   - Username: [from POSTGRES_USER in .env]
   - Password: [from POSTGRES_PASSWORD in .env]

2. To view data, open the Query Tool and run:
   ```sql
   -- View all tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';

   -- View data in a specific table
   SELECT * FROM users;
   ```

## Development

### Database Schema

The database schema is defined in `apps/api/db/schema.sql`. When the API starts, it automatically:
1. Connects to the database
2. Creates any missing tables
3. Sets up the initial schema

To add new tables:
1. Add the CREATE TABLE statement to `schema.sql`
2. Restart the containers: `docker-compose down && docker-compose up --build`

### API Development

The API uses:
- Fastify for the web framework
- PostgreSQL for the database
- JWT for authentication

### Frontend Development

The frontend is a React app built with Vite. To modify the frontend:
1. Edit files in `apps/web/src`
2. Changes will be reflected immediately when running `npm run dev`

## Troubleshooting

1. **Database Issues**
   - Check if the database container is running: `docker ps`
   - View database logs: `docker logs verbclub-db`
   - Connect with pgAdmin to verify credentials

2. **API Issues**
   - Check API logs: `docker logs verbclub-api`
   - Verify environment variables in .env file
   - Ensure database is accessible

3. **Frontend Issues**
   - Check frontend logs: `docker logs verbclub-frontend`
   - Verify API connectivity
   - Check browser console for errors 

## Available Scripts

The API service includes several utility scripts in the `apps/api/scripts` directory:

### Export Scripts

1. **Export Areas to GeoJSON**
   ```bash
   docker-compose exec api node scripts/export.js
   ```
   This script exports all climbing areas to a GeoJSON file at `apps/api/scripts/areas.geojson`.
   The output includes:
   - Area geometry
   - Area metadata (id, name, parent_id)
   - Hierarchy level information

2. **Generate Map Tiles**
   ```bash
   docker-compose exec api sh scripts/generate-tiles.sh
   ```
   This script generates vector tiles from the GeoJSON data using tippecanoe.
   The tiles are saved to `apps/api/public/tiles/climbing.mbtiles` and include:
   - Area boundaries
   - Area properties (id, name, parent, level)
   - Zoom levels from 4 to 14

The generated tiles can be used with any map library that supports vector tiles (e.g., Mapbox GL JS, Leaflet with vector tile plugin). 