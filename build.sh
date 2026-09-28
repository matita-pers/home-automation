#!/usr/bin/env bash

set -efuo pipefail

cd "$(dirname -- "$0")"

if [ -f .build ]; then
  echo Arleady built!
  if [ $# -gt 0 ]; then
    echo Executing '>'"$@"'<'...
  fi
  echo Exiting...
  exit 0
fi

# Script to minimize the frontend with adding the hash
# and to crate/migrate the db

# minimize the frontend
mkdir public
cp -r static/ public/

# create/migrate the db
python3 -m webserver.db

touch .build

if [ $# -gt 0 ]; then
  echo Executing '>'"$@"'<'...
  exec "$@"
fi
