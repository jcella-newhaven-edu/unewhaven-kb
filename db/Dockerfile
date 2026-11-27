# syntax=docker/dockerfile:1
FROM postgres:19-bookworm@sha256:4c736732289da844c2ab892451adc1a6e376e7d0ac54ca9571a2e1cfd14176a1

ARG POSTGRES_SEED_FILE=./db/dev-seed.sql
COPY --chmod=0644 db/schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY --chmod=0644 ["${POSTGRES_SEED_FILE}", "/docker-entrypoint-initdb.d/02-content.sql"]
COPY --chmod=0644 db/migrations/001-admin-auth.sql /docker-entrypoint-initdb.d/03-admin-auth.sql
COPY --chmod=0644 db/migrations/002-article-topics-metadata.sql /docker-entrypoint-initdb.d/04-article-topics-metadata.sql
COPY --chmod=0644 db/migrations/003-article-images.sql /docker-entrypoint-initdb.d/05-article-images.sql
COPY --chmod=0644 db/migrations/004-topic-icons.sql /docker-entrypoint-initdb.d/06-topic-icons.sql
