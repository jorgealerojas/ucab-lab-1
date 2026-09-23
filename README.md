# Laboratorio UCAB: sistema distribuido mínimo

Repositorio listo para los laboratorios 1A y 1B de Computación en la Nube. El sistema tiene dos procesos web, un proxy/balanceador NGINX y un servicio de estado deliberadamente no replicado.

## Documentos del curso

- [Guía actualizada del estudiante en PDF](docs/UCAB_Laboratorios_Unidad_1_Sistemas_Distribuidos_Actualizado.pdf)
- [Guía actualizada del estudiante en Word](docs/UCAB_Laboratorios_Unidad_1_Sistemas_Distribuidos_Actualizado.docx)

```text
cliente :8080 -> nginx -> web1 :3000 -> state :4000
                       -> web2 :3000 -> state :4000
```

## Requisitos

- Ubuntu 22.04 recomendado. Ubuntu 20.04 sirve solamente si Docker y Compose ya están provisionados y validados.
- Docker Engine en ejecución.
- Docker Compose V2 (`docker compose`) recomendado. También se admite Compose V1 1.27 o posterior (`docker-compose`).
- `curl` y puerto TCP 8080 disponible.
- Acceso para descargar `node:24-bookworm-slim` y `nginx:1.28-alpine`, o imágenes precargadas por el docente.

No es necesario instalar Node.js en el host.

## Inicio rápido

```bash
cd ucab-distributed-lab
./scripts/preflight.sh
docker compose config
docker compose up --build -d
docker compose ps
./scripts/smoke-test.sh
```

Si el equipo solo tiene Compose V1, sustituya `docker compose` por `docker-compose` en todos los comandos.

## Pruebas unitarias

Las pruebas se ejecutan dentro de la misma imagen usada por el laboratorio:

```bash
docker compose run --rm --no-deps web1 npm test
```

Resultado esperado: tres pruebas aprobadas.

## Semana 1: identidad, balanceo, latencia y fallo parcial

Identidad y balanceo:

```bash
for i in $(seq 1 10); do curl -s http://localhost:8080/; echo; done
docker compose logs --tail=20 nginx web1 web2
```

El JSON identifica el nodo y el PID. El log de NGINX añade `request_id`, upstream, estado y tiempos. Los headers también pueden observarse con `curl -i`.

Latencia artificial solo en `web1`:

```bash
docker compose -f docker-compose.yml -f compose.delay.yaml up -d --force-recreate web1
for i in $(seq 1 4); do time curl -s http://localhost:8080/; echo; done
docker compose up -d --force-recreate web1
```

Fallo parcial:

```bash
docker compose stop web1
for i in $(seq 1 10); do curl -sS --max-time 4 http://localhost:8080/; echo; done
docker compose start web1
```

NGINX realiza detección pasiva: descubre el fallo al intentar enviar tráfico, no consultando `/health` de forma activa.

## Semana 2: estado local, compartido y disponibilidad

Estado local por proceso:

```bash
for i in $(seq 1 8); do curl -s -X POST http://localhost:8080/counter/local; echo; done
for i in $(seq 1 6); do curl -s http://localhost:8080/counter/local; echo; done
```

Estado compartido:

```bash
for i in $(seq 1 8); do curl -s -X POST http://localhost:8080/counter/shared; echo; done
for i in $(seq 1 6); do curl -s http://localhost:8080/counter/shared; echo; done
```

Redundancia de la capa web:

```bash
docker compose stop web1
for i in $(seq 1 8); do curl -sS --max-time 4 http://localhost:8080/counter/shared; echo; done
docker compose start web1
```

Punto único de fallo del estado:

```bash
docker compose stop state
curl -i --max-time 4 http://localhost:8080/counter/shared
curl -i --max-time 4 -X POST http://localhost:8080/counter/shared
docker compose start state
```

El contador vive en RAM: reiniciar o recrear `state` lo devuelve a cero. Esto es intencional y permite distinguir estado compartido de persistencia y replicación.

## Limpieza

```bash
docker compose down
```

## Problemas comunes

- `502` justo al arrancar: espere unos segundos y revise `docker compose ps` y `docker compose logs`.
- `503` en el contador compartido: revise `docker compose ps state` y `docker compose logs state`.
- Cambio de `nginx.conf` no aplicado: ejecute `docker compose restart nginx`.
- Puerto ocupado: identifique el proceso con `ss -ltnp | grep ':8080'` o cambie el puerto publicado a `8081:80`.
- Permisos de Docker: aplique la política del laboratorio; no agregue usuarios al grupo `docker` sin autorización administrativa.
