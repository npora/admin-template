-- Incremental audit log schema. Apply after 0010.
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
    (target_type = 'user' AND action IN ('password_reset','totp_enable','totp_disable'))
    OR (target_type = 'role' AND action = 'role_grant')
  ),
  CHECK (
    (result = 'success' AND status_code = 200)
    OR (result = 'failure' AND status_code BETWEEN 400 AND 599)
  )
) STRICT;
CREATE INDEX idx_audit_log_time ON sys_audit_log(created_at DESC,id DESC);
CREATE INDEX idx_audit_log_action_time ON sys_audit_log(action,created_at DESC,id DESC);
CREATE INDEX idx_audit_log_result_time ON sys_audit_log(result,created_at DESC,id DESC);
CREATE INDEX idx_audit_log_action_result_time ON sys_audit_log(action,result,created_at DESC,id DESC);
-- Use generated menu IDs and keep audit access independent from all existing role grants.
INSERT INTO sys_menu(parent_id,type,title,name,path,component,icon,sort_order)
SELECT id,2,'操作审计日志','SystemAuditLog','audit-log','system/audit-log/index','collection',38
FROM sys_menu WHERE parent_id IS NULL AND type=1 AND path='/system' AND deleted_at IS NULL
ORDER BY id LIMIT 1;
INSERT INTO sys_menu(parent_id,type,title,permission,sort_order)
SELECT id,3,'查看','system:audit-log:list',1
FROM sys_menu WHERE name='SystemAuditLog' AND deleted_at IS NULL;
