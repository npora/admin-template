-- No user, password or session is shipped in public seed data.
INSERT INTO sys_department(id, parent_id, name, code, sort_order) VALUES
  (1, NULL, '总部', 'headquarters', 0),
  (2, 1, '产品研发部', 'development', 10),
  (3, 1, '运营部', 'operations', 20);
INSERT INTO sys_role(id, code, name, description, sort_order) VALUES
  (1, 'admin', '系统管理员', '常规管理角色；超级管理员标记独立于角色', 0),
  (2, 'editor', '用户编辑者', '用户查看、新增与编辑', 10),
  (3, 'viewer', '只读用户', '只允许查看用户列表', 20);
INSERT INTO sys_menu(id, parent_id, type, title, name, path, component, icon, keep_alive, always_show, sort_order) VALUES
  (1, NULL, 1, '系统管理', NULL, '/system', NULL, 'setting', 0, 1, 1),
  (10, 1, 2, '用户管理', 'SystemUser', 'user', 'system/user/index', 'user', 1, 0, 10),
  (50, 1, 2, '部门管理', 'SystemDepartment', 'department', 'system/department/index', 'office-building', 1, 0, 15),
  (20, 1, 2, '角色管理', 'SystemRole', 'role', 'system/role/index', 'lock', 1, 0, 20),
  (30, 1, 2, '菜单管理', 'SystemMenu', 'menu', 'system/menu/index', 'setting', 1, 0, 30);
INSERT INTO sys_menu(id, parent_id, type, title, permission, sort_order) VALUES
  (11, 10, 3, '查看', 'system:user:list', 11),
  (12, 10, 3, '新增', 'system:user:create', 12),
  (13, 10, 3, '编辑', 'system:user:update', 13),
  (14, 10, 3, '删除', 'system:user:delete', 14),
  (15, 10, 3, '分配角色', 'system:user:assign-roles', 15),
  (21, 20, 3, '查看', 'system:role:list', 21),
  (22, 20, 3, '新增', 'system:role:create', 22),
  (23, 20, 3, '编辑', 'system:role:update', 23),
  (24, 20, 3, '删除', 'system:role:delete', 24),
  (25, 20, 3, '授权', 'system:role:grant', 25),
  (31, 30, 3, '查看', 'system:menu:list', 31),
  (32, 30, 3, '新增', 'system:menu:create', 32),
  (33, 30, 3, '编辑', 'system:menu:update', 33),
  (34, 30, 3, '删除', 'system:menu:delete', 34),
  (51, 50, 3, '查看', 'system:department:list', 51),
  (52, 50, 3, '新增', 'system:department:create', 52),
  (53, 50, 3, '编辑', 'system:department:update', 53),
  (54, 50, 3, '删除', 'system:department:delete', 54);
INSERT INTO sys_role_menu(role_id, menu_id) SELECT 1, id FROM sys_menu;
INSERT INTO sys_role_menu(role_id, menu_id) VALUES (2, 10), (2, 11), (2, 12), (2, 13), (3, 10), (3, 11);
