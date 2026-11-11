# Despliegue de INTRANET

## Requisitos

- Node.js 22 LTS o posterior.
- PostgreSQL accesible desde el backend.
- Un servicio de Windows para ejecutar `backend/dist/server.js`.
- IIS, Nginx u otro servidor web para publicar el frontend y reenviar `/api` al backend.
- Una carpeta persistente, escribible por la cuenta del servicio, para los archivos cargados.

## Variables del backend

Crear `backend/.env` en el servidor. No subirlo a Git.

```env
PORT=3000
CORS_ORIGIN=https://intranet.dominio.local
JWT_SECRET=REEMPLAZAR_CON_UN_SECRETO_ALEATORIO_LARGO

DB_HOST=servidor-postgresql
DB_PORT=5432
DB_NAME=portal_dashboard_db
DB_USER=usuario_aplicacion
DB_PASSWORD=REEMPLAZAR

UPLOAD_DIR=D:\INTRANET_DATA\uploads
AUTH_MODE=local

LDAP_URL=
LDAP_BASE_DN=
LDAP_DOMAIN=
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=
```

`UPLOAD_DIR` debe estar fuera de la carpeta que se reemplaza en cada despliegue. La cuenta que ejecuta Node.js necesita permisos de lectura, escritura y eliminación en esa ruta.

## Compilacion

```powershell
Set-Location backend
npm ci
npm run build
npm audit --omit=dev

Set-Location ..\frontend
npm ci
npm run build
```

El backend compilado queda en `backend/dist`. El frontend queda en `frontend/dist/frontend`.

## Secuencia de despliegue

1. Respaldar PostgreSQL, el `.env` productivo y `UPLOAD_DIR`.
2. Detener el servicio del backend.
3. Actualizar el codigo desde Git.
4. Aplicar las migraciones pendientes antes de iniciar la nueva version.
5. Ejecutar `npm ci` y las compilaciones.
6. Conservar el `.env` productivo; nunca sustituirlo por `.env.example`.
7. Publicar el frontend compilado en el sitio web.
8. Iniciar el servicio del backend.
9. Verificar `GET /api/health`, login, dashboard, carga y descarga.

### Migracion del rol de RR. HH.

Esta version requiere ampliar la validacion de roles sin modificar los usuarios existentes:

```powershell
psql -d portal_dashboard_db -f backend/src/data/migrations/20261111-add-hr-admin-role.sql
```

Ejecutar el comando con una cuenta que pueda alterar `admin_users`. La migracion es transaccional y puede volver a ejecutarse si el constraint conserva el nombre `chk_admin_users_role`.

## Proxy requerido

El proxy debe reenviar todas las rutas `/api/*` al backend, no solamente las rutas de autenticacion. Los archivos administrados se sirven bajo `/api/public/files/*`.

## Reversion

Si falla la verificacion, detener el backend, restaurar la carpeta publicada y el `.env`, iniciar la version anterior y restaurar la base de datos solamente si el despliegue incluyo cambios de esquema o datos.

## Respaldos posteriores

Incluir siempre en los respaldos:

- Base de datos PostgreSQL.
- Archivo `backend/.env`.
- Directorio configurado en `UPLOAD_DIR`.
