-- 核心列表联合索引：在 01、02、03 后执行一次；已有数据库只增量执行尚未应用的文件。
-- 替换被联合索引覆盖的单列索引；不修改业务数据。MySQL DDL 隐式提交，遇错停止。
-- 外键字段仍放在联合索引最左侧，新增后再删除旧索引。
ALTER TABLE sys_user
  ADD KEY idx_sys_user_department_live (department_id, deleted_at, id),
  ADD KEY idx_sys_user_live_status (deleted_at, status, id),
  DROP KEY idx_sys_user_department,
  DROP KEY idx_sys_user_status;
-- 保留 idx_sys_user_deleted_at；InnoDB 二级索引隐含主键，支持无状态条件的 ID 分页。
ALTER TABLE sys_department
  ADD KEY idx_sys_department_parent_live_sort (parent_id, deleted_at, sort_order, id),
  ADD KEY idx_sys_department_live_sort (deleted_at, sort_order, id),
  ADD KEY idx_sys_department_live_status_sort (deleted_at, status, sort_order, id),
  DROP KEY idx_sys_department_parent_sort,
  DROP KEY idx_sys_department_status,
  DROP KEY idx_sys_department_deleted_at;
ALTER TABLE sys_role
  ADD KEY idx_sys_role_live_sort (deleted_at, sort_order, id),
  ADD KEY idx_sys_role_live_status_sort (deleted_at, status, sort_order, id),
  DROP KEY idx_sys_role_status_sort,
  DROP KEY idx_sys_role_deleted_at;
ALTER TABLE sys_menu
  ADD KEY idx_sys_menu_parent_live_sort (parent_id, deleted_at, sort_order, id),
  ADD KEY idx_sys_menu_live_type_status (deleted_at, type, status, id),
  ADD KEY idx_sys_menu_live_sort (deleted_at, sort_order, id),
  DROP KEY idx_sys_menu_parent_sort,
  DROP KEY idx_sys_menu_type_status,
  DROP KEY idx_sys_menu_deleted_at;
-- sys_user_role / sys_role_menu 已有双向索引，字典的唯一键及联合索引由 03 提供，不重复增加。
