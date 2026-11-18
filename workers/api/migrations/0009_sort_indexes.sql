-- 管理快照与授权菜单按全表顺序读取。
CREATE INDEX idx_department_sort ON sys_department(sort_order, id);
CREATE INDEX idx_role_sort ON sys_role(sort_order, id);
CREATE INDEX idx_menu_sort ON sys_menu(sort_order, id);

-- 登录保留最近会话时使用 token_hash 打破毫秒时间戳并列。
CREATE INDEX idx_auth_session_user_order ON sys_auth_session(user_id, created_at DESC, token_hash DESC);
DROP INDEX idx_auth_session_user;
