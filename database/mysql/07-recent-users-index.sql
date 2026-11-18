-- 支持按创建时间和 ID 获取最近加入的未删除用户。
ALTER TABLE sys_user ADD KEY idx_sys_user_live_created (deleted_at, created_at, id);
