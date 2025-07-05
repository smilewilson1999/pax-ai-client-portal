import { createApiClient } from "./api-client";
import {
  User,
  Claim,
  DocumentNode,
  ClaimTemplate,
  Notification,
  CreateClaimRequest,
  UpdateClaimRequest,
} from "@/types";

class ApiService {
  private getClient(token: string) {
    return createApiClient(token);
  }

  // User API
  async getCurrentUser(token: string): Promise<User> {
    return this.getClient(token).get<User>("/users/me");
  }

  async updateUser(token: string, userData: Partial<User>): Promise<User> {
    return this.getClient(token).patch<User>("/users/me", userData);
  }

  // Claims API
  async getClaims(token: string): Promise<Claim[]> {
    return this.getClient(token).get<Claim[]>("/claims/");
  }

  async getClaim(token: string, id: string): Promise<Claim | null> {
    return this.getClient(token).get<Claim>(`/claims/${id}`);
  }

  async createClaim(
    token: string,
    claimData: CreateClaimRequest
  ): Promise<Claim> {
    return this.getClient(token).post<Claim>("/claims/", claimData);
  }

  async updateClaim(
    token: string,
    id: string,
    claimData: UpdateClaimRequest
  ): Promise<Claim> {
    return this.getClient(token).patch<Claim>(`/claims/${id}`, claimData);
  }

  async deleteClaim(token: string, id: string): Promise<void> {
    return this.getClient(token).delete(`/claims/${id}`);
  }

  async renameClaim(
    token: string,
    id: string,
    newName: string
  ): Promise<Claim | null> {
    return this.getClient(token).patch<Claim>(`/claims/${id}`, {
      name: newName,
    });
  }

  // Documents API
  async getClaimDocuments(
    token: string,
    claimId: string
  ): Promise<DocumentNode[]> {
    return this.getClient(token).get<DocumentNode[]>(
      `/documents/claims/${claimId}/documents`
    );
  }

  async createFolder(
    token: string,
    claimId: string,
    parentId: string | null,
    name: string
  ): Promise<DocumentNode> {
    const formData = new FormData();
    formData.append("claim_id", claimId);
    if (parentId) formData.append("parent_id", parentId);
    formData.append("name", name);
    return this.getClient(token).upload<DocumentNode>(
      "/documents/folder",
      formData
    );
  }

  async uploadFile(
    token: string,
    claimId: string,
    parentId: string | null,
    file: File
  ): Promise<DocumentNode> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("claim_id", claimId);
    if (parentId) formData.append("parent_id", parentId);
    return this.getClient(token).upload<DocumentNode>(
      "/documents/upload",
      formData
    );
  }

  async renameDocument(
    token: string,
    id: string,
    newName: string
  ): Promise<DocumentNode | null> {
    return this.getClient(token).patch<DocumentNode>(`/documents/${id}`, {
      name: newName,
    });
  }

  async deleteDocument(token: string, id: string): Promise<void> {
    return this.getClient(token).delete(`/documents/${id}`);
  }

  async moveDocument(
    token: string,
    id: string,
    newParentId: string | null
  ): Promise<DocumentNode | null> {
    return this.getClient(token).patch<DocumentNode>(`/documents/${id}/move`, {
      new_parent_id: newParentId,
    });
  }

  async downloadFile(token: string, id: string): Promise<Blob> {
    // Import config here to get the API URL
    const config = await import("./config");
    const response = await fetch(
      `${config.default.apiUrl}/documents/${id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Templates API
  async getClaimTemplates(token: string): Promise<ClaimTemplate[]> {
    return this.getClient(token).get<ClaimTemplate[]>("/templates/");
  }

  // Notifications API
  async getNotifications(token: string): Promise<Notification[]> {
    return this.getClient(token).get<Notification[]>("/notifications/");
  }

  async markNotificationAsRead(token: string, id: string): Promise<void> {
    await this.getClient(token).patch(`/notifications/${id}/read`, {});
  }

  async markAllNotificationsAsRead(token: string): Promise<void> {
    await this.getClient(token).patch("/notifications/mark-all-read", {});
  }
}

export const apiService = new ApiService();
