-- Convert legacy ISO dates to Unix milliseconds without changing IDs or associations.
-- Apply once after 0007, as ONE transaction/batch, with writers paused.
-- D1 migrations run in a transaction; for local SQLite wrap this file in BEGIN/COMMIT.
-- Custom columns/indexes/triggers/external foreign keys fail the guard before rebuilding.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE _ms_migration_guard (ok INTEGER NOT NULL CHECK(ok = 1));
INSERT INTO _ms_migration_guard SELECT NOT (EXISTS (SELECT 1 FROM sys_department WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_department WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_department WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_user WHERE last_login_at IS NOT NULL AND (CASE WHEN last_login_at IS NULL THEN NULL WHEN typeof(last_login_at) IN ('integer','real') OR (trim(last_login_at) <> '' AND trim(last_login_at) NOT GLOB '*[^0-9]*') THEN CAST(last_login_at AS INTEGER) ELSE CAST(round((julianday(last_login_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_user WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_user WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_user WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_role WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_role WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_role WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_menu WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_menu WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_menu WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_user_role WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_role_menu WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_type WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_type WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_type WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_item WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_item WHERE updated_at IS NOT NULL AND (CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_dict_item WHERE deleted_at IS NOT NULL AND (CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL) OR EXISTS (SELECT 1 FROM sys_auth_session WHERE created_at IS NOT NULL AND (CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END) IS NULL));
INSERT INTO _ms_migration_guard SELECT NOT EXISTS (SELECT 1 FROM sqlite_schema WHERE tbl_name IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item','sys_auth_session','sys_user_totp') AND type IN ('index','trigger') AND sql IS NOT NULL AND name NOT IN ('idx_user_role_role','idx_role_menu_menu','idx_auth_session_expiry','idx_auth_session_user','revoke_sessions_on_user_change','validate_mutation_gate','revision_sys_user_insert','revision_sys_user_update','revision_sys_user_delete','revision_sys_role_insert','revision_sys_role_update','revision_sys_role_delete','revision_sys_department_insert','revision_sys_department_update','revision_sys_department_delete','revision_sys_menu_insert','revision_sys_menu_update','revision_sys_menu_delete','revision_sys_user_role_insert','revision_sys_user_role_update','revision_sys_user_role_delete','revision_sys_role_menu_insert','revision_sys_role_menu_update','revision_sys_role_menu_delete','idx_dict_type_live_sort','idx_dict_type_live_status_sort','idx_dict_item_live_sort','idx_dict_item_live_status_sort','revision_sys_dict_type_insert','revision_sys_dict_type_update','revision_sys_dict_type_delete','revision_sys_dict_item_insert','revision_sys_dict_item_update','revision_sys_dict_item_delete','idx_user_live','idx_user_live_status','idx_user_department_live','idx_department_parent_live_sort','idx_department_live_sort','idx_department_live_status_sort','idx_role_live_sort','idx_role_live_status_sort','idx_menu_parent_live_sort','idx_menu_live_type_status','idx_menu_live_sort','revoke_sessions_on_totp_enable','revoke_sessions_on_totp_delete'));
INSERT INTO _ms_migration_guard SELECT NOT EXISTS (SELECT 1 FROM sqlite_schema s, pragma_foreign_key_list(s.name) f WHERE s.type = 'table' AND substr(s.name,1,4) <> '_cf_' AND substr(s.name,1,7) <> 'sqlite_' AND s.name NOT IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item','sys_auth_session','sys_user_totp') AND f."table" IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item','sys_auth_session','sys_user_totp'));
INSERT INTO _ms_migration_guard SELECT count(*) = 12 AND sum(name IN ('id','parent_id','name','code','leader','phone','email','sort_order','status','created_at','updated_at','deleted_at')) = 12 FROM pragma_table_info('sys_department');
INSERT INTO _ms_migration_guard SELECT count(*) = 14 AND sum(name IN ('id','department_id','username','password_hash','display_name','avatar','email','mobile','status','is_super_admin','last_login_at','created_at','updated_at','deleted_at')) = 14 FROM pragma_table_info('sys_user');
INSERT INTO _ms_migration_guard SELECT count(*) = 9 AND sum(name IN ('id','code','name','description','sort_order','status','created_at','updated_at','deleted_at')) = 9 FROM pragma_table_info('sys_role');
INSERT INTO _ms_migration_guard SELECT count(*) = 21 AND sum(name IN ('id','parent_id','type','title','name','path','component','redirect','route_query','active_menu','icon','permission','visible','always_show','keep_alive','fixed_tab','sort_order','status','created_at','updated_at','deleted_at')) = 21 FROM pragma_table_info('sys_menu');
INSERT INTO _ms_migration_guard SELECT count(*) = 3 AND sum(name IN ('user_id','role_id','created_at')) = 3 FROM pragma_table_info('sys_user_role');
INSERT INTO _ms_migration_guard SELECT count(*) = 3 AND sum(name IN ('role_id','menu_id','created_at')) = 3 FROM pragma_table_info('sys_role_menu');
INSERT INTO _ms_migration_guard SELECT count(*) = 9 AND sum(name IN ('id','code','name','remark','sort_order','status','created_at','updated_at','deleted_at')) = 9 FROM pragma_table_info('sys_dict_type');
INSERT INTO _ms_migration_guard SELECT count(*) = 11 AND sum(name IN ('id','dict_type_id','label','value','tag_type','remark','sort_order','status','created_at','updated_at','deleted_at')) = 11 FROM pragma_table_info('sys_dict_item');
INSERT INTO _ms_migration_guard SELECT count(*) = 5 AND sum(name IN ('token_hash','user_id','credential_fingerprint','created_at','expires_at')) = 5 FROM pragma_table_info('sys_auth_session');
INSERT INTO _ms_migration_guard SELECT count(*) = 6 AND sum(name IN ('user_id','secret_encrypted','enabled','pending_expires_at','credential_fingerprint','last_used_step')) = 6 FROM pragma_table_info('sys_user_totp');
CREATE TABLE _ms_sequence_backup AS SELECT name,seq FROM sqlite_sequence WHERE name IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item','sys_auth_session','sys_user_totp');
CREATE TABLE _ms_sys_department AS SELECT id, parent_id, name, code, leader, phone, email, sort_order, status, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_department;
CREATE TABLE _ms_sys_user AS SELECT id, department_id, username, password_hash, display_name, avatar, email, mobile, status, is_super_admin, CASE WHEN last_login_at IS NULL THEN NULL WHEN typeof(last_login_at) IN ('integer','real') OR (trim(last_login_at) <> '' AND trim(last_login_at) NOT GLOB '*[^0-9]*') THEN CAST(last_login_at AS INTEGER) ELSE CAST(round((julianday(last_login_at) - 2440587.5) * 86400000) AS INTEGER) END AS last_login_at, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_user;
CREATE TABLE _ms_sys_role AS SELECT id, code, name, description, sort_order, status, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_role;
CREATE TABLE _ms_sys_menu AS SELECT id, parent_id, type, title, name, path, component, redirect, route_query, active_menu, icon, permission, visible, always_show, keep_alive, fixed_tab, sort_order, status, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_menu;
CREATE TABLE _ms_sys_user_role AS SELECT user_id, role_id, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at FROM sys_user_role;
CREATE TABLE _ms_sys_role_menu AS SELECT role_id, menu_id, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at FROM sys_role_menu;
CREATE TABLE _ms_sys_dict_type AS SELECT id, code, name, remark, sort_order, status, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_dict_type;
CREATE TABLE _ms_sys_dict_item AS SELECT id, dict_type_id, label, value, tag_type, remark, sort_order, status, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, CASE WHEN updated_at IS NULL THEN NULL WHEN typeof(updated_at) IN ('integer','real') OR (trim(updated_at) <> '' AND trim(updated_at) NOT GLOB '*[^0-9]*') THEN CAST(updated_at AS INTEGER) ELSE CAST(round((julianday(updated_at) - 2440587.5) * 86400000) AS INTEGER) END AS updated_at, CASE WHEN deleted_at IS NULL THEN NULL WHEN typeof(deleted_at) IN ('integer','real') OR (trim(deleted_at) <> '' AND trim(deleted_at) NOT GLOB '*[^0-9]*') THEN CAST(deleted_at AS INTEGER) ELSE CAST(round((julianday(deleted_at) - 2440587.5) * 86400000) AS INTEGER) END AS deleted_at FROM sys_dict_item;
CREATE TABLE _ms_sys_auth_session AS SELECT token_hash, user_id, credential_fingerprint, CASE WHEN created_at IS NULL THEN NULL WHEN typeof(created_at) IN ('integer','real') OR (trim(created_at) <> '' AND trim(created_at) NOT GLOB '*[^0-9]*') THEN CAST(created_at AS INTEGER) ELSE CAST(round((julianday(created_at) - 2440587.5) * 86400000) AS INTEGER) END AS created_at, expires_at FROM sys_auth_session;
CREATE TABLE _ms_sys_user_totp AS SELECT user_id, secret_encrypted, enabled, pending_expires_at, credential_fingerprint, last_used_step FROM sys_user_totp;
DROP TRIGGER validate_mutation_gate;
DROP TABLE sys_user_totp;
DROP TABLE sys_auth_session;
DROP TABLE sys_dict_item;
DROP TABLE sys_role_menu;
DROP TABLE sys_user_role;
DROP TABLE sys_user;
DROP TABLE sys_menu;
DROP TABLE sys_role;
DROP TABLE sys_dict_type;
DROP TABLE sys_department;
CREATE TABLE sys_department (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  parent_id INTEGER REFERENCES sys_department(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  code TEXT UNIQUE COLLATE NOCASE,
  leader TEXT, phone TEXT, email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER,
  CHECK(parent_id IS NULL OR parent_id <> id)
);
CREATE TABLE sys_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  department_id INTEGER REFERENCES sys_department(id) ON DELETE RESTRICT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(username) BETWEEN 3 AND 64),
  password_hash TEXT NOT NULL CHECK(length(password_hash) <= 255),
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 100),
  avatar TEXT, email TEXT UNIQUE COLLATE NOCASE, mobile TEXT UNIQUE,
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  is_super_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_super_admin IN (0, 1)),
  last_login_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER
);
CREATE TABLE sys_role (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  code TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(code) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER
);
CREATE TABLE sys_menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  parent_id INTEGER REFERENCES sys_menu(id) ON DELETE RESTRICT,
  type INTEGER NOT NULL CHECK(type IN (1, 2, 3)),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  name TEXT UNIQUE, path TEXT, component TEXT, redirect TEXT,
  route_query TEXT CHECK(route_query IS NULL OR json_valid(route_query)),
  active_menu TEXT, icon TEXT, permission TEXT UNIQUE,
  visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0, 1)),
  always_show INTEGER NOT NULL DEFAULT 0 CHECK(always_show IN (0, 1)),
  keep_alive INTEGER NOT NULL DEFAULT 0 CHECK(keep_alive IN (0, 1)),
  fixed_tab INTEGER NOT NULL DEFAULT 0 CHECK(fixed_tab IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER,
  CHECK(parent_id IS NULL OR parent_id <> id),
  CHECK((type = 3 AND permission IS NOT NULL AND length(permission) > 0 AND path IS NULL AND component IS NULL)
     OR (type IN (1, 2) AND path IS NOT NULL AND permission IS NULL)),
  CHECK(type <> 1 OR component IS NULL),
  CHECK(type <> 2 OR (name IS NOT NULL AND component IS NOT NULL))
);
CREATE TABLE sys_user_role (
  user_id INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  PRIMARY KEY(user_id, role_id)
);
CREATE TABLE sys_role_menu (
  role_id INTEGER NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES sys_menu(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  PRIMARY KEY(role_id, menu_id)
);
CREATE TABLE sys_dict_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id>0),
  code TEXT NOT NULL UNIQUE CHECK(length(code) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  remark TEXT CHECK(remark IS NULL OR length(remark)<=255),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0,1)),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER
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
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)),
  deleted_at INTEGER,
  UNIQUE(dict_type_id,value)
);
CREATE TABLE sys_auth_session (
  token_hash TEXT PRIMARY KEY CHECK(length(token_hash) = 64),
  user_id INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  credential_fingerprint TEXT NOT NULL CHECK(length(credential_fingerprint) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
);
CREATE TABLE sys_user_totp (
  user_id INTEGER PRIMARY KEY REFERENCES sys_user(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  pending_expires_at INTEGER,
  credential_fingerprint TEXT NOT NULL,
  last_used_step INTEGER NOT NULL DEFAULT -1
);
INSERT INTO sys_department (id,parent_id,name,code,leader,phone,email,sort_order,status,created_at,updated_at,deleted_at) SELECT id,parent_id,name,code,leader,phone,email,sort_order,status,created_at,updated_at,deleted_at FROM _ms_sys_department;
INSERT INTO sys_user (id,department_id,username,password_hash,display_name,avatar,email,mobile,status,is_super_admin,last_login_at,created_at,updated_at,deleted_at) SELECT id,department_id,username,password_hash,display_name,avatar,email,mobile,status,is_super_admin,last_login_at,created_at,updated_at,deleted_at FROM _ms_sys_user;
INSERT INTO sys_role (id,code,name,description,sort_order,status,created_at,updated_at,deleted_at) SELECT id,code,name,description,sort_order,status,created_at,updated_at,deleted_at FROM _ms_sys_role;
INSERT INTO sys_menu (id,parent_id,type,title,name,path,component,redirect,route_query,active_menu,icon,permission,visible,always_show,keep_alive,fixed_tab,sort_order,status,created_at,updated_at,deleted_at) SELECT id,parent_id,type,title,name,path,component,redirect,route_query,active_menu,icon,permission,visible,always_show,keep_alive,fixed_tab,sort_order,status,created_at,updated_at,deleted_at FROM _ms_sys_menu;
INSERT INTO sys_user_role (user_id,role_id,created_at) SELECT user_id,role_id,created_at FROM _ms_sys_user_role;
INSERT INTO sys_role_menu (role_id,menu_id,created_at) SELECT role_id,menu_id,created_at FROM _ms_sys_role_menu;
INSERT INTO sys_dict_type (id,code,name,remark,sort_order,status,created_at,updated_at,deleted_at) SELECT id,code,name,remark,sort_order,status,created_at,updated_at,deleted_at FROM _ms_sys_dict_type;
INSERT INTO sys_dict_item (id,dict_type_id,label,value,tag_type,remark,sort_order,status,created_at,updated_at,deleted_at) SELECT id,dict_type_id,label,value,tag_type,remark,sort_order,status,created_at,updated_at,deleted_at FROM _ms_sys_dict_item;
INSERT INTO sys_auth_session (token_hash,user_id,credential_fingerprint,created_at,expires_at) SELECT token_hash,user_id,credential_fingerprint,created_at,expires_at FROM _ms_sys_auth_session;
INSERT INTO sys_user_totp (user_id,secret_encrypted,enabled,pending_expires_at,credential_fingerprint,last_used_step) SELECT user_id,secret_encrypted,enabled,pending_expires_at,credential_fingerprint,last_used_step FROM _ms_sys_user_totp;
UPDATE sqlite_sequence SET seq = max(seq, coalesce((SELECT seq FROM _ms_sequence_backup b WHERE b.name = sqlite_sequence.name), seq)) WHERE name IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item','sys_auth_session','sys_user_totp');
CREATE INDEX idx_user_role_role ON sys_user_role(role_id, user_id);
CREATE INDEX idx_role_menu_menu ON sys_role_menu(menu_id, role_id);
CREATE INDEX idx_auth_session_expiry ON sys_auth_session(expires_at);
CREATE INDEX idx_auth_session_user ON sys_auth_session(user_id, created_at);
CREATE TRIGGER revoke_sessions_on_user_change
AFTER UPDATE OF status, deleted_at, password_hash ON sys_user
WHEN NEW.status <> 1 OR NEW.deleted_at IS NOT NULL OR NEW.password_hash <> OLD.password_hash
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = NEW.id;
END;
CREATE TRIGGER validate_mutation_gate BEFORE UPDATE ON sys_mutation_gate
BEGIN
  SELECT CASE WHEN NEW.expected_revision <> (SELECT revision FROM sys_data_revision WHERE id = 1)
    THEN RAISE(ABORT, 'NPORA_STALE_WRITE') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM sys_auth_session s JOIN sys_user u ON u.id = s.user_id
    WHERE s.token_hash = NEW.actor_token_hash AND s.expires_at > CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
      AND u.status = 1 AND u.deleted_at IS NULL)
    THEN RAISE(ABORT, 'NPORA_AUTH_EXPIRED') END;
END;
CREATE TRIGGER revision_sys_user_insert AFTER INSERT ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_update AFTER UPDATE ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_delete AFTER DELETE ON sys_user
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_insert AFTER INSERT ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_update AFTER UPDATE ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_delete AFTER DELETE ON sys_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_insert AFTER INSERT ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_update AFTER UPDATE ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_department_delete AFTER DELETE ON sys_department
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_insert AFTER INSERT ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_update AFTER UPDATE ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_menu_delete AFTER DELETE ON sys_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_insert AFTER INSERT ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_update AFTER UPDATE ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_user_role_delete AFTER DELETE ON sys_user_role
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_insert AFTER INSERT ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_update AFTER UPDATE ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER revision_sys_role_menu_delete AFTER DELETE ON sys_role_menu
BEGIN
  UPDATE sys_data_revision SET revision = revision + 1 WHERE id = 1;
END;
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
CREATE INDEX idx_user_live ON sys_user(deleted_at,id);
CREATE INDEX idx_user_live_status ON sys_user(deleted_at,status,id);
CREATE INDEX idx_user_department_live ON sys_user(department_id,deleted_at,id);
CREATE INDEX idx_department_parent_live_sort ON sys_department(parent_id,deleted_at,sort_order,id);
CREATE INDEX idx_department_live_sort ON sys_department(deleted_at,sort_order,id);
CREATE INDEX idx_department_live_status_sort ON sys_department(deleted_at,status,sort_order,id);
CREATE INDEX idx_role_live_sort ON sys_role(deleted_at,sort_order,id);
CREATE INDEX idx_role_live_status_sort ON sys_role(deleted_at,status,sort_order,id);
CREATE INDEX idx_menu_parent_live_sort ON sys_menu(parent_id,deleted_at,sort_order,id);
CREATE INDEX idx_menu_live_type_status ON sys_menu(deleted_at,type,status,id);
CREATE INDEX idx_menu_live_sort ON sys_menu(deleted_at,sort_order,id);
CREATE TRIGGER revoke_sessions_on_totp_enable
AFTER UPDATE OF enabled ON sys_user_totp WHEN NEW.enabled <> OLD.enabled
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = NEW.user_id;
END;
CREATE TRIGGER revoke_sessions_on_totp_delete
AFTER DELETE ON sys_user_totp WHEN OLD.enabled = 1
BEGIN
  DELETE FROM sys_auth_session WHERE user_id = OLD.user_id;
END;
DROP TABLE _ms_sys_department;
DROP TABLE _ms_sys_user;
DROP TABLE _ms_sys_role;
DROP TABLE _ms_sys_menu;
DROP TABLE _ms_sys_user_role;
DROP TABLE _ms_sys_role_menu;
DROP TABLE _ms_sys_dict_type;
DROP TABLE _ms_sys_dict_item;
DROP TABLE _ms_sys_auth_session;
DROP TABLE _ms_sys_user_totp;
INSERT INTO sqlite_sequence(name,seq) SELECT name,seq FROM _ms_sequence_backup b WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence s WHERE s.name=b.name);
INSERT INTO _ms_migration_guard SELECT NOT EXISTS(SELECT 1 FROM pragma_foreign_key_check);
DROP TABLE _ms_sequence_backup;
DROP TABLE _ms_migration_guard;
PRAGMA defer_foreign_keys = OFF;
