-- Core list indexes: active records, status filters, parent/department lookup and ordering.
CREATE INDEX idx_user_live ON sys_user(deleted_at,id);
CREATE INDEX idx_user_live_status ON sys_user(deleted_at,status,id);
CREATE INDEX idx_user_department_live ON sys_user(department_id,deleted_at,id);
DROP INDEX idx_user_department;
CREATE INDEX idx_department_parent_live_sort ON sys_department(parent_id,deleted_at,sort_order,id);
CREATE INDEX idx_department_live_sort ON sys_department(deleted_at,sort_order,id);
CREATE INDEX idx_department_live_status_sort ON sys_department(deleted_at,status,sort_order,id);
DROP INDEX idx_department_parent_sort;
CREATE INDEX idx_role_live_sort ON sys_role(deleted_at,sort_order,id);
CREATE INDEX idx_role_live_status_sort ON sys_role(deleted_at,status,sort_order,id);
DROP INDEX idx_role_status_sort;
CREATE INDEX idx_menu_parent_live_sort ON sys_menu(parent_id,deleted_at,sort_order,id);
CREATE INDEX idx_menu_live_type_status ON sys_menu(deleted_at,type,status,id);
CREATE INDEX idx_menu_live_sort ON sys_menu(deleted_at,sort_order,id);
DROP INDEX idx_menu_parent_sort;
