export type AdminRole = 'admin' | 'super_admin';

export interface DownloadItem {
  id: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  role: AdminRole;
  mustChangePassword: boolean;
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

export interface AuthSession {
  token: string;
  user: AdminUser;
}

export interface DashboardSummary {
  totalVisits: number;
  uniqueVisitors: number;
  totalDownloads: number;
  documentsTracked: number;
  lastVisitAt: string | null;
  lastDownloadAt: string | null;
}

export interface DashboardTrendPoint {
  date: string;
  total: number;
}

export interface TopDocument {
  documentId: string;
  title: string;
  fileType: string;
  totalDownloads: number;
  lastDownloadedAt: string;
}

export interface VisitEvent {
  id: string;
  visitorId: string;
  path: string;
  referrer: string | null;
  userAgent: string;
  ipAddress: string;
  visitedAt: string;
}

export interface DownloadEvent {
  id: string;
  visitorId: string;
  documentId: string;
  title: string;
  filePath: string;
  fileType: string;
  area: string | null;
  downloadedAt: string;
}

export interface AdminDashboardSnapshot {
  summary: DashboardSummary;
  trends: {
    visitsByDay: DashboardTrendPoint[];
    downloadsByDay: DashboardTrendPoint[];
  };
  topDocuments: TopDocument[];
  recentDownloads: DownloadEvent[];
  recentVisits: VisitEvent[];
}
