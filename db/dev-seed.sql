BEGIN;

INSERT INTO topics (slug, title, description, sort_order)
VALUES ('cloud-dev-it', 'Development IT', 'Sample knowledge base topic', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO articles (slug, title, summary, topic_slug, body, body_text, published, updated)
VALUES (
    'cloud-dev-reset-password',
    'Reset your development password',
    'Sample password reset article',
    'cloud-dev-it',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Use the development account portal to reset your password."}]}]}',
    'Use the development account portal to reset your password.',
    true,
    '2025-01-01T00:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
