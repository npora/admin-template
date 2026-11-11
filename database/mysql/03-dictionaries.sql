-- 字典增量迁移：先执行 01-schema.sql、02-seed.sql；已有权限库只执行本文件一次。
-- 保留已有数据，遇错停止；DDL 在 MySQL 中隐式提交，请勿重复执行。
SET NAMES utf8mb4;
CREATE TABLE sys_dict_type (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '小写字母开头，允许数字和下划线',
  name VARCHAR(100) NOT NULL,
  remark VARCHAR(255) DEFAULT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  status TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id), UNIQUE KEY uk_sys_dict_type_code (code),
  KEY idx_sys_dict_type_live_sort (deleted_at, sort_order, id),
  KEY idx_sys_dict_type_live_status_sort (deleted_at, status, sort_order, id),
  CONSTRAINT chk_sys_dict_type_status CHECK(status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典类型';
CREATE TABLE sys_dict_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dict_type_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(100) NOT NULL,
  value VARCHAR(100) COLLATE utf8mb4_bin NOT NULL COMMENT '字符串值，区分大小写；数字也作为字符串保存',
  tag_type VARCHAR(10) NOT NULL DEFAULT 'primary',
  remark VARCHAR(255) DEFAULT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  status TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id), UNIQUE KEY uk_sys_dict_item_value (dict_type_id, value),
  KEY idx_sys_dict_item_live_sort (dict_type_id, deleted_at, sort_order, id),
  KEY idx_sys_dict_item_live_status_sort (dict_type_id, deleted_at, status, sort_order, id),
  CONSTRAINT fk_sys_dict_item_type FOREIGN KEY (dict_type_id) REFERENCES sys_dict_type(id) ON DELETE RESTRICT,
  CONSTRAINT chk_sys_dict_item_status CHECK(status IN (0,1)),
  CONSTRAINT chk_sys_dict_item_tag CHECK(tag_type IN ('primary','success','warning','danger','info'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典数据';
START TRANSACTION;
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
COMMIT;
