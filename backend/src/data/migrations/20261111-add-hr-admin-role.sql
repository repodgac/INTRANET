BEGIN;

ALTER TABLE admin_users
DROP CONSTRAINT IF EXISTS chk_admin_users_role;

ALTER TABLE admin_users
ADD CONSTRAINT chk_admin_users_role
CHECK (role IN ('super_admin', 'admin', 'hr_admin'));

COMMIT;
