-- Optional TOTP records. The backend encrypts secrets with a server-only key.
-- Times are Unix milliseconds; enabled bindings survive password resets.
CREATE TABLE `sys_user_totp` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `secret_encrypted` VARCHAR(160) NOT NULL,
  `enabled` TINYINT NOT NULL DEFAULT 0,
  `pending_expires_at` BIGINT NULL,
  `credential_fingerprint` CHAR(64) NOT NULL,
  `last_used_step` BIGINT NOT NULL DEFAULT -1,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_sys_user_totp_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_sys_user_totp_enabled` CHECK (`enabled` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
