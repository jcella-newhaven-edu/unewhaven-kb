BEGIN;

CREATE TABLE IF NOT EXISTS article_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')),
    content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 5242880),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS articles_published_image_paths
    ON articles USING gin (body) WHERE published;

COMMIT;
