-- Optional authenticator enrollment; secrets are encrypted with a server-only key.
CREATE TABLE sys_user_totp (
  user_id INTEGER PRIMARY KEY REFERENCES sys_user(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  pending_expires_at INTEGER,
  credential_fingerprint TEXT NOT NULL,
  last_used_step INTEGER NOT NULL DEFAULT -1
);

CREATE TRIGGER revoke_sessions_on_totp_enable
AFTER UPDATE OF enabled ON sys_user_totp WHEN NEW.enabled <> OLD.enabled
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER revoke_sessions_on_totp_delete
AFTER DELETE ON sys_user_totp WHEN OLD.enabled = 1
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = OLD.user_id;
END;
