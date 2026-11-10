import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { env } from "./config/env";
import { createAdminToken } from "./lib/auth";
import { authenticateWithLdap, isLdapEnabled } from "./lib/ldap-auth";
import { requireAdminAuth, requireSuperAdmin, type AuthenticatedRequest } from "./middleware/auth";
import { PortalRepository } from "./lib/portal-repository";

const app = express();
const portalRepository = new PortalRepository();
const uploadDirectory = path.resolve(env.uploadDir);
const contentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

app.set("trust proxy", true);

const corsOptions =
  env.corsOrigin === "*"
    ? { origin: true }
    : {
        origin: env.corsOrigin.split(",").map((origin) => origin.trim()),
      };

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/public/files", express.static(uploadDirectory));

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

app.get("/api/admin/content", requireAdminAuth, async (_req, res) => {
  res.json(await portalRepository.listManagedContent());
});

app.post(
  "/api/admin/documents",
  requireAdminAuth,
  contentUpload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    const { title, description, area, kind } = req.body as {
      title?: string;
      description?: string;
      area?: string;
      kind?: "form" | "spec";
    };
    const file = req.file;

    if (!title?.trim() || !file || !["form", "spec"].includes(kind ?? "")) {
      return res.status(400).json({ message: "Titulo, tipo de contenido y archivo son requeridos." });
    }

    const contentKind = kind as "form" | "spec";

    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    const allowedExtensions = contentKind === "spec" ? ["pdf"] : ["doc", "docx", "xls", "xlsx", "pdf"];

    if (!allowedExtensions.includes(extension)) {
      return res.status(400).json({
        message:
          contentKind === "spec"
            ? "Las especificaciones deben cargarse en formato PDF."
            : "Formato no permitido. Use PDF, DOC, DOCX, XLS o XLSX.",
      });
    }

    if (contentKind === "spec" && file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "El archivo seleccionado no es un PDF valido." });
    }

    const folder = contentKind === "spec" ? "specs" : "forms";
    const storedFileName = `${randomUUID()}.${extension}`;
    const targetDirectory = path.join(uploadDirectory, folder);
    const targetPath = path.join(targetDirectory, storedFileName);
    const code = `${slugify(title)}-${Date.now()}`;
    const publicPath = `/api/public/files/${folder}/${storedFileName}`;

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, file.buffer, { flag: "wx" });

    try {
      const id = await portalRepository.createManagedDocument({
        code,
        title: title.trim(),
        description: description?.trim() || null,
        documentType: extension,
        fileName: file.originalname,
        filePath: publicPath,
        mimeType: file.mimetype,
        area: area?.trim() || (contentKind === "form" ? "Formularios" : null),
        kind: contentKind,
      });

      res.status(201).json({ id, code, filePath: publicPath });
    } catch (error) {
      await unlink(targetPath).catch(() => undefined);
      throw error;
    }
  }
);

app.post("/api/admin/links", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { title, description, url } = req.body as {
    title?: string;
    description?: string;
    url?: string;
  };

  if (!title?.trim() || !url?.trim()) {
    return res.status(400).json({ message: "Titulo y URL son requeridos." });
  }

  try {
    const parsedUrl = new URL(url.trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("INVALID_URL");
    }
  } catch {
    return res.status(400).json({ message: "Ingrese una URL valida que inicie con http:// o https://." });
  }

  const id = await portalRepository.createManagedLink({
    title: title.trim(),
    description: description?.trim() || null,
    url: url.trim(),
  });

  res.status(201).json({ id });
});

app.delete("/api/admin/documents/:id", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.id);
  if (!Number.isInteger(documentId)) {
    return res.status(400).json({ message: "Identificador de documento invalido." });
  }

  const result = await portalRepository.deleteManagedDocument(documentId);
  if (!result) {
    return res.status(404).json({ message: "Documento no encontrado." });
  }

  if (result.mode === "deleted") {
    await removeManagedUpload(result.filePath);
  }

  res.json(result);
});

app.delete("/api/admin/links/:id", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const linkId = Number(req.params.id);
  if (!Number.isInteger(linkId)) {
    return res.status(400).json({ message: "Identificador de enlace invalido." });
  }

  const deleted = await portalRepository.deleteManagedLink(linkId);
  if (!deleted) {
    return res.status(404).json({ message: "Enlace no encontrado." });
  }

  res.json({ mode: "deleted" });
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
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "El archivo supera el limite de 25 MB." });
    }

    return res.status(400).json({ message: "No fue posible procesar el archivo enviado." });
  }

  console.error(error);
  res.status(500).json({ message: "Ocurrio un error interno del servidor." });
});

async function startServer() {
  const insecureJwtSecrets = new Set([
    "change-this-secret-in-production",
    "replace-with-a-long-random-secret",
  ]);

  if (
    env.nodeEnv === "production" &&
    (insecureJwtSecrets.has(env.jwtSecret) || env.jwtSecret.length < 32)
  ) {
    throw new Error("JWT_SECRET debe configurarse con un valor seguro antes de iniciar produccion.");
  }

  await mkdir(uploadDirectory, { recursive: true });
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

  const accountName = ldapUser.username.split("@")[0];
  const admin =
    (await portalRepository.getAdminUserByLoginName(ldapUser.username)) ??
    (accountName !== ldapUser.username
      ? await portalRepository.getAdminUserByLoginName(accountName)
      : null);

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

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "documento"
  );
}

async function removeManagedUpload(filePath: string) {
  const publicPrefix = "/api/public/files/";
  if (!filePath.startsWith(publicPrefix)) return;

  const relativePath = filePath.slice(publicPrefix.length);
  const absolutePath = path.resolve(uploadDirectory, relativePath);
  const uploadRoot = `${uploadDirectory}${path.sep}`;

  if (!absolutePath.startsWith(uploadRoot)) {
    throw new Error("Ruta de archivo administrado invalida.");
  }

  await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

void startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
