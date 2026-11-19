-- Keep the existing audit indexes and add ordered lookups for exact actor and target IDs.
CREATE INDEX idx_audit_log_actor_time ON sys_audit_log(actor_id, created_at DESC, id DESC);
CREATE INDEX idx_audit_log_target_time ON sys_audit_log(target_id, created_at DESC, id DESC);
