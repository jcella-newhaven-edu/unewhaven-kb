BEGIN;

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS review_due_on date;

CREATE TABLE IF NOT EXISTS article_slug_redirects (
    old_slug text PRIMARY KEY,
    article_slug text NOT NULL REFERENCES articles(slug) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS article_slug_redirects_by_article
    ON article_slug_redirects (article_slug);

CREATE TABLE IF NOT EXISTS article_working_drafts (
    article_slug text PRIMARY KEY REFERENCES articles(slug) ON UPDATE CASCADE ON DELETE CASCADE,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    topic_slug text NOT NULL,
    topic_slugs text[] NOT NULL,
    body jsonb NOT NULL,
    body_text text NOT NULL,
    updated timestamptz NOT NULL,
    last_editor_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS article_revisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_slug text NOT NULL REFERENCES articles(slug) ON UPDATE CASCADE ON DELETE CASCADE,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    topic_slug text NOT NULL,
    topic_slugs text[] NOT NULL,
    body jsonb NOT NULL,
    body_text text NOT NULL,
    published boolean NOT NULL,
    kind text NOT NULL CHECK (kind IN ('baseline', 'draft', 'published', 'restored')),
    created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
    editor_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS article_revisions_history
    ON article_revisions (article_slug, created_at DESC, id DESC);

INSERT INTO article_revisions (
    article_slug, slug, title, summary, topic_slug, topic_slugs,
    body, body_text, published, kind, created_at, editor_id
)
SELECT a.slug, a.slug, a.title, a.summary, a.topic_slug,
       ARRAY(
           SELECT m.topic_slug
           FROM article_topic_memberships m
           WHERE m.article_slug = a.slug
           ORDER BY (m.topic_slug = a.topic_slug) DESC, m.topic_slug
       ),
       a.body, a.body_text, a.published, 'baseline', a.updated, a.last_editor_id
FROM articles a
WHERE NOT EXISTS (SELECT 1 FROM article_revisions r WHERE r.article_slug = a.slug);

-- Writers which lock topic or article rows take this after topic locks and
-- before article row locks. Triggers also cover ordinary SQL imports.
CREATE OR REPLACE FUNCTION lock_article_slug_namespace()
RETURNS void
LANGUAGE sql
AS $lock$
    SELECT pg_advisory_xact_lock(hashtextextended('unewhaven-kb:article-slugs', 0));
$lock$;

CREATE OR REPLACE FUNCTION guard_article_canonical_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
    alias_owner text;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.slug = OLD.slug THEN
            RETURN NEW;
        END IF;
    END IF;

    PERFORM lock_article_slug_namespace();
    SELECT article_slug INTO alias_owner FROM article_slug_redirects WHERE old_slug = NEW.slug;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF alias_owner = OLD.slug THEN
            DELETE FROM article_slug_redirects WHERE old_slug = NEW.slug;
            RETURN NEW;
        END IF;
    END IF;

    RAISE unique_violation USING
        MESSAGE = 'An article redirect already uses this slug.',
        TABLE = 'article_slug_redirects',
        CONSTRAINT = 'article_slug_redirects_pkey';
END;
$guard$;

CREATE OR REPLACE FUNCTION guard_article_alias_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
BEGIN
    PERFORM lock_article_slug_namespace();

    IF EXISTS (SELECT 1 FROM articles WHERE slug = NEW.old_slug) THEN
        RAISE unique_violation USING
            MESSAGE = 'An article already uses this slug.',
            TABLE = 'article_slug_redirects',
            CONSTRAINT = 'article_slug_redirects_pkey';
    END IF;

    RETURN NEW;
END;
$guard$;

CREATE OR REPLACE FUNCTION record_article_slug_redirect()
RETURNS trigger
LANGUAGE plpgsql
AS $redirect$
BEGIN
    IF OLD.published OR EXISTS (
        SELECT 1 FROM article_revisions
        WHERE article_slug IN (OLD.slug, NEW.slug) AND slug = OLD.slug AND published
    ) THEN
        INSERT INTO article_slug_redirects (old_slug, article_slug) VALUES (OLD.slug, NEW.slug);
    END IF;
    RETURN NEW;
END;
$redirect$;

DROP TRIGGER IF EXISTS guard_article_canonical_slug ON articles;
CREATE TRIGGER guard_article_canonical_slug
    BEFORE INSERT OR UPDATE OF slug ON articles
    FOR EACH ROW EXECUTE FUNCTION guard_article_canonical_slug();

DROP TRIGGER IF EXISTS guard_article_alias_slug ON article_slug_redirects;
CREATE TRIGGER guard_article_alias_slug
    BEFORE INSERT OR UPDATE OF old_slug, article_slug ON article_slug_redirects
    FOR EACH ROW EXECUTE FUNCTION guard_article_alias_slug();

DROP TRIGGER IF EXISTS record_article_slug_redirect ON articles;
CREATE TRIGGER record_article_slug_redirect
    AFTER UPDATE OF slug ON articles
    FOR EACH ROW WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
    EXECUTE FUNCTION record_article_slug_redirect();

COMMIT;
