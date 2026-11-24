BEGIN;

CREATE TABLE IF NOT EXISTS topics (
    slug text PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    sort_order integer NOT NULL DEFAULT 0,
    parent_slug text
);

CREATE INDEX IF NOT EXISTS topics_parent_order
    ON topics (parent_slug, sort_order, title);

CREATE TABLE IF NOT EXISTS articles (
    slug text PRIMARY KEY,
    title text NOT NULL,
    summary text NOT NULL DEFAULT '',
    topic_slug text NOT NULL,
    body jsonb NOT NULL,
    body_text text NOT NULL,
    published boolean NOT NULL DEFAULT false,
    updated timestamptz NOT NULL,
    search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', summary), 'B') ||
        setweight(to_tsvector('english', body_text), 'C')
    ) STORED
);

CREATE INDEX IF NOT EXISTS article_search
    ON articles USING gin (search_document) WHERE published;

CREATE INDEX IF NOT EXISTS articles_published_topic_title
    ON articles (topic_slug, title) WHERE published;

CREATE INDEX IF NOT EXISTS articles_published_updated
    ON articles (updated DESC) WHERE published;

COMMIT;
