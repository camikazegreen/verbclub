# Import and Export Scripts

## Import Script

This script imports climbing area and route data from the OpenBeta API into the local database.

### Running the Import

From the root directory of the project:

```bash
# Start the containers if they're not running
docker-compose up -d

# Run the import script
docker-compose exec api npm run import
```

The script will:
1. Connect to the database
2. Fetch area data from OpenBeta API
3. Import areas with their geometries and metadata
4. Import routes with their grades and types
5. Process sub-areas recursively

## Export Script

This script exports area data from the database into a GeoJSON file.

### Running the Export

From the root directory of the project:

```bash
# Start the containers if they're not running
docker-compose up -d

# Run the export script
docker-compose exec api npm run export
```

The script will:
1. Connect to the database
2. Fetch all areas with their parent relationships
3. Convert the areas to GeoJSON format
4. Write the GeoJSON data to a file named `areas.geojson` in the scripts directory

### Notes

- The script uses environment variables from the API container for database connection
- It includes a 1-second delay between API calls to avoid rate limiting
- Progress is logged to the console

## Demo Users Export/Import

These scripts allow you to export and import demo users and their relationships for testing purposes.

### Exporting Demo Users

To export all demo users (users with id > 1) and their relationships:

```bash
docker-compose exec api node scripts/export-demo-users.js
```

This will:
1. Export all users (excluding the main user, id=1)
2. Export all people records for demo users
3. Export all connections between demo users (and connections with the main user)
4. Export OAuth providers for demo users (if any)
5. Save to `backups/demo-users-{timestamp}.json` and `backups/demo-users-latest.json`

### Importing Demo Users

To import demo users from the latest export:

```bash
docker-compose exec api node scripts/import-demo-users.js
```

Or import from a specific file:

```bash
docker-compose exec api node scripts/import-demo-users.js demo-users-2025-11-29T19-44-12-183Z.json
```

This will:
1. Clear all existing demo users (id > 1) and their related data
2. Import users (with new auto-generated IDs)
3. Import people records (mapped to new user IDs)
4. Import connections (mapped to new person IDs, preserving connections with main user)
5. Import OAuth providers (if any)

**Note:** The import script uses transactions, so if anything fails, all changes are rolled back. User IDs will be remapped automatically, but connections with the main user (id=1) are preserved. 