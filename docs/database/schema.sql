-- ============================================================
-- Npora Admin Template
-- Database Contract V1
--
-- MySQL >= 8.0.16
--
-- Core modules:
--   1. User
--   2. Department
--   3. Role
--   4. Menu / Dynamic Route / Button Permission
--   5. User - Role
--   6. Role - Menu
--
-- Notes:
--   - This file defines the database contract for Npora Admin.
--   - Backend implementations should keep these table/column semantics.
--   - API response DTOs are defined separately from database entities.
-- ============================================================


SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================
-- Drop tables
--
-- Drop relation tables first.
-- ============================================================

DROP TABLE IF EXISTS `sys_role_menu`;

DROP TABLE IF EXISTS `sys_user_role`;

DROP TABLE IF EXISTS `sys_menu`;

DROP TABLE IF EXISTS `sys_role`;

DROP TABLE IF EXISTS `sys_user`;

DROP TABLE IF EXISTS `sys_department`;


-- ============================================================
-- Department
-- ============================================================

CREATE TABLE `sys_department` (
                                  `id`
                                      BIGINT UNSIGNED
    NOT NULL
    AUTO_INCREMENT
    COMMENT '部门 ID',

                                  `parent_id`
                                      BIGINT UNSIGNED
    DEFAULT NULL
    COMMENT '父部门 ID，NULL 表示顶级部门',

                                  `name`
                                      VARCHAR(100)
                                      NOT NULL
                                      COMMENT '部门名称',

                                  `code`
                                      VARCHAR(64)
                                      DEFAULT NULL
                                      COMMENT '部门编码',

                                  `leader`
                                      VARCHAR(100)
                                      DEFAULT NULL
                                      COMMENT '部门负责人名称',

                                  `phone`
                                      VARCHAR(32)
                                      DEFAULT NULL
                                      COMMENT '联系电话',

                                  `email`
                                      VARCHAR(255)
                                      DEFAULT NULL
                                      COMMENT '部门邮箱',

                                  `sort_order`
                                      INT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '同级排序值，越小越靠前',

                                  `status`
                                      TINYINT UNSIGNED
    NOT NULL
    DEFAULT 1
    COMMENT '状态：0=禁用，1=启用',

                                  `created_at`
                                      DATETIME
                                      NOT NULL
                                      DEFAULT CURRENT_TIMESTAMP
                                      COMMENT '创建时间',

                                  `updated_at`
                                      DATETIME
                                      NOT NULL
                                      DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP
    COMMENT '更新时间',

                                  `deleted_at`
                                      DATETIME
                                      DEFAULT NULL
                                      COMMENT '软删除时间',

                                  PRIMARY KEY (`id`),

                                  UNIQUE KEY `uk_sys_department_code`
                                      (`code`),

                                  KEY `idx_sys_department_parent_sort`
                                      (`parent_id`, `sort_order`, `id`),

                                  KEY `idx_sys_department_status`
                                      (`status`),

                                  KEY `idx_sys_department_deleted_at`
                                      (`deleted_at`),

                                  CONSTRAINT `fk_sys_department_parent`
                                      FOREIGN KEY (`parent_id`)
                                          REFERENCES `sys_department` (`id`)
                                          ON DELETE RESTRICT
                                          ON UPDATE CASCADE,

                                  CONSTRAINT `chk_sys_department_status`
                                      CHECK (`status` IN (0, 1))
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '系统部门表';


-- ============================================================
-- User
-- ============================================================

CREATE TABLE `sys_user` (
                            `id`
                                BIGINT UNSIGNED
    NOT NULL
    AUTO_INCREMENT
    COMMENT '用户 ID',

                            `department_id`
                                BIGINT UNSIGNED
    DEFAULT NULL
    COMMENT '所属部门 ID',

                            `username`
                                VARCHAR(64)
                                NOT NULL
                                COMMENT '登录账号',

                            `password_hash`
                                VARCHAR(255)
                                NOT NULL
                                COMMENT '密码哈希，禁止保存明文密码',

                            `display_name`
                                VARCHAR(100)
                                NOT NULL
                                COMMENT '用户显示名称',

                            `avatar`
                                VARCHAR(500)
                                DEFAULT NULL
                                COMMENT '头像地址',

                            `email`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '邮箱',

                            `mobile`
                                VARCHAR(32)
                                DEFAULT NULL
                                COMMENT '手机号',

                            `status`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 1
    COMMENT '状态：0=禁用，1=启用',

                            `is_super_admin`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '超级管理员：0=否，1=是',

                            `last_login_at`
                                DATETIME
                                DEFAULT NULL
                                COMMENT '最后登录时间',

                            `created_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                COMMENT '创建时间',

                            `updated_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
    COMMENT '更新时间',

                            `deleted_at`
                                DATETIME
                                DEFAULT NULL
                                COMMENT '软删除时间',

                            PRIMARY KEY (`id`),

                            UNIQUE KEY `uk_sys_user_username`
                                (`username`),

                            UNIQUE KEY `uk_sys_user_email`
                                (`email`),

                            UNIQUE KEY `uk_sys_user_mobile`
                                (`mobile`),

                            KEY `idx_sys_user_department`
                                (`department_id`),

                            KEY `idx_sys_user_status`
                                (`status`),

                            KEY `idx_sys_user_deleted_at`
                                (`deleted_at`),

                            CONSTRAINT `fk_sys_user_department`
                                FOREIGN KEY (`department_id`)
                                    REFERENCES `sys_department` (`id`)
                                    ON DELETE SET NULL
                                    ON UPDATE CASCADE,

                            CONSTRAINT `chk_sys_user_status`
                                CHECK (`status` IN (0, 1)),

                            CONSTRAINT `chk_sys_user_super_admin`
                                CHECK (`is_super_admin` IN (0, 1))
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '系统用户表';


-- ============================================================
-- Role
-- ============================================================

CREATE TABLE `sys_role` (
                            `id`
                                BIGINT UNSIGNED
    NOT NULL
    AUTO_INCREMENT
    COMMENT '角色 ID',

                            `code`
                                VARCHAR(64)
                                NOT NULL
                                COMMENT '角色编码，例如 admin、operator',

                            `name`
                                VARCHAR(100)
                                NOT NULL
                                COMMENT '角色名称',

                            `description`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '角色说明',

                            `sort_order`
                                INT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '排序值，越小越靠前',

                            `status`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 1
    COMMENT '状态：0=禁用，1=启用',

                            `created_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                COMMENT '创建时间',

                            `updated_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
    COMMENT '更新时间',

                            `deleted_at`
                                DATETIME
                                DEFAULT NULL
                                COMMENT '软删除时间',

                            PRIMARY KEY (`id`),

                            UNIQUE KEY `uk_sys_role_code`
                                (`code`),

                            KEY `idx_sys_role_status_sort`
                                (`status`, `sort_order`, `id`),

                            KEY `idx_sys_role_deleted_at`
                                (`deleted_at`),

                            CONSTRAINT `chk_sys_role_status`
                                CHECK (`status` IN (0, 1))
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '系统角色表';


-- ============================================================
-- Menu / Dynamic Route / Button Permission
--
-- type:
--   1 = Directory
--   2 = Menu / Page
--   3 = Button Permission
--
-- Important:
--   - Directory does not store "Layout" in component.
--   - Layout is resolved by frontend route transformer.
--   - Button nodes never become Vue Router routes.
-- ============================================================

CREATE TABLE `sys_menu` (
                            `id`
                                BIGINT UNSIGNED
    NOT NULL
    AUTO_INCREMENT
    COMMENT '菜单节点 ID',

                            `parent_id`
                                BIGINT UNSIGNED
    DEFAULT NULL
    COMMENT '父节点 ID，NULL 表示顶级节点',

                            `type`
                                TINYINT UNSIGNED
    NOT NULL
    COMMENT '节点类型：1=目录，2=菜单，3=按钮',

                            `title`
                                VARCHAR(100)
                                NOT NULL
                                COMMENT '菜单、页面或按钮名称',

                            `name`
                                VARCHAR(100)
                                DEFAULT NULL
                                COMMENT 'Vue Router 路由名称，仅页面菜单使用',

                            `path`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '路由路径，顶级建议绝对路径，子级建议相对路径',

                            `component`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '页面组件路径，例如 system/user/index',

                            `redirect`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '路由重定向地址',

                            `route_query`
                                JSON
                                DEFAULT NULL
                                COMMENT '进入路由时附加的默认 Query 参数',

                            `active_menu`
                                VARCHAR(255)
                                DEFAULT NULL
                                COMMENT '隐藏页面需要高亮的菜单路径，例如 /system/user',

                            `icon`
                                VARCHAR(100)
                                DEFAULT NULL
                                COMMENT '图标名称，对应前端 Icon Registry',

                            `permission`
                                VARCHAR(150)
                                DEFAULT NULL
                                COMMENT '按钮权限标识，例如 system:user:create',

                            `visible`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 1
    COMMENT '是否显示在菜单：0=隐藏，1=显示',

                            `always_show`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '是否始终显示父级菜单：0=否，1=是',

                            `keep_alive`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '是否缓存页面：0=否，1=是',

                            `fixed_tab`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '是否固定在 Tabs：0=否，1=是',

                            `sort_order`
                                INT UNSIGNED
    NOT NULL
    DEFAULT 0
    COMMENT '同级排序值，越小越靠前',

                            `status`
                                TINYINT UNSIGNED
    NOT NULL
    DEFAULT 1
    COMMENT '状态：0=禁用，1=启用',

                            `created_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                COMMENT '创建时间',

                            `updated_at`
                                DATETIME
                                NOT NULL
                                DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
    COMMENT '更新时间',

                            `deleted_at`
                                DATETIME
                                DEFAULT NULL
                                COMMENT '软删除时间',

                            PRIMARY KEY (`id`),

                            UNIQUE KEY `uk_sys_menu_name`
                                (`name`),

                            UNIQUE KEY `uk_sys_menu_permission`
                                (`permission`),

                            KEY `idx_sys_menu_parent_sort`
                                (`parent_id`, `sort_order`, `id`),

                            KEY `idx_sys_menu_type_status`
                                (`type`, `status`),

                            KEY `idx_sys_menu_deleted_at`
                                (`deleted_at`),

                            CONSTRAINT `fk_sys_menu_parent`
                                FOREIGN KEY (`parent_id`)
                                    REFERENCES `sys_menu` (`id`)
                                    ON DELETE RESTRICT
                                    ON UPDATE CASCADE,

                            CONSTRAINT `chk_sys_menu_type`
                                CHECK (`type` IN (1, 2, 3)),

                            CONSTRAINT `chk_sys_menu_visible`
                                CHECK (`visible` IN (0, 1)),

                            CONSTRAINT `chk_sys_menu_always_show`
                                CHECK (`always_show` IN (0, 1)),

                            CONSTRAINT `chk_sys_menu_keep_alive`
                                CHECK (`keep_alive` IN (0, 1)),

                            CONSTRAINT `chk_sys_menu_fixed_tab`
                                CHECK (`fixed_tab` IN (0, 1)),

                            CONSTRAINT `chk_sys_menu_status`
                                CHECK (`status` IN (0, 1))
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '系统菜单、动态路由及按钮权限表';


-- ============================================================
-- User - Role
-- ============================================================

CREATE TABLE `sys_user_role` (
                                 `user_id`
                                     BIGINT UNSIGNED
    NOT NULL
    COMMENT '用户 ID',

                                 `role_id`
                                     BIGINT UNSIGNED
    NOT NULL
    COMMENT '角色 ID',

                                 `created_at`
                                     DATETIME
                                     NOT NULL
                                     DEFAULT CURRENT_TIMESTAMP
                                     COMMENT '创建时间',

                                 PRIMARY KEY (`user_id`, `role_id`),

                                 KEY `idx_sys_user_role_role`
                                     (`role_id`, `user_id`),

                                 CONSTRAINT `fk_sys_user_role_user`
                                     FOREIGN KEY (`user_id`)
                                         REFERENCES `sys_user` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE,

                                 CONSTRAINT `fk_sys_user_role_role`
                                     FOREIGN KEY (`role_id`)
                                         REFERENCES `sys_role` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '用户角色关联表';


-- ============================================================
-- Role - Menu / Permission
-- ============================================================

CREATE TABLE `sys_role_menu` (
                                 `role_id`
                                     BIGINT UNSIGNED
    NOT NULL
    COMMENT '角色 ID',

                                 `menu_id`
                                     BIGINT UNSIGNED
    NOT NULL
    COMMENT '目录、菜单或按钮节点 ID',

                                 `created_at`
                                     DATETIME
                                     NOT NULL
                                     DEFAULT CURRENT_TIMESTAMP
                                     COMMENT '创建时间',

                                 PRIMARY KEY (`role_id`, `menu_id`),

                                 KEY `idx_sys_role_menu_menu`
                                     (`menu_id`, `role_id`),

                                 CONSTRAINT `fk_sys_role_menu_role`
                                     FOREIGN KEY (`role_id`)
                                         REFERENCES `sys_role` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE,

                                 CONSTRAINT `fk_sys_role_menu_menu`
                                     FOREIGN KEY (`menu_id`)
                                         REFERENCES `sys_menu` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE
)
    ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci
COMMENT = '角色菜单及按钮权限关联表';


SET FOREIGN_KEY_CHECKS = 1;