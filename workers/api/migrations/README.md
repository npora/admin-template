# SQLite 迁移

首次空测试库按顺序执行：

1. `0001_schema.sql`：SQL 设计对应的六张业务表，加独立会话与登录限流表。
2. `0002_seed.sql`：部门、角色、菜单和授权种子，不包含用户或密码。
3. `0003_auth_revocation.sql`：账号禁用、软删除和密码变化时删除关联会话的触发器。
4. `0004_management_guards.sql`：业务版本触发器和事务门禁，防止校验与提交之间的数据竞态。
5. `../.local/bootstrap.sql`：`npm run bootstrap` 在本机生成的随机账号哈希与关联角色。

每份只执行一次；这些文件没有自动迁移执行器。后续已部署数据库的结构变更须新增编号迁移，执行前检查已应用版本，不改写旧文件、不重新初始化、不覆盖原表。

`docs/database/schema.sql` 是 MySQL 设计文件，不能直接在 SQLite 中执行。本目录保留业务列名与软删除语义，将 MySQL 类型转换为 SQLite 类型；`route_query` 存 JSON 文本，时间使用 UTC ISO 字符串，`updated_at` 由写接口显式更新，不包含 MySQL `ON UPDATE` 行为。SQLite `NOCASE` 只对 ASCII 大小写生效，不能假定等同于 MySQL 的 Unicode 排序规则。用户名限制为字母开头的 ASCII 字母、数字和下划线，长度 3–64。

唯一约束包含软删除行，删除账号不会释放用户名。前端 DTO 使用驼峰命名，由服务端映射，不直接输出数据库行。

已有前三份迁移的测试库仅增量应用 0004，不能重复执行建表、种子或 bootstrap。
