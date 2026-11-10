CREATE TABLE IF NOT EXISTS ledgers (
 id text PRIMARY KEY CHECK (id = 'owner'),
 body jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
