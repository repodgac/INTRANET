import bcrypt from "bcryptjs";
import type { AdminRole } from "./auth";
import { db } from "./postgres";

export interface PublicDocument {
  id: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: string | null;
  area?: string | null;
}

export interface PublicLink {
  id: number;
  title: string;
  description: string | null;
  url: string;
}

export interface VisitInput {
  visitorId: string;
  path: string;
  referrer: string | null;
  userAgent: string;
  ipAddress: string;
}

export interface DownloadInput {
  visitorId: string;
  documentCode: string;
  userAgent: string;
  ipAddress: string;
}

export interface DashboardSnapshot {
  summary: {
    totalVisits: number;
    uniqueVisitors: number;
    totalDownloads: number;
    documentsTracked: number;
    lastVisitAt: string | null;
    lastDownloadAt: string | null;
  };
  trends: {
    visitsByDay: Array<{ date: string; total: number }>;
    downloadsByDay: Array<{ date: string; total: number }>;
  };
  topDocuments: Array<{
    documentId: string;
    title: string;
    fileType: string;
    totalDownloads: number;
    lastDownloadedAt: string;
  }>;
  recentDownloads: Array<{
    id: string;
    visitorId: string;
    documentId: string;
    title: string;
    filePath: string;
    fileType: string;
    area: string | null;
    downloadedAt: string;
  }>;
  recentVisits: Array<{
    id: string;
    visitorId: string;
    path: string;
    referrer: string | null;
    userAgent: string;
    ipAddress: string;
    visitedAt: string;
  }>;
}

export interface ManagedAdminUser {
  id: number;
  username: string;
  loginName: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedAdminDeletionResult {
  admin: ManagedAdminUser;
  mode: "deleted" | "deactivated";
}

const LDAP_PLACEHOLDER_PASSWORD_HASH =
  "$2b$12$cPzP5PUtyyl0.kEQCDGU9eNWoOqyu5Ta3nZNLY3LscJ3AYCCluGP6";

export class PortalRepository {
  async ensureAdminPasswordPolicyColumns() {
    await db.query(`
      ALTER TABLE admin_users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
    `);

    await db.query(`
      ALTER TABLE admin_users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    await db.query(`
      ALTER TABLE admin_users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await db.query(`
      ALTER TABLE admin_users
      ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP
    `);
  }

  async getAdminUserByLoginName(loginName: string) {
    const result = await db.query<{
      id: number;
      username: string;
      login_name: string | null;
      password_hash: string;
      role: AdminRole;
      active: boolean;
      must_change_password: boolean;
    }>(
      `
        SELECT id, username, login_name, password_hash, role, active, must_change_password
        FROM admin_users
        WHERE LOWER(COALESCE(login_name, username)) = LOWER($1)
           OR LOWER(username) = LOWER($1)
        LIMIT 1
      `,
      [loginName]
    );

    return result.rows[0] ?? null;
  }

  async validateAdminCredentials(loginName: string, password: string) {
    const admin = await this.getAdminUserByLoginName(loginName);

    if (!admin?.active) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return null;
    }

    await db.query(
      `
        UPDATE admin_users
        SET last_login_at = NOW()
        WHERE id = $1
      `,
      [admin.id]
    );

    await db.query(
      `
        INSERT INTO admin_activity (admin_user_id, action, description)
        VALUES ($1, 'login', 'Inicio de sesion administrativo')
      `,
      [admin.id]
    );

    return {
      id: admin.id,
      username: admin.login_name ?? admin.username,
      role: admin.role,
      mustChangePassword: admin.must_change_password,
    };
  }

