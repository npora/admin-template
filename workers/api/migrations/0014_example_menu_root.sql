-- Promote the seeded demo folder while keeping its existing route paths and role-menu IDs.
-- The core Worker preset does not have this folder.
UPDATE sys_menu
SET parent_id = NULL,
    path = '/system/operation',
    updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER)
WHERE id = 40 AND type = 1 AND path = 'operation' AND deleted_at IS NULL
  AND parent_id IN (SELECT id FROM sys_menu WHERE path = '/system' AND parent_id IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM sys_menu
    WHERE id <> 40 AND parent_id IS NULL AND path = '/system/operation' AND deleted_at IS NULL
  );
