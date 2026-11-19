-- 操作审计日志增量迁移：依次应用基础和索引迁移后执行一次。
-- DDL 隐式提交，审计时间由应用以 Unix 毫秒写入。
SET NAMES utf8mb4;
CREATE TABLE sys_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(4) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(14) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result VARCHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_log_time (created_at DESC,id DESC),
  KEY idx_audit_log_action_time (action,created_at DESC,id DESC),
  KEY idx_audit_log_result_time (result,created_at DESC,id DESC),
  KEY idx_audit_log_action_result_time (action,result,created_at DESC,id DESC),
  CHECK (actor_id > 0 AND target_id > 0 AND created_at >= 0),
  CHECK (
    (target_type = 'user' AND action IN ('password_reset','totp_enable','totp_disable'))
    OR (target_type = 'role' AND action = 'role_grant')
  ),
  CHECK (
    (result = 'success' AND status_code = 200)
    OR (result = 'failure' AND status_code BETWEEN 400 AND 599)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作审计日志';
START TRANSACTION;
-- Use generated menu IDs and keep audit access independent from all existing role grants.
INSERT INTO sys_menu(parent_id,type,title,name,path,component,icon,sort_order)
SELECT id,2,'操作审计日志','SystemAuditLog','audit-log','system/audit-log/index','collection',38
FROM sys_menu WHERE parent_id IS NULL AND type=1 AND path='/system' AND deleted_at IS NULL
ORDER BY id LIMIT 1;
INSERT INTO sys_menu(parent_id,type,title,permission,sort_order)
SELECT id,3,'查看','system:audit-log:list',1
FROM sys_menu WHERE name='SystemAuditLog' AND deleted_at IS NULL;
COMMIT;
