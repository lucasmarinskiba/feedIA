#!/bin/sh
# Siembra única del volumen persistente (/app/data) desde el seed versionado (/app/data-seed).
# La primera vez copia los archivos que falten y deja un marcador; en los arranques siguientes no toca
# nada, así no se restauran archivos que la app borró a propósito. Subir la versión del marcador
# vuelve a sembrar archivos nuevos sin pisar los existentes.
set -e

MARCA=/app/data/.seed-v1

mkdir -p /app/data

if [ ! -e "$MARCA" ] && [ -d /app/data-seed ]; then
  (cd /app/data-seed && find . -type f) | while IFS= read -r archivo; do
    destino="/app/data/$archivo"
    if [ ! -e "$destino" ]; then
      mkdir -p "$(dirname "$destino")"
      cp "/app/data-seed/$archivo" "$destino"
    fi
  done
  touch "$MARCA"
fi

exec "$@"
