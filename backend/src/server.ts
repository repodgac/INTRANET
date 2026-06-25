import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { createAdminToken } from "./lib/auth";
import { authenticateWithLdap, isLdapEnabled } from "./lib/ldap-auth";
import { requireAdminAuth, requireSuperAdmin, type AuthenticatedRequest } from "./middleware/auth";
import { PortalRepository } from "./lib/portal-repository";

const app = express();
const portalRepository = new PortalRepository();

app.set("trust proxy", true);

const corsOptions =
  env.corsOrigin === "*"
    ? { origin: true }
    : {
        origin: env.corsOrigin.split(",").map((origin) => origin.trim()),
      };

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/public/forms", async (_req, res) => {
  res.json(await portalRepository.getActiveForms());
});

app.get("/api/public/specs", async (_req, res) => {
  res.json(await portalRepository.getActiveSpecs());
});

app.get("/api/public/links", async (_req, res) => {
  res.json(await portalRepository.getActiveLinks());
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y contrasena son requeridos." });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const ldapEnabled = isLdapEnabled();

  const admin = ldapEnabled
    ? await authenticateAdminWithLdap(normalizedUsername, password)
    : await portalRepository.validateAdminCredentials(normalizedUsername, password);

  if (!admin) {
    return res.status(401).json({ message: "Credenciales invalidas." });
  }

  res.json({
    token: createAdminToken({ id: admin.id, loginName: admin.username, role: admin.role }),
    user: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      mustChangePassword: ldapEnabled ? false : admin.mustChangePassword,
    },
  });
});

app.get("/api/auth/me", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.adminUser,
  });
});

app.post("/api/auth/change-password", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  if (isLdapEnabled()) {
    return res.status(400).json({
      message: "La contrasena de este usuario se administra desde el directorio institucional.",
    });
  }

  const { newPassword } = req.body as { newPassword?: string };

  if (!req.adminUser?.id) {
    return res.status(401).json({ message: "Autenticacion requerida." });
  }

  if (!newPassword) {
    return res.status(400).json({ message: "La nueva contrasena es requerida." });
  }

  try {
    const user = await portalRepository.changeAdminPassword(req.adminUser.id, newPassword);

    if (!user) {
      return res.status(404).json({ message: "Administrador no encontrado." });
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("La nueva contrasena")) {
      return res.status(400).json({ message: error.message });
    }

    throw error;
  }
});

app.post("/api/analytics/visit", async (req, res) => {
  const { visitorId, path, referrer } = req.body as {
    visitorId?: string;
    path?: string;
    referrer?: string | null;
  };

  if (!visitorId || !path) {
    return res.status(400).json({ message: "visitorId y path son requeridos." });
  }

  await portalRepository.recordVisit({
    visitorId,
    path,
    referrer: referrer ?? null,
    userAgent: req.header("user-agent") ?? "unknown",
    ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
  });

  res.status(201).json({ status: "recorded" });
});

app.post("/api/analytics/download", async (req, res) => {
  const { visitorId, documentId } = req.body as {
    visitorId?: string;
    documentId?: string;
  };

  if (!visitorId || !documentId) {
    return res.status(400).json({ message: "Faltan datos del documento descargado." });
  }

  try {
    await portalRepository.recordDownload({
      visitorId,
      documentCode: documentId,
      userAgent: req.header("user-agent") ?? "unknown",
      ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_NOT_FOUND") {
      return res.status(404).json({ message: "Documento no encontrado." });
    }

    throw error;
  }

  res.status(201).json({ status: "recorded" });
});

app.get("/api/admin/dashboard", requireAdminAuth, async (_req, res) => {
  res.json(await portalRepository.getDashboardSnapshot());
});

app.get(
  "/api/admin/users",
  requireAdminAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res) => {
    res.json(await portalRepository.listManagedAdmins());
  }
);

app.post(
  "/api/admin/users",
  requireAdminAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    const { username, loginName, email, displayName, role } = req.body as {
      username?: string;
      loginName?: string;
      email?: string | null;
      displayName?: string | null;
      role?: "admin" | "super_admin";
    };

    if (!loginName || !role) {
      return res.status(400).json({ message: "loginName y role son requeridos." });
    }

    try {
      const created = await portalRepository.createManagedAdmin({
        username,
        loginName,
        email,
        displayName,
        role,
        createdBy: req.adminUser!.id,
      });

      res.status(201).json(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ message: "Ya existe un admin autorizado con ese login." });
      }

      throw error;
    }
  }
);

app.put(
  "/api/admin/users/:id",
  requireAdminAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    const adminId = Number(req.params.id);
    const { username, loginName, email, displayName, role, active } = req.body as {
      username?: string;
      loginName?: string;
      email?: string | null;
      displayName?: string | null;
      role?: "admin" | "super_admin";
      active?: boolean;
    };

    if (!Number.isInteger(adminId) || !loginName || !role || typeof active !== "boolean") {
      return res.status(400).json({ message: "Datos incompletos para actualizar el admin." });
    }

    if (req.adminUser?.id === adminId && role !== "super_admin") {
      return res.status(400).json({ message: "No puede retirarse su propio rol de super admin." });
    }

    try {
      const updated = await portalRepository.updateManagedAdmin(adminId, {
        username,
        loginName,
        email,
        displayName,
        role,
        active,
        updatedBy: req.adminUser!.id,
      });

      if (!updated) {
        return res.status(404).json({ message: "Admin no encontrado." });
      }

      res.json(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ message: "Ya existe un admin autorizado con ese login." });
      }

      throw error;
    }
  }
);

app.delete(
  "/api/admin/users/:id",
  requireAdminAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    const adminId = Number(req.params.id);

    if (!Number.isInteger(adminId)) {
      return res.status(400).json({ message: "Identificador invalido." });
    }

    if (req.adminUser?.id === adminId) {
      return res.status(400).json({ message: "No puede eliminar su propio acceso." });
    }

    const deleted = await portalRepository.deleteManagedAdmin(adminId, req.adminUser!.id);

    if (!deleted) {
      return res.status(404).json({ message: "Admin no encontrado." });
    }

    res.json(deleted);
  }
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Ocurrio un error interno del servidor." });
});

async function startServer() {
  await portalRepository.ensureAdminPasswordPolicyColumns();

  app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
  });
}

async function authenticateAdminWithLdap(username: string, password: string) {
  const ldapUser = await authenticateWithLdap(username, password);

  if (!ldapUser) {
    return null;
  }

  const admin = await portalRepository.getAdminUserByLoginName(ldapUser.username);

  if (!admin?.active) {
    return null;
  }

  await portalRepository.recordAdminLogin(admin.id);

  return {
    id: admin.id,
    username: admin.login_name ?? admin.username,
    role: admin.role,
    mustChangePassword: false,
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

void startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
