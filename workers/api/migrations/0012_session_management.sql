-- Add a public selector without changing existing bearer tokens or invalidating sessions.
ALTER TABLE sys_auth_session ADD COLUMN public_id TEXT
  CHECK (public_id IS NULL OR (length(public_id) = 32 AND public_id NOT GLOB '*[^0-9a-f]*'));
UPDATE sys_auth_session SET public_id = lower(hex(randomblob(16)));
CREATE UNIQUE INDEX idx_auth_session_public_id ON sys_auth_session(public_id);
-- Support the previous Worker version during deployment and rollback.
CREATE TRIGGER set_auth_session_public_id AFTER INSERT ON sys_auth_session
WHEN NEW.public_id IS NULL
BEGIN
  UPDATE sys_auth_session SET public_id = lower(hex(randomblob(16))) WHERE token_hash = NEW.token_hash;
END;

-- Expand the action constraint while retaining the audit history and its high-water ID.
ALTER TABLE sys_audit_log RENAME TO _session_migration_old_audit;
CREATE TABLE sys_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  actor_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (actor_id > 0 AND target_id > 0 AND created_at >= 0),
  CHECK (
    (target_type = 'user' AND action IN ('password_reset','totp_enable','totp_disable','session_revoke'))
    OR (target_type = 'role' AND action = 'role_grant')
  ),
  CHECK (
    (result = 'success' AND status_code = 200)
    OR (result = 'failure' AND status_code BETWEEN 400 AND 599)
  )
) STRICT;
INSERT INTO sys_audit_log(id,actor_id,target_type,target_id,action,result,status_code,created_at)
SELECT id,actor_id,target_type,target_id,action,result,status_code,created_at
FROM _session_migration_old_audit;
UPDATE sqlite_sequence
SET seq = max(seq, coalesce((SELECT seq FROM sqlite_sequence WHERE name = '_session_migration_old_audit'), 0))
WHERE name = 'sys_audit_log';
INSERT INTO sqlite_sequence(name,seq)
SELECT 'sys_audit_log', seq FROM sqlite_sequence
WHERE name = '_session_migration_old_audit'
  AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'sys_audit_log');
DROP TABLE _session_migration_old_audit;
CREATE INDEX idx_audit_log_time ON sys_audit_log(created_at DESC,id DESC);
CREATE INDEX idx_audit_log_action_time ON sys_audit_log(action,created_at DESC,id DESC);
CREATE INDEX idx_audit_log_result_time ON sys_audit_log(result,created_at DESC,id DESC);
CREATE INDEX idx_audit_log_action_result_time ON sys_audit_log(action,result,created_at DESC,id DESC);

INSERT INTO sys_menu(parent_id,type,title,permission,sort_order)
SELECT page.id,3,button.title,button.permission,button.sort_order
FROM sys_menu page
CROSS JOIN (
  SELECT '查看权限预览' AS title,'system:user:permission-preview' AS permission,31 AS sort_order
  UNION ALL SELECT '查看用户会话','system:user-session:list',32
  UNION ALL SELECT '撤销用户会话','system:user-session:revoke',33
) button
WHERE page.name = 'SystemUser' AND page.type = 2 AND page.deleted_at IS NULL;
