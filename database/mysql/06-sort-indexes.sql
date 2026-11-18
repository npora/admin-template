-- 全量树和角色列表按 sort_order、id 排序，覆盖不带软删除筛选的查询。
ALTER TABLE sys_department ADD KEY idx_sys_department_sort (sort_order, id);
ALTER TABLE sys_role ADD KEY idx_sys_role_sort (sort_order, id);
ALTER TABLE sys_menu ADD KEY idx_sys_menu_sort (sort_order, id);
