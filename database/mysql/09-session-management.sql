-- 会话管理增量迁移。依赖 08-audit-logs.sql 的审计表。
SET NAMES utf8mb4;
ALTER TABLE sys_audit_log
  DROP CHECK sys_audit_log_chk_2,
  ADD CONSTRAINT chk_sys_audit_log_action_target CHECK (
    (target_type = 'user' AND action IN ('password_reset','totp_enable','totp_disable','session_revoke'))
    OR (target_type = 'role' AND action = 'role_grant')
  );

INSERT INTO sys_menu(parent_id,type,title,permission,sort_order)
SELECT page.id,3,button.title,button.permission,button.sort_order
FROM sys_menu page
CROSS JOIN (
  SELECT '查看权限预览' AS title,'system:user:permission-preview' AS permission,31 AS sort_order
  UNION ALL SELECT '查看用户会话','system:user-session:list',32
  UNION ALL SELECT '撤销用户会话','system:user-session:revoke',33
) button
WHERE page.name = 'SystemUser' AND page.type = 2 AND page.deleted_at IS NULL;
