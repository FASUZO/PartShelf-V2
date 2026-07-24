#!/bin/sh
set -e

: "${APP_HOST:=0.0.0.0}"
: "${APP_PORT:=8000}"

mkdir -p /app/data /app/db

exec uvicorn app.main:app --host "$APP_HOST" --port "$APP_PORT"
