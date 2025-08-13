#!/bin/bash

# Restore advanced seed data to database
# This script uses the constraint-aware seed data

echo "Restoring advanced seed data to database..."

# Check if seed data exists
if [ ! -f "seed_data/advanced_seed.sql" ]; then
    echo "Error: seed_data/advanced_seed.sql not found!"
    echo "Run python3 create_seed_data_advanced.py first to create seed data."
    exit 1
fi

# Confirm with user
read -p "This will DELETE ALL current data in cuebe_db. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo "Stopping backend container to ensure no active connections..."
docker-compose stop backend

echo "Restoring advanced seed data..."
docker exec cuebe-db psql -U alex -d cuebe_db -f /dev/stdin < seed_data/advanced_seed.sql

if [ $? -eq 0 ]; then
    echo "Advanced seed data restored successfully!"
else
    echo "Error restoring seed data!"
    exit 1
fi

echo "Starting backend container..."
docker-compose start backend

echo "Database restoration complete!"
echo ""
echo "Your database has been reset to the seed data state using constraint-aware restoration."