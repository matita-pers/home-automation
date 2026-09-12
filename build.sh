#!/usr/bin/env bash

set -efuo pipefail

cd "$(dirname -- "$0")"

# Script to minimize the frontend with adding the hash
# and to crate/migrate the db

# minimize the frontend
mkdir public
cp static/* public/

# create/migrate the db
python3 -m webserver.db
