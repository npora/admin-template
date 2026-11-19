#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
  echo 'Usage: sh database/mysql/init.sh --user USER --password DATABASE' >&2
  exit 2
fi

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

# Assemble before connecting so a missing migration cannot leave a partially initialized database.
batch_file=$(mktemp)
trap 'rm -f "$batch_file"' EXIT
for migration in 01-schema.sql 02-seed.sql 03-dictionaries.sql 04-query-indexes.sql \
  06-sort-indexes.sql 07-recent-users-index.sql; do
  cat "$script_dir/$migration" >> "$batch_file"
  printf '\n' >> "$batch_file"
done

mysql "$@" --skip-force < "$batch_file"
