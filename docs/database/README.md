# 数据库模型

正式 SQL 已独立到根目录 [database/](../../database/README.md)，不会随着演示页面或可选后端一起移除。

MySQL 8.0.16+ 的初始化顺序：

1. [01-schema.sql](../../database/mysql/01-schema.sql)：用户、部门、角色、菜单/按钮权限、用户角色关联、角色菜单关联六张表。
2. [02-seed.sql](../../database/mysql/02-seed.sql)：基础部门、角色、系统菜单、按钮权限与授权，不含演示用户和示例页面。

执行命令、权限范围、账号初始化与已有数据库的处理方式见 [MySQL 使用说明](../../database/mysql/README.md)。脚本不会删除或覆盖已有表；原 `docs/database/schema.sql` 的表结构已迁移到上述正式目录，不再维护重复副本。

数据库实体与前端 DTO 分开定义，前端契约以 `src/api/types/` 为准。后端负责密码哈希、认证、接口授权、唯一性、字段校验和事务。模型规则见 [RBAC 说明](../rbac.md)。
