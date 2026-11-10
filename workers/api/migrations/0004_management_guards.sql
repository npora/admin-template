-- Optimistic validation guard for atomic D1 management writes.
CREATE TABLE sys_data_revision (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL);
INSERT INTO sys_data_revision VALUES (1, 0);
CREATE TABLE sys_mutation_gate (id INTEGER PRIMARY KEY CHECK(id = 1), expected_revision INTEGER NOT NULL, actor_token_hash TEXT);
INSERT INTO sys_mutation_gate VALUES (1, 0, NULL);
CREATE TRIGGER validate_mutation_gate BEFORE UPDATE ON sys_mutation_gate
BEGIN
  SELECT CASE WHEN NEW.expected_revision <> (SELECT revision FROM sys_data_revision WHERE id = 1)
    THEN RAISE(ABORT, 'NPORA_STALE_WRITE') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM sys_auth_session s JOIN sys_user u ON u.id = s.user_id
    WHERE s.token_hash = NEW.actor_token_hash AND s.expires_at > CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
      AND u.status = 1 AND u.deleted_at IS NULL)
    THEN RAISE(ABORT, 'NPORA_AUTH_EXPIRED') END;
END;
CREATE TRIGGER revision_sys_user_insert AFTER INSERT ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_update AFTER UPDATE ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_delete AFTER DELETE ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_insert AFTER INSERT ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_update AFTER UPDATE ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_delete AFTER DELETE ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_insert AFTER INSERT ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_update AFTER UPDATE ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_delete AFTER DELETE ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_insert AFTER INSERT ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_update AFTER UPDATE ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_delete AFTER DELETE ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_insert AFTER INSERT ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_update AFTER UPDATE ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_delete AFTER DELETE ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_insert AFTER INSERT ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_update AFTER UPDATE ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_delete AFTER DELETE ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
