-- 首页最近用户查询及其角色关联子查询复用此索引。
CREATE INDEX idx_user_live_created ON sys_user(deleted_at, created_at, id);
