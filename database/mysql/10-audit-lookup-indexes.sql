-- 审计日志筛选增量索引，创建审计日志表后执行一次。
ALTER TABLE sys_audit_log
  ADD INDEX idx_audit_log_actor_time (actor_id, created_at DESC, id DESC),
  ADD INDEX idx_audit_log_target_time (target_id, created_at DESC, id DESC);
