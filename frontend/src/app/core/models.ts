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
