export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  clerkUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  name: string;
  status: "InProgress" | "ActionRequired" | "Completed";
  templateType: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentNode {
  id: string;
  name: string;
  type: "folder" | "file";
  claimId: string;
  parentId: string | null;
  status: "Uploaded" | "Processing" | "Validated" | "Error";
  fileUrl?: string;
  fileType?: string;
  statusMessage?: string;
  statusIcon?: string;
  createdAt: string;
  updatedAt: string;
  children?: DocumentNode[];
}

export interface ClaimTemplate {
  id: string;
  name: string;
  description: string;
  requiredDocuments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  userId: string;
  createdAt: string;
}

export interface CreateClaimRequest {
  name: string;
  template_id: string;
  status?: "InProgress" | "ActionRequired" | "Completed";
}

export interface UpdateClaimRequest {
  name?: string;
  status?: "InProgress" | "ActionRequired" | "Completed";
}
