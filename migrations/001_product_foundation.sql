CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(24) NOT NULL,
  username_normalized VARCHAR(24) NOT NULL UNIQUE,
  nickname VARCHAR(50),
  password_hash TEXT NOT NULL,
  avatar_object_id UUID,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti UUID NOT NULL UNIQUE, family_id UUID NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, replaced_by_jti UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens(family_id);
CREATE TABLE IF NOT EXISTS media_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(24) NOT NULL, bucket TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL, byte_size BIGINT, width INTEGER, height INTEGER, checksum TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_avatar_fk;
ALTER TABLE users ADD CONSTRAINT users_avatar_fk FOREIGN KEY (avatar_object_id) REFERENCES media_objects(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL DEFAULT '未命名作品', status VARCHAR(20) NOT NULL DEFAULT 'waiting_upload',
  aspect_ratio VARCHAR(12), source_object_id UUID REFERENCES media_objects(id), result_object_id UUID REFERENCES media_objects(id), thumbnail_object_id UUID REFERENCES media_objects(id),
  tutorial JSONB, error_summary TEXT, deleted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS artworks_owner_cursor_idx ON artworks(owner_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS object_cleanup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), media_object_id UUID REFERENCES media_objects(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
