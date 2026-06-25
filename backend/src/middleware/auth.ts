import { Request, Response, NextFunction } from "express";
import { verifyAdminToken, type AdminRole } from "../lib/auth";
import { isLdapEnabled } from "../lib/ldap-auth";
import { PortalRepository } from "../lib/portal-repository";

export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: number;
    username: string;
    role: AdminRole;
    mustChangePassword: boolean;
  };
}

const portalRepository = new PortalRepository();

export async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autenticacion requerida." });
  }

  const token = authorization.slice("Bearer ".length);
  const payload = verifyAdminToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Sesion invalida o expirada." });
  }

  const admin = await portalRepository.getAdminUserByLoginName(payload.sub);

  if (!admin?.active) {
    return res.status(401).json({ message: "Sesion invalida o expirada." });
  }

  req.adminUser = {
    id: admin.id,
    username: admin.login_name ?? admin.username,
    role: payload.role,
    mustChangePassword: isLdapEnabled() ? false : admin.must_change_password,
  };

  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.adminUser?.role !== "super_admin") {
    return res.status(403).json({ message: "Se requieren privilegios de super administrador." });
  }

  next();
}
