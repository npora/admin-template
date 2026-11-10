-- Keep revocation permanent even when an operator later re-enables an account.
-- Credential fingerprint validation remains a second check in the request handler.
CREATE TRIGGER revoke_sessions_on_user_change
AFTER UPDATE OF status, deleted_at, password_hash ON sys_user
WHEN NEW.status <> 1 OR NEW.deleted_at IS NOT NULL OR NEW.password_hash <> OLD.password_hash
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = NEW.id;
END;
