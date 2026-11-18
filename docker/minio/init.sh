#!/bin/sh
set -e

echo "Waiting for MinIO to become healthy..."
until curl -s -f http://minio:9000/minio/health/live > /dev/null 2>&1; do
  echo "MinIO is not ready yet, sleeping 2s..."
  sleep 2
done

echo "MinIO is ready! Configuring alias and creating bucket..."
mc alias set minio http://minio:9000 "${MINIO_ROOT_USER:-admin}" "${MINIO_ROOT_PASSWORD:-password123}"
mc mb --ignore-existing minio/"${MINIO_BUCKET:-warehouse}"
mc anonymous set public minio/"${MINIO_BUCKET:-warehouse}"

echo "✅ MinIO bucket '${MINIO_BUCKET:-warehouse}' configured successfully!"
exit 0

