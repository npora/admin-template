-- UPGRADE ONLY: legacy DATETIME schema, not a fresh integer schema.
-- Pause writers and back up first. MySQL DDL implicitly commits. Apply once.
-- Set the SESSION time_zone to the zone that was used for the legacy DATETIME values.
-- For historical UTC use: SET time_zone = '+00:00';
-- New schemas already use milliseconds and MUST NOT execute this upgrade file.

CREATE TEMPORARY TABLE _npora_legacy_time_guard (ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO _npora_legacy_time_guard
SELECT COUNT(*)=21 AND SUM(DATA_TYPE IN ('datetime','timestamp'))=21
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND table_name IN ('sys_department','sys_user','sys_role','sys_menu','sys_user_role','sys_role_menu','sys_dict_type','sys_dict_item')
  AND column_name IN ('created_at','updated_at','deleted_at','last_login_at');
DROP TEMPORARY TABLE _npora_legacy_time_guard;

ALTER TABLE sys_department
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_department SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_department
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_department SET created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_department
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;

ALTER TABLE sys_user
  ADD COLUMN _ms_last_login_at BIGINT NULL,
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_user SET _ms_last_login_at = CASE WHEN last_login_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(last_login_at) * 1000) AS SIGNED) END, _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_user
  MODIFY COLUMN last_login_at BIGINT NULL DEFAULT NULL,
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_user SET last_login_at = _ms_last_login_at, created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_user
  DROP COLUMN _ms_last_login_at,
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;

ALTER TABLE sys_role
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_role SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_role
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_role SET created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_role
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;

ALTER TABLE sys_menu
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_menu SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_menu
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_menu SET created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_menu
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;

ALTER TABLE sys_user_role
  ADD COLUMN _ms_created_at BIGINT NULL;
UPDATE sys_user_role SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_user_role
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED));
UPDATE sys_user_role SET created_at = _ms_created_at;
ALTER TABLE sys_user_role
  DROP COLUMN _ms_created_at;

ALTER TABLE sys_role_menu
  ADD COLUMN _ms_created_at BIGINT NULL;
UPDATE sys_role_menu SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_role_menu
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED));
UPDATE sys_role_menu SET created_at = _ms_created_at;
ALTER TABLE sys_role_menu
  DROP COLUMN _ms_created_at;

ALTER TABLE sys_dict_type
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_dict_type SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_dict_type
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_dict_type SET created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_dict_type
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;

ALTER TABLE sys_dict_item
  ADD COLUMN _ms_created_at BIGINT NULL,
  ADD COLUMN _ms_updated_at BIGINT NULL,
  ADD COLUMN _ms_deleted_at BIGINT NULL;
UPDATE sys_dict_item SET _ms_created_at = CASE WHEN created_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(created_at) * 1000) AS SIGNED) END, _ms_updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(updated_at) * 1000) AS SIGNED) END, _ms_deleted_at = CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(ROUND(UNIX_TIMESTAMP(deleted_at) * 1000) AS SIGNED) END;
ALTER TABLE sys_dict_item
  MODIFY COLUMN created_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN updated_at BIGINT NOT NULL DEFAULT (CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED)),
  MODIFY COLUMN deleted_at BIGINT NULL DEFAULT NULL;
UPDATE sys_dict_item SET created_at = _ms_created_at, updated_at = _ms_updated_at, deleted_at = _ms_deleted_at;
ALTER TABLE sys_dict_item
  DROP COLUMN _ms_created_at,
  DROP COLUMN _ms_updated_at,
  DROP COLUMN _ms_deleted_at;