  async listManagedAdmins() {
    const result = await db.query<{
      id: number;
      username: string | null;
      login_name: string;
      email: string | null;
      display_name: string | null;
      role: AdminRole;
      active: boolean;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
        SELECT
          id,
          username,
          login_name,
          email,
          display_name,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
        FROM admin_users
        ORDER BY
          CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END,
          active DESC,
          LOWER(login_name) ASC
      `
    );

    return result.rows.map((row) => this.mapManagedAdmin(row));
  }

  async createManagedAdmin(input: {
    username?: string | null;
    loginName: string;
    email?: string | null;
    displayName?: string | null;
    role: AdminRole;
    createdBy: number;
  }) {
    const normalizedLoginName = input.loginName.trim().toLowerCase();
    const normalizedUsername = input.username?.trim() || normalizedLoginName;
    const normalizedEmail = input.email?.trim().toLowerCase() || null;
    const normalizedDisplayName = input.displayName?.trim() || null;

    const result = await db.query<{
      id: number;
      username: string | null;
      login_name: string;
      email: string | null;
      display_name: string | null;
      role: AdminRole;
      active: boolean;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
        INSERT INTO admin_users (
          username,
          login_name,
          email,
          display_name,
          role,
          active,
          password_hash,
          must_change_password,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, $6, FALSE, $7, $7, NOW(), NOW())
        RETURNING
          id,
          username,
          login_name,
          email,
          display_name,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        normalizedUsername,
        normalizedLoginName,
        normalizedEmail,
        normalizedDisplayName,
        input.role,
        LDAP_PLACEHOLDER_PASSWORD_HASH,
        input.createdBy,
      ]
    );

    await this.recordAdminActivity(
      input.createdBy,
      "create_admin",
      `Registro de acceso administrativo para ${normalizedLoginName}`
    );

    return this.mapManagedAdmin(result.rows[0]);
  }

  async updateManagedAdmin(
    adminId: number,
    input: {
      username?: string | null;
      loginName: string;
      email?: string | null;
      displayName?: string | null;
      role: AdminRole;
      active: boolean;
      updatedBy: number;
    }
  ) {
    const normalizedLoginName = input.loginName.trim().toLowerCase();
    const normalizedUsername = input.username?.trim() || normalizedLoginName;
    const normalizedEmail = input.email?.trim().toLowerCase() || null;
    const normalizedDisplayName = input.displayName?.trim() || null;

    const result = await db.query<{
      id: number;
      username: string | null;
      login_name: string;
      email: string | null;
      display_name: string | null;
      role: AdminRole;
      active: boolean;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
        UPDATE admin_users
        SET
          username = $2,
          login_name = $3,
          email = $4,
          display_name = $5,
          role = $6,
          active = $7,
          updated_by = $8,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          username,
          login_name,
          email,
          display_name,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        adminId,
        normalizedUsername,
        normalizedLoginName,
        normalizedEmail,
        normalizedDisplayName,
        input.role,
        input.active,
        input.updatedBy,
      ]
    );

    const admin = result.rows[0] ?? null;

    if (!admin) {
      return null;
    }

    await this.recordAdminActivity(
      input.updatedBy,
      "update_admin",
      `Actualizacion de acceso administrativo para ${normalizedLoginName}`
    );

    return this.mapManagedAdmin(admin);
  }

  async deleteManagedAdmin(adminId: number, deletedBy: number) {
    const lookup = await db.query<{
      id: number;
      username: string | null;
      login_name: string;
      email: string | null;
      display_name: string | null;
      role: AdminRole;
      active: boolean;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
      activity_count: string;
    }>(
      `
        SELECT
          id,
          username,
          login_name,
          email,
          display_name,
          role,
          active,
          last_login_at,
          created_at,
          updated_at,
          (
            SELECT COUNT(*)
            FROM admin_activity
            WHERE admin_user_id = admin_users.id
          )::text AS activity_count
        FROM admin_users
        WHERE id = $1
      `,
      [adminId]
    );

    const target = lookup.rows[0];

    if (!target) {
      return false;
    }

    if (Number(target.activity_count) > 0) {
      const result = await db.query<{
        id: number;
        username: string | null;
        login_name: string;
        email: string | null;
        display_name: string | null;
        role: AdminRole;
        active: boolean;
        last_login_at: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `
          UPDATE admin_users
          SET
            active = FALSE,
            updated_by = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            username,
            login_name,
            email,
            display_name,
            role,
            active,
            last_login_at,
            created_at,
            updated_at
        `,
        [adminId, deletedBy]
      );

      await this.recordAdminActivity(
        deletedBy,
        "deactivate_admin",
        `Desactivacion de acceso administrativo para ${target.login_name}`
      );

      return {
        mode: "deactivated",
        admin: this.mapManagedAdmin(result.rows[0]),
      } satisfies ManagedAdminDeletionResult;
    }

    await db.query(
      `
        DELETE FROM admin_users
        WHERE id = $1
      `,
      [adminId]
    );

    await this.recordAdminActivity(
      deletedBy,
      "delete_admin",
      `Eliminacion de acceso administrativo para ${target.login_name}`
    );

    return {
      mode: "deleted",
      admin: this.mapManagedAdmin(target),
    } satisfies ManagedAdminDeletionResult;
  }

  async recordAdminLogin(adminId: number) {
    await db.query(
      `
        UPDATE admin_users
        SET last_login_at = NOW()
        WHERE id = $1
      `,
      [adminId]
    );

    await this.recordAdminActivity(adminId, "login", "Inicio de sesion administrativo");
  }

  async changeAdminPassword(adminId: number, newPassword: string) {
    this.assertPasswordPolicy(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await db.query<{
      id: number;
      username: string;
      login_name: string | null;
      role: AdminRole;
      must_change_password: boolean;
    }>(
      `
        UPDATE admin_users
        SET
          password_hash = $2,
          must_change_password = FALSE,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND active = TRUE
        RETURNING id, username, login_name, role, must_change_password
      `,
      [adminId, passwordHash]
    );

    const admin = result.rows[0];

    if (!admin) {
      return null;
    }

    await this.recordAdminActivity(
      adminId,
      "change_password",
      "Cambio obligatorio de contrasena en primer acceso"
    );

    return {
      id: admin.id,
      username: admin.login_name ?? admin.username,
      role: admin.role,
      mustChangePassword: admin.must_change_password,
    };
  }

  async getActiveForms() {
    const result = await db.query<{
      id: string;
      title: string;
      description: string | null;
      file_path: string;
      file_type: string | null;
    }>(
      `
        SELECT
          code AS id,
          title,
          description,
          file_path,
          UPPER(document_type) AS file_type
        FROM documents
        WHERE active = TRUE
          AND document_type IN ('docx', 'xlsx', 'form')
        ORDER BY created_at ASC, id ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      filePath: row.file_path,
      fileType: row.file_type,
    })) satisfies PublicDocument[];
  }

  async getActiveSpecs() {
    const result = await db.query<{
      id: string;
      title: string;
      description: string | null;
      file_path: string;
      area: string | null;
    }>(
      `
        SELECT
          code AS id,
          title,
          description,
          file_path,
          area
        FROM documents
        WHERE active = TRUE
          AND document_type = 'pdf'
        ORDER BY created_at ASC, id ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      filePath: row.file_path,
      area: row.area,
    }));
  }

  async getActiveLinks() {
    const result = await db.query<{
      id: number;
      title: string;
      description: string | null;
      url: string;
    }>(
      `
        SELECT id, title, description, url
        FROM links
        WHERE active = TRUE
        ORDER BY created_at ASC, id ASC
      `
    );

    return result.rows satisfies PublicLink[];
  }

  async recordVisit(input: VisitInput) {
    const visitorId = await this.ensureVisitor(input.visitorId);

    await db.query(
      `
        INSERT INTO site_visits (visitor_id, path, referrer, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [visitorId, input.path, input.referrer, input.ipAddress, input.userAgent]
    );
  }

  async recordDownload(input: DownloadInput) {
    const visitorId = await this.ensureVisitor(input.visitorId);
    const documentResult = await db.query<{ id: number }>(
      `
        SELECT id
        FROM documents
        WHERE code = $1
          AND active = TRUE
        LIMIT 1
      `,
      [input.documentCode]
    );

    const document = documentResult.rows[0];

    if (!document) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    await db.query(
      `
        INSERT INTO document_downloads (visitor_id, document_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `,
      [visitorId, document.id, input.ipAddress, input.userAgent]
    );
  }

  async getDashboardSnapshot() {
    const [summaryResult, visitsTrendResult, downloadsTrendResult, topDocumentsResult, recentDownloadsResult, recentVisitsResult] =
      await Promise.all([
        db.query<{
          total_visits: string;
          total_visitors: string;
          total_downloads: string;
          active_documents: string;
          last_visit_at: string | null;
          last_download_at: string | null;
        }>(`SELECT * FROM vw_dashboard_summary`),
        db.query<{ date: string; total: string }>(
          `
            SELECT date, total
            FROM (
              SELECT
                TO_CHAR(day_ref::date, 'YYYY-MM-DD') AS date,
                COALESCE(day_counts.total_visits, 0)::int AS total
              FROM generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day') AS day_ref
              LEFT JOIN (
                SELECT DATE(created_at) AS visit_date, COUNT(*)::int AS total_visits
                FROM site_visits
                GROUP BY DATE(created_at)
              ) AS day_counts
                ON day_counts.visit_date = DATE(day_ref)
              ORDER BY day_ref ASC
            ) AS trend
          `
        ),
        db.query<{ date: string; total: string }>(
          `
            SELECT
              TO_CHAR(day_ref::date, 'YYYY-MM-DD') AS date,
              COALESCE(day_counts.total_downloads, 0)::int AS total
            FROM generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day') AS day_ref
            LEFT JOIN (
              SELECT DATE(created_at) AS download_date, COUNT(*)::int AS total_downloads
              FROM document_downloads
              GROUP BY DATE(created_at)
            ) AS day_counts
              ON day_counts.download_date = DATE(day_ref)
            ORDER BY day_ref ASC
          `
        ),
        db.query<{
          document_id: string;
          title: string;
          document_type: string;
          total_downloads: string;
          last_download_at: string;
        }>(
          `
            SELECT
              d.code AS document_id,
              d.title,
              UPPER(d.document_type) AS document_type,
              COUNT(dd.id)::int AS total_downloads,
              MAX(dd.created_at) AS last_download_at
            FROM documents d
            INNER JOIN document_downloads dd
              ON dd.document_id = d.id
            GROUP BY d.code, d.title, d.document_type
            ORDER BY COUNT(dd.id) DESC, MAX(dd.created_at) DESC
            LIMIT 8
          `
        ),
        db.query<{
          id: string;
          visitor_key: string;
          document_code: string;
          title: string;
          file_path: string;
          file_type: string;
          area: string | null;
          downloaded_at: string;
        }>(
          `
            SELECT
              dd.id::text AS id,
              v.visitor_key,
              d.code AS document_code,
              d.title,
              d.file_path,
              UPPER(d.document_type) AS file_type,
              d.area,
              dd.created_at AS downloaded_at
            FROM document_downloads dd
            INNER JOIN documents d
              ON d.id = dd.document_id
            INNER JOIN visitors v
              ON v.id = dd.visitor_id
            ORDER BY dd.created_at DESC
            LIMIT 12
          `
        ),
        db.query<{
          id: string;
          visitor_key: string;
          path: string;
          referrer: string | null;
          user_agent: string | null;
          ip_address: string | null;
          visited_at: string;
        }>(
          `
            SELECT
              sv.id::text AS id,
              v.visitor_key,
              sv.path,
              sv.referrer,
              sv.user_agent,
              sv.ip_address,
              sv.created_at AS visited_at
            FROM site_visits sv
            INNER JOIN visitors v
              ON v.id = sv.visitor_id
            ORDER BY sv.created_at DESC
            LIMIT 12
          `
        ),
      ]);

    const summary = summaryResult.rows[0];

    return {
      summary: {
        totalVisits: Number(summary?.total_visits ?? 0),
        uniqueVisitors: Number(summary?.total_visitors ?? 0),
        totalDownloads: Number(summary?.total_downloads ?? 0),
        documentsTracked: Number(summary?.active_documents ?? 0),
        lastVisitAt: summary?.last_visit_at ?? null,
        lastDownloadAt: summary?.last_download_at ?? null,
      },
      trends: {
        visitsByDay: visitsTrendResult.rows.map((row) => ({
          date: row.date,
          total: Number(row.total),
        })),
        downloadsByDay: downloadsTrendResult.rows.map((row) => ({
          date: row.date,
          total: Number(row.total),
        })),
      },
      topDocuments: topDocumentsResult.rows.map((row) => ({
        documentId: row.document_id,
        title: row.title,
        fileType: row.document_type,
        totalDownloads: Number(row.total_downloads),
        lastDownloadedAt: row.last_download_at,
      })),
      recentDownloads: recentDownloadsResult.rows.map((row) => ({
        id: row.id,
        visitorId: row.visitor_key,
        documentId: row.document_code,
        title: row.title,
        filePath: row.file_path,
        fileType: row.file_type,
        area: row.area,
        downloadedAt: row.downloaded_at,
      })),
      recentVisits: recentVisitsResult.rows.map((row) => ({
        id: row.id,
        visitorId: row.visitor_key,
        path: row.path,
        referrer: row.referrer,
        userAgent: row.user_agent ?? "unknown",
        ipAddress: row.ip_address ?? "unknown",
        visitedAt: row.visited_at,
      })),
    } satisfies DashboardSnapshot;
  }

  private async ensureVisitor(visitorKey: string) {
    const result = await db.query<{ id: string }>(
      `
        INSERT INTO visitors (visitor_key, first_seen_at, last_seen_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (visitor_key)
        DO UPDATE SET last_seen_at = NOW()
        RETURNING id::text
      `,
      [visitorKey]
    );

    return Number(result.rows[0].id);
  }

  private async recordAdminActivity(adminUserId: number, action: string, description: string) {
    await db.query(
      `
        INSERT INTO admin_activity (admin_user_id, action, description)
        VALUES ($1, $2, $3)
      `,
      [adminUserId, action, description]
    );
  }

  private mapManagedAdmin(row: {
    id: number;
    username: string | null;
    login_name: string;
    email: string | null;
    display_name: string | null;
    role: AdminRole;
    active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }) {
    return {
      id: row.id,
      username: row.username ?? row.login_name,
      loginName: row.login_name,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies ManagedAdminUser;
  }

  private assertPasswordPolicy(password: string) {
    const hasMinLength = password.length >= 10;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasSpecialCharacter = /[^A-Za-z0-9]/.test(password);

    if (hasMinLength && hasUppercase && hasLowercase && hasSpecialCharacter) {
      return;
    }

    throw new Error(
      "La nueva contrasena debe tener al menos 10 caracteres, una mayuscula, una minuscula y un caracter especial."
    );
  }
}
