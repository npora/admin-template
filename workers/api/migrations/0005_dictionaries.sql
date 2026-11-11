-- Incremental dictionary schema, permissions and starter entries. Apply once after 0004.
CREATE TABLE sys_dict_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id>0),
  code TEXT NOT NULL UNIQUE CHECK(length(code) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  remark TEXT CHECK(remark IS NULL OR length(remark)<=255),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT
);
CREATE TABLE sys_dict_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id>0),
  dict_type_id INTEGER NOT NULL REFERENCES sys_dict_type(id) ON DELETE RESTRICT,
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 100),
  value TEXT NOT NULL COLLATE BINARY CHECK(length(value) BETWEEN 1 AND 100),
  tag_type TEXT NOT NULL DEFAULT 'primary' CHECK(tag_type IN ('primary','success','warning','danger','info')),
  remark TEXT CHECK(remark IS NULL OR length(remark)<=255),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  UNIQUE(dict_type_id,value)
);
CREATE INDEX idx_dict_type_live_sort ON sys_dict_type(deleted_at,sort_order,id);
CREATE INDEX idx_dict_type_live_status_sort ON sys_dict_type(deleted_at,status,sort_order,id);
CREATE INDEX idx_dict_item_live_sort ON sys_dict_item(dict_type_id,deleted_at,sort_order,id);
CREATE INDEX idx_dict_item_live_status_sort ON sys_dict_item(dict_type_id,deleted_at,status,sort_order,id);
CREATE TRIGGER revision_sys_dict_type_insert AFTER INSERT ON sys_dict_type
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER revision_sys_dict_type_update AFTER UPDATE ON sys_dict_type
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER revision_sys_dict_type_delete AFTER DELETE ON sys_dict_type
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER revision_sys_dict_item_insert AFTER INSERT ON sys_dict_item
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER revision_sys_dict_item_update AFTER UPDATE ON sys_dict_item
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER revision_sys_dict_item_delete AFTER DELETE ON sys_dict_item
BEGIN UPDATE sys_data_revision SET revision=revision+1 WHERE id=1; END;
INSERT INTO sys_dict_type(id,code,name,remark) VALUES (1,'sys_notice_type','通知类型','可供业务页面使用的基础字典');
INSERT INTO sys_dict_item(dict_type_id,label,value,tag_type,sort_order) VALUES
  (1,'通知','notification','primary',0), (1,'公告','announcement','warning',10);
-- 新菜单使用数据库自增 ID；按唯一的路由名称关联按钮，不占用既有菜单或软删除记录的 ID。
INSERT INTO sys_menu(parent_id,type,title,name,path,component,icon,keep_alive,sort_order) VALUES
  (1,2,'字典管理','SystemDict','dict','system/dict/index','collection',1,35);
INSERT INTO sys_menu(parent_id,type,title,permission,sort_order)
SELECT page.id,3,button.title,button.permission,button.sort_order
FROM sys_menu AS page
CROSS JOIN (
  SELECT '查看类型' AS title,'system:dict:list' AS permission,1 AS sort_order
  UNION ALL SELECT '新增类型','system:dict:create',2
  UNION ALL SELECT '编辑类型','system:dict:update',3
  UNION ALL SELECT '删除类型','system:dict:delete',4
  UNION ALL SELECT '查看数据','system:dict-item:list',5
  UNION ALL SELECT '新增数据','system:dict-item:create',6
  UNION ALL SELECT '编辑数据','system:dict-item:update',7
  UNION ALL SELECT '删除数据','system:dict-item:delete',8
) AS button
WHERE page.name='SystemDict';
-- 只给有效 admin 角色授予新页面及其按钮，其他菜单和既有授权保持原样。
INSERT INTO sys_role_menu(role_id,menu_id)
SELECT r.id,m.id
FROM sys_role AS r
JOIN sys_menu AS page ON page.name='SystemDict'
JOIN sys_menu AS m ON m.id=page.id OR m.parent_id=page.id
WHERE r.code='admin' AND r.deleted_at IS NULL;
