#!/bin/bash

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Create output directory if it doesn't exist
mkdir -p ../public/tiles

# Generate tiles using tippecanoe
tippecanoe \
  -o ../public/tiles/climbing.mbtiles \
  --force \
  --layer=climbing_areas \
  --generate-ids \
  --include=id \
  --include=name \
  --include=parent \
  --include=level \
  --minimum-zoom=4 \
  --maximum-zoom=14 \
  areas.geojson

echo "Tile generation complete. Output saved to ../public/tiles/climbing.mbtiles" 