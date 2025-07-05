import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiService } from "@/lib/api-service";
import {
  User,
  Claim,
  DocumentNode,
  ClaimTemplate,
  Notification,
  CreateClaimRequest,
  UpdateClaimRequest,
} from "@/types";

// User hooks
export function useUser() {
  const { getToken } = useAuth();

  const { data, error, mutate } = useSWR<User>("user", async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return apiService.getCurrentUser(token);
  });

  const updateUser = async (userData: Partial<User>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const updatedUser = await apiService.updateUser(token, userData);
    mutate(updatedUser, false);
    return updatedUser;
  };

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    updateUser,
    mutate,
  };
}

// Claims hooks
export function useClaims() {
  const { getToken } = useAuth();

  const { data, error, mutate } = useSWR<Claim[]>("claims", async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return apiService.getClaims(token);
  });

  const createClaim = async (claimData: CreateClaimRequest) => {
    const token = await getToken();
    console.log(
      "🔑 Frontend token:",
      token ? `${token.substring(0, 20)}...` : "null"
    );
    if (!token) throw new Error("Not authenticated");
    const newClaim = await apiService.createClaim(token, claimData);
    mutate([newClaim, ...(data || [])], false);
    return newClaim;
  };

  const deleteClaim = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await apiService.deleteClaim(token, id);
    mutate(
      data?.filter((claim) => claim.id !== id),
      false
    );
  };

  const renameClaim = async (id: string, newName: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const updatedClaim = await apiService.renameClaim(token, id, newName);
    if (updatedClaim && data) {
      const updatedClaims = data.map((claim) =>
        claim.id === id ? updatedClaim : claim
      );
      mutate(updatedClaims, false);
    }
    return updatedClaim;
  };

  const updateClaim = async (id: string, claimData: UpdateClaimRequest) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const updatedClaim = await apiService.updateClaim(token, id, claimData);
    if (data) {
      const updatedClaims = data.map((claim) =>
        claim.id === id ? updatedClaim : claim
      );
      mutate(updatedClaims, false);
    }
    return updatedClaim;
  };

  return {
    claims: data,
    isLoading: !error && !data,
    isError: error,
    createClaim,
    deleteClaim,
    renameClaim,
    updateClaim,
    mutate,
  };
}

export function useClaim(id: string) {
  const { getToken } = useAuth();

  const { data, error, mutate } = useSWR<Claim | null>(
    id ? `claim-${id}` : null,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return apiService.getClaim(token, id);
    }
  );

  return {
    claim: data,
    isLoading: !error && data === undefined,
    isError: error,
    mutate,
  };
}

// Documents hooks
export function useClaimDocuments(claimId: string) {
  const { getToken } = useAuth();

  const { data, error, mutate } = useSWR<DocumentNode[]>(
    claimId ? `documents-${claimId}` : null,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return apiService.getClaimDocuments(token, claimId);
    }
  );

  const createFolder = async (parentId: string | null, name: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const newFolder = await apiService.createFolder(
      token,
      claimId,
      parentId,
      name
    );
    mutate(); // Refetch to rebuild tree structure
    return newFolder;
  };

  const uploadFile = async (parentId: string | null, file: File) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const newFile = await apiService.uploadFile(token, claimId, parentId, file);
    mutate(); // Refetch to rebuild tree structure
    return newFile;
  };

  const renameDocument = async (id: string, newName: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const updatedDoc = await apiService.renameDocument(token, id, newName);
    if (updatedDoc) {
      mutate(); // Refetch to rebuild tree structure
    }
    return updatedDoc;
  };

  const deleteDocument = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await apiService.deleteDocument(token, id);
    mutate(); // Refetch to rebuild tree structure
  };

  const moveDocument = async (id: string, newParentId: string | null) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const updatedDoc = await apiService.moveDocument(token, id, newParentId);
    if (updatedDoc) {
      mutate(); // Refetch to rebuild tree structure
    }
    return updatedDoc;
  };

  return {
    documents: data,
    isLoading: !error && !data,
    isError: error,
    createFolder,
    uploadFile,
    renameDocument,
    deleteDocument,
    moveDocument,
    mutate,
  };
}

// Templates hooks
export function useClaimTemplates() {
  const { getToken } = useAuth();

  const { data, error } = useSWR<ClaimTemplate[]>("templates", async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return apiService.getClaimTemplates(token);
  });

  return {
    templates: data,
    isLoading: !error && !data,
    isError: error,
  };
}

// Notifications hooks
export function useNotifications() {
  const { getToken } = useAuth();

  const { data, error, mutate } = useSWR<Notification[]>(
    "notifications",
    async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return apiService.getNotifications(token);
    }
  );

  const markAsRead = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await apiService.markNotificationAsRead(token, id);
    if (data) {
      const updatedNotifications = data.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      mutate(updatedNotifications, false);
    }
  };

  const markAllAsRead = async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await apiService.markAllNotificationsAsRead(token);
    if (data) {
      const updatedNotifications = data.map((n) => ({ ...n, isRead: true }));
      mutate(updatedNotifications, false);
    }
  };

  const unreadCount = data?.filter((n) => !n.isRead).length || 0;

  return {
    notifications: data,
    isLoading: !error && !data,
    isError: error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    mutate,
  };
}
