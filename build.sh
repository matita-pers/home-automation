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

exit 0
#ai-code:
# Install build tools
npm install --no-save \
    esbuild \
    lightningcss-cli \
    html-minifier-terser

# Use binaries installed by npm
ESBUILD="./node_modules/.bin/esbuild"
LIGHTNINGCSS="./node_modules/.bin/lightningcss"
HTML_MINIFIER="./node_modules/.bin/html-minifier-terser"

# Clean output directory
rm -rf "$DIST"
mkdir -p "$DIST"

# Copy static assets
# Copy everything except files that we compile/minify
find "$SRC" -type f \
    ! -name '*.html' \
    ! -name '*.css' \
    ! -name '*.js' \
    -exec cp --parents '{}' "$DIST" \;

# Minify JavaScript
find "$SRC" -type f -name '*.js' | while read -r file; do
    relative="${file#"$SRC"/}"
    output="$DIST/$relative"

    mkdir -p "$(dirname "$output")"

    "$ESBUILD" "$file" \
        --minify \
        --outfile="$output"
done

# Minify CSS
find "$SRC" -type f -name '*.css' | while read -r file; do
    relative="${file#"$SRC"/}"
    output="$DIST/$relative"

    mkdir -p "$(dirname "$output")"

    "$LIGHTNINGCSS" \
        --minify \
        --bundle \
        "$file" \
        -o "$output"
done

# Minify HTML
find "$SRC" -type f -name '*.html' | while read -r file; do
    relative="${file#"$SRC"/}"
    output="$DIST/$relative"

    mkdir -p "$(dirname "$output")"

    "$HTML_MINIFIER" \
        --collapse-whitespace \
        --remove-comments \
        --remove-redundant-attributes \
        --remove-empty-attributes \
        --remove-optional-tags \
        --minify-css true \
        --minify-js true \
        "$file" \
        -o "$output"
done
