-- D1 / SQLite: new empty test database only. Never drops existing tables.
-- Business columns follow database/mysql/01-schema.sql; timestamps are UTC ISO strings.
CREATE TABLE sys_department (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  parent_id INTEGER REFERENCES sys_department(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  code TEXT UNIQUE COLLATE NOCASE,
  leader TEXT, phone TEXT, email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
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
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);
CREATE TABLE sys_role (
  id INTEGER PRIMARY KEY AUTOINCREMENT CHECK(id > 0),
  code TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(length(code) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
  status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
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
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  CHECK(parent_id IS NULL OR parent_id <> id),
  CHECK((type = 3 AND permission IS NOT NULL AND length(permission) > 0 AND path IS NULL AND component IS NULL)
     OR (type IN (1, 2) AND path IS NOT NULL AND permission IS NULL)),
  CHECK(type <> 1 OR component IS NULL),
  CHECK(type <> 2 OR (name IS NOT NULL AND component IS NOT NULL))
);
CREATE TABLE sys_user_role (
  user_id INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY(user_id, role_id)
);
CREATE TABLE sys_role_menu (
  role_id INTEGER NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES sys_menu(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY(role_id, menu_id)
);
-- Authentication infrastructure, separate from the six business tables.
CREATE TABLE sys_auth_session (
  token_hash TEXT PRIMARY KEY CHECK(length(token_hash) = 64),
  user_id INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  credential_fingerprint TEXT NOT NULL CHECK(length(credential_fingerprint) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
);
CREATE TABLE sys_auth_attempt (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL CHECK(attempts > 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_department_parent_sort ON sys_department(parent_id, sort_order, id);
CREATE INDEX idx_user_department ON sys_user(department_id, status);
CREATE INDEX idx_role_status_sort ON sys_role(status, sort_order, id);
CREATE INDEX idx_menu_parent_sort ON sys_menu(parent_id, sort_order, id);
CREATE INDEX idx_user_role_role ON sys_user_role(role_id, user_id);
CREATE INDEX idx_role_menu_menu ON sys_role_menu(menu_id, role_id);
CREATE INDEX idx_auth_session_expiry ON sys_auth_session(expires_at);
CREATE INDEX idx_auth_session_user ON sys_auth_session(user_id, created_at);
CREATE INDEX idx_auth_attempt_expiry ON sys_auth_attempt(expires_at);
