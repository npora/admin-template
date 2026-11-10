-- Npora Admin：基础部门、角色、系统菜单和按钮权限。
-- 先执行 01-schema.sql；在空表执行一次，不使用演示账号或演示页面。
-- 全部写入属于一个事务；任何语句失败时应停止导入并回滚。
SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO sys_department (id, parent_id, name, code, sort_order) VALUES
  (1, NULL, '总部', 'headquarters', 0);

INSERT INTO sys_role (id, code, name, description, sort_order) VALUES
  (1, 'admin', '系统管理员', '系统管理权限；超级管理员由用户独立标记', 0),
  (2, 'editor', '用户编辑者', '查看、新增和编辑用户，不含角色分配', 10),
  (3, 'viewer', '只读用户', '只允许查看用户列表', 20);

-- type：1=目录，2=页面，3=按钮。页面路径对应前端的 src/views/。
INSERT INTO sys_menu (id, parent_id, type, title, name, path, component, icon, keep_alive, always_show, sort_order) VALUES
  (1, NULL, 1, '系统管理', NULL, '/system', NULL, 'setting', 0, 1, 1),
  (10, 1, 2, '用户管理', 'SystemUser', 'user', 'system/user/index', 'user', 1, 0, 10),
  (50, 1, 2, '部门管理', 'SystemDepartment', 'department', 'system/department/index', 'office-building', 1, 0, 15),
  (20, 1, 2, '角色管理', 'SystemRole', 'role', 'system/role/index', 'lock', 1, 0, 20),
  (30, 1, 2, '菜单管理', 'SystemMenu', 'menu', 'system/menu/index', 'setting', 1, 0, 30);

INSERT INTO sys_menu (id, parent_id, type, title, permission, sort_order) VALUES
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

-- 普通管理员授予全部系统管理节点；editor/viewer 同时包含祖先目录。
INSERT INTO sys_role_menu (role_id, menu_id) SELECT 1, id FROM sys_menu;
INSERT INTO sys_role_menu (role_id, menu_id) VALUES
  (2, 1), (2, 10), (2, 11), (2, 12), (2, 13),
  (3, 1), (3, 10), (3, 11);

COMMIT;
