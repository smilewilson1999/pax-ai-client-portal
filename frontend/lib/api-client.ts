// Authenticated API client for backend communication
import config from "./config";

const getApiUrl = () => config.apiUrl;

export const createApiClient = (token: string | null) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const client = {
    get: async <T>(endpoint: string): Promise<T> => {
      const response = await fetch(`${getApiUrl()}${endpoint}`, { headers });
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    },

    post: async <T>(endpoint: string, body: any): Promise<T> => {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    },

    patch: async <T>(endpoint: string, body: any): Promise<T> => {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    },

    delete: async (endpoint: string): Promise<void> => {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }
    },

    upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
      const uploadHeaders: HeadersInit = {};
      if (token) {
        uploadHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    },
  };

  return client;
};

export default createApiClient;
