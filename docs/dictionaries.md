# 字典管理

字典属于核心脚手架。纯净版保留页面、接口定义、公共组件和正式 SQL；可选后端提供同一套接口，展示模式也使用这些接口，不增加本地 Mock。

## 页面和权限

入口为“系统管理 → 字典管理”，组件路径 `system/dict/index`，路由名称 `SystemDict`。类型列表支持查询、分页、新增、编辑和删除；点击“字典数据”在抽屉中管理该类型的标签、值、颜色、排序、状态和备注。

取消或关闭编辑弹窗、关闭数据抽屉不会刷新列表。编辑内容未变化时点击保存也直接关闭，不发送更新请求；实际保存或删除成功后才刷新关联列表，关闭时不重复刷新。

| 权限                                                                              | 用途             |
| --------------------------------------------------------------------------------- | ---------------- |
| `system:dict:list`                                                                | 查看和查询类型   |
| `system:dict:create` / `system:dict:update` / `system:dict:delete`                | 类型增删改       |
| `system:dict-item:list`                                                           | 查看类型下的数据 |
| `system:dict-item:create` / `system:dict-item:update` / `system:dict-item:delete` | 数据增删改       |

管理页面需要授予类型查看权限，数据操作再按需授权。前端隐藏按钮，后端仍独立校验每次操作。业务选项接口仅要求有效登录，不要求字典管理权限，因此普通业务角色也能使用下拉选项；字典中不要存放秘密或按角色隔离的数据。

## SQL 和升级

- 新 MySQL 数据库：依次执行 `database/mysql/01-schema.sql`、`02-seed.sql`、`03-dictionaries.sql`、`04-query-indexes.sql`。
- 已执行前两份的数据库：仅按顺序执行新增的 `03-dictionaries.sql`、`04-query-indexes.sql`，每份一次。
- 可选后端已有前四份迁移：按顺序增量执行 `workers/api/migrations/0005_dictionaries.sql`、`0006_query_indexes.sql`，每份一次；新库按编号执行全部迁移。

迁移创建 `sys_dict_type`、`sys_dict_item`，增加菜单与八个按钮权限，向有效的 `admin` 角色授权，并初始化 `sys_notice_type`（通知类型）及两个选项。已有自定义账号仍按所分配角色授权。菜单由后端动态返回；数据库升级并更新接口后，通过用户菜单“刷新权限”或重新登录显示入口。

新增菜单和按钮的主键由数据库自增生成，通过唯一的 `SystemDict` 路由名称建立父子关系和授权，不预留固定菜单 ID，因此已有自定义菜单和软删除记录不会发生主键冲突。已经成功执行过字典迁移的数据库无需重跑或修改现有菜单 ID；执行失败的库应先核对已完成步骤，尤其是 MySQL 已提交的建表操作，再恢复迁移。

类型编码限小写字母开头、数字和下划线，创建后不可修改。字典值统一为字符串、区分大小写，同一类型内唯一；删除是软删除，编码和值仍保留占用。类型存在未删除数据时禁止删除；修改或删除字典值前，应检查业务表是否引用。业务表与字典的引用关系由所接后端自行维护。

每个类型最多保留 500 条未删除数据，管理列表分页读取；业务选项只返回启用类型下的启用项，按排序值、ID 升序排列。类型禁用时选项返回空数组，类型不存在时返回 404。需要保留历史业务值的编辑表单，应保留原值并提示其已停用，不应自动清空。

## 页面使用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useDict } from '@/composables/useDict'
import DictTag from '@/components/DictTag/index.vue'

const noticeType = ref<string>()
const { options, loading, error, refresh, getLabel } = useDict('sys_notice_type')
</script>

<template>
  <ElSelect v-model="noticeType" :loading="loading" clearable>
    <ElOption v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
  </ElSelect>
  <ElButton v-if="error" @click="refresh">重试</ElButton>
  <DictTag dict-type="sys_notice_type" :value="noticeType" />
  <span>{{ getLabel(noticeType) }}</span>
</template>
```

`useDict` 接受字符串、Ref 或返回编码的 getter，编码变化后自动加载；`options`、`loading` 和 `error` 为响应式数据。`getLabel` 对数字先转字符串（包括 `0`），未知值显示原值，空值显示 `—`。`DictTag` 对匹配项显示对应颜色的标签，未知值保持可见，不伪装成有效选项。

缓存位于 `src/store/modules/dict/`：同一编码的并发请求合并，成功结果缓存五分钟，最多保留 100 个编码，不写本地持久存储。再次读取时检查有效期，已挂载页面不定时轮询；`refresh()` 强制重新读取。刷新失败保留最近成功结果并暴露错误。字典管理修改成功后清理缓存并刷新当前活跃消费者；退出、切换账号或刷新权限时清理会话缓存，旧请求不能恢复已清理的数据。跨浏览器修改在缓存过期后的再次读取或手动刷新时生效，不提供实时推送。

界面文案支持中英文；后端维护的业务标签按原值显示，不自动翻译。程序固定使用的状态枚举仍放在代码中；需要业务人员维护的选项使用字典。

## 接口契约

以下路径不含统一 API 前缀，响应沿用 `{ code, message, data }`。

| 方法         | 路径                                   | 请求 / 返回                                                 |
| ------------ | -------------------------------------- | ----------------------------------------------------------- |
| GET          | `/system/dict-types`                   | `page`、`pageSize`、`keyword`、`status` → `{ list, total }` |
| POST         | `/system/dict-types`                   | `DictTypeInput` → `DictType`                                |
| PUT / DELETE | `/system/dict-types/:id`               | 更新类型 / 软删除空类型                                     |
| GET          | `/system/dict-types/:id/items`         | 同上分页参数 → `{ list, total }`                            |
| POST         | `/system/dict-types/:id/items`         | `DictItemInput` → `DictItem`                                |
| PUT / DELETE | `/system/dict-types/:id/items/:itemId` | 更新 / 软删除所属数据                                       |
| GET          | `/system/dictionaries/:code`           | `DictOption[]`，仅启用项                                    |

完整字段定义位于 `src/api/types/dict.ts`，请求封装位于 `src/api/modules/dict.ts`。`DictTypeInput` 包含 `code/name/remark/sortOrder/status`；`DictItemInput` 包含 `label/value/tagType/remark/sortOrder/status`。`tagType` 只允许 `primary/success/warning/danger/info`。管理 DTO 增加 ID 和创建、更新时间；类型增加 `itemCount`，数据增加 `dictTypeId`。选项仅返回 `label/value/tagType`，不包含备注和管理字段。
