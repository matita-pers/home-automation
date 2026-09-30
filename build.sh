#!/usr/bin/env bash

set -efuo pipefail

cd "$(dirname -- "$0")"
echo cwd: '>'"$(pwd)"'<'

if [ -f public/.build ]; then
  echo Arleady built!
  if [ $# -gt 0 ]; then
    echo Executing '>'"$*"'<'...
   exec "$@"
  fi
  echo Exiting...
  exit 0
fi

# Script to minimize the frontend with adding the hash
# and to crate/migrate the db

# minimize the frontend
mkdir -p public
set +f; # re-enable globbing
cp -r static/* public/
set -f

# create/migrate the db
python3 -m webserver.db

# ensure an admin user is present
echo Making sure there is an admin account...
python3 -m webserver.db "SELECT username FROM auth.user WHERE admin = true" 0 || \
  {
    echo ret: '>'$?'<'';' No admin found, creating;
    python3 -m webserver.db "INSERT INTO auth.user (username, password_hash, admin) \
      VALUES ('admin', 'adminPassword.1', true) RETURNING id"
  }

touch public/.build

if [ $# -gt 0 ]; then
  echo Executing '>'"$*"'<'...
  exec "$@"
fi
