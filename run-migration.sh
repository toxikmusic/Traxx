#!/bin/bash

echo "Running database migration for Traxx..."

# Use the DATABASE_URL environment variable
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  exit 1
fi

# Run the SQL migration file
echo "Applying initial migration..."
psql "$DATABASE_URL" -f migrations/initial-migration.sql

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully."
else
  echo "Migration failed. Please check the error message above."
  exit 1
fi

echo "Database setup complete!"