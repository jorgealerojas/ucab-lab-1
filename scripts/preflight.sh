#!/usr/bin/env sh
set -eu

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker no esta instalado." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl no esta instalado." >&2; exit 1; }

docker --version
if docker compose version >/dev/null 2>&1; then
  docker compose version
  compose='docker compose'
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose --version
  compose='docker-compose'
else
  echo "ERROR: no se encontro Docker Compose." >&2
  exit 1
fi

docker info >/dev/null 2>&1 || { echo "ERROR: el daemon no responde o el usuario no tiene permisos." >&2; exit 1; }
if command -v ss >/dev/null 2>&1 && ss -ltn | grep -q ':8080 '; then
  echo "ERROR: el puerto 8080 ya esta en uso." >&2
  exit 1
fi

$compose config >/dev/null
echo "OK: preflight completado con $compose"
