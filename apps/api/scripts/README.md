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