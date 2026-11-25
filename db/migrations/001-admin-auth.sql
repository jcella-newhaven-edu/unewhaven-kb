BEGIN;

CREATE TABLE IF NOT EXISTS admin_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    object_id uuid NOT NULL,
    display_name text NOT NULL,
    email text,
    role text NOT NULL CHECK (role IN ('admin', 'editor')),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, object_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
    account_id uuid NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'editor')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_account_id
    ON admin_sessions (account_id);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at
    ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_oidc_transactions (
    state_hash bytea PRIMARY KEY CHECK (octet_length(state_hash) = 32),
    nonce text NOT NULL,
    code_verifier text NOT NULL,
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_oidc_transactions_expires_at
    ON admin_oidc_transactions (expires_at);

COMMIT;
