#!/usr/bin/env sh
set -eu

base_url=${BASE_URL:-http://localhost:8080}
attempt=0
while [ "$attempt" -lt 30 ]; do
  if curl -fsS "$base_url/health" >/dev/null 2>&1; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

curl -fsS "$base_url/health" >/dev/null
nodes=''
i=0
while [ "$i" -lt 10 ]; do
  body=$(curl -fsS "$base_url/")
  echo "$body"
  nodes="$nodes $body"
  i=$((i + 1))
done

echo "$nodes" | grep -q '"node":"web1"'
echo "$nodes" | grep -q '"node":"web2"'
curl -fsS -X POST "$base_url/counter/shared" | grep -q '"counter":1'
curl -fsS "$base_url/counter/shared" | grep -q '"counter":1'
echo "OK: balanceo y estado compartido verificados"
