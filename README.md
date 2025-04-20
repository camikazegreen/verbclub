# Verb Club

A full-stack application for planning activities with your friends.

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
   - Container name: verbclub-frontend
   - Port: 8080
   - Framework: Express (serving static files)

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

The frontend is a simple Express server serving static files. To modify the frontend:
1. Edit files in `apps/web/public`
2. Changes will be reflected immediately due to volume mounting

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