-- Administradores
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Administradores
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Administradores
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Administradores
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Administradores
INSERT INTO admin_users (
    username,
    password_hash,
    role,
    active,
    must_change_password,
    created_at,
    updated_at
)
VALUES
    (
        'gerber.salazar@dgac.gob.gt',
        '$2b$12$urAta3PjJJO4prtXKDrK7.zq1gF60ZRkMwZS5GpBS3wEZmWmNRwVK',
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'admin2@dgac.gob.gt',
        '$2b$12$urAta3PjJJO4prtXKDrK7.zq1gF60ZRkMwZS5GpBS3wEZmWmNRwVK',
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'admin3@dgac.gob.gt',
        '$2b$12$urAta3PjJJO4prtXKDrK7.zq1gF60ZRkMwZS5GpBS3wEZmWmNRwVK',
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'admin4@dgac.gob.gt',
        '$2b$12$urAta3PjJJO4prtXKDrK7.zq1gF60ZRkMwZS5GpBS3wEZmWmNRwVK',
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    )
ON CONFLICT (username)
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    must_change_password = TRUE,
    updated_at = NOW();
