#!/usr/bin/env bash

#Script to clean testing docker containers

set -eufo pipefail

COMPOSE_FILE="docker-compose-dev.yml"
DB_DATA_DIR="./.db-data"
DEV_DATA_SQL="./db/dev-data.sql"

PROFILE="dev"
STEP=0

# The number indicates which steps to skip
# the string is the profile name
for arg in "$@"; do
    if [[ "$arg" =~ ^[0-2]$ ]]; then
        STEP="$arg"
    else
        PROFILE="$arg"
    fi
done

echo "docker profile: $PROFILE"
echo "Steps to skip:    $STEP"

if [[ "$STEP" -lt 0 || "$STEP" -gt 2 ]]; then
    echo "Invalid step: $STEP"
    echo "Usage: $0 [profile] [step]"
    exit 1
fi

# Stop containers and remove locally built images.
echo "Stopping $PROFILE environment..."
docker compose -f "$COMPOSE_FILE" \
    --profile "$PROFILE" down -v --rmi local --remove-orphans

if [[ "$STEP" -eq 2 ]]; then
    echo "Skipping database cleanup and seeding."
    exit 0
fi

# Remove the database data.
echo "Removing database data..."
rm -rf "$DB_DATA_DIR"

if [[ "$STEP" -eq 1 ]]; then
    echo "Skipping database seeding."
    exit 0
fi

# Start pg & the site to run the db scripts
echo "Starting database container to seed..."
docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d --wait

# Seed the database
echo "Seeding database..."
docker compose -f "$COMPOSE_FILE" exec -T db psql -U user -d dev < "$DEV_DATA_SQL"

echo "Done."
