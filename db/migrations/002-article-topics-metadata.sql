BEGIN;

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_editor_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE IF NOT EXISTS article_topics (
    article_slug text NOT NULL REFERENCES articles(slug) ON UPDATE CASCADE ON DELETE CASCADE,
    topic_slug text NOT NULL,
    PRIMARY KEY (article_slug, topic_slug)
);

CREATE INDEX IF NOT EXISTS article_topics_by_topic ON article_topics (topic_slug, article_slug);

INSERT INTO article_topics (article_slug, topic_slug)
SELECT slug, topic_slug FROM articles
ON CONFLICT (article_slug, topic_slug) DO NOTHING;

-- Keep the primary assignment visible if an SQL import supplies only the article row.
CREATE OR REPLACE VIEW article_topic_memberships AS
SELECT slug AS article_slug, topic_slug FROM articles
UNION
SELECT article_slug, topic_slug FROM article_topics;

COMMIT;
