// src/lib/axios.ts

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { authService } from "@/services/auth.service";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const API_TIMEOUT = 30000;

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
}

// ============================================================
// AXIOS INSTANCE
// ============================================================

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// ============================================================
// REQUEST INTERCEPTOR
// Ajout automatique du Access Token
// ============================================================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ============================================================
// RESPONSE INTERCEPTOR
// Gestion automatique du 401 + refresh token
// ============================================================

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

    // ----------------------------------------------------------
    // Si pas de configuration de requête
    // ----------------------------------------------------------

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // ----------------------------------------------------------
    // Gestion du 401
    // ----------------------------------------------------------

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {
              refreshToken,
            },
          );

          if (
            refreshResponse.data?.success &&
            refreshResponse.data?.data?.accessToken
          ) {
            const newAccessToken =
              refreshResponse.data.data.accessToken;

            // Sauvegarder le nouveau token
            localStorage.setItem(
              "accessToken",
              newAccessToken,
            );

            // Mettre à jour la requête originale
            originalRequest.headers.Authorization =
              `Bearer ${newAccessToken}`;

            // Rejouer la requête
            return axiosInstance(originalRequest);
          }
        }

        // Aucun refresh token valide
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        window.location.href = "/login";
      } catch (refreshError) {
        console.error(
          "Erreur lors du refresh token :",
          refreshError,
        );

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// ============================================================
// GESTION DES ERREURS
// ============================================================

export const handleApiError = (
  error: unknown,
): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    const responseData = axiosError.response?.data as
      | {
          message?: string;
          errors?: string[];
        }
      | undefined;

    return {
      status: axiosError.response?.status || 500,
      message:
        responseData?.message ||
        axiosError.message ||
        "Une erreur est survenue",
      errors: responseData?.errors,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Une erreur est survenue",
  };
};

// ============================================================
// GET
// ============================================================

export const apiGet = async <T = any>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const response =
      await axiosInstance.get<ApiResponse<T>>(
        url,
        config,
      );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================
// POST
// ============================================================

export const apiPost = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const response =
      await axiosInstance.post<ApiResponse<T>>(
        url,
        data,
        config,
      );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================
// PUT
// ============================================================

export const apiPut = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const response =
      await axiosInstance.put<ApiResponse<T>>(
        url,
        data,
        config,
      );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================
// PATCH
// ============================================================

export const apiPatch = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const response =
      await axiosInstance.patch<ApiResponse<T>>(
        url,
        data,
        config,
      );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================
// DELETE
// ============================================================

export const apiDelete = async <T = any>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const response =
      await axiosInstance.delete<ApiResponse<T>>(
        url,
        config,
      );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================
// UPLOAD FICHIER
// ============================================================

export const apiUpload = async <T = any>(
  url: string,
  file: File,
  fieldName: string = "file",
  additionalData?: Record<string, any>,
): Promise<ApiResponse<T>> => {
  const formData = new FormData();

  formData.append(fieldName, file);

  if (additionalData) {
    Object.entries(additionalData).forEach(
      ([key, value]) => {
        formData.append(key, String(value));
      },
    );
  }

  return apiPost<T>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ============================================================
// UPLOAD MULTIPLE
// ============================================================

export const apiUploadMultiple = async <T = any>(
  url: string,
  files: File[],
  fieldName: string = "files",
  additionalData?: Record<string, any>,
): Promise<ApiResponse<T>> => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append(fieldName, file);
  });

  if (additionalData) {
    Object.entries(additionalData).forEach(
      ([key, value]) => {
        formData.append(key, String(value));
      },
    );
  }

  return apiPost<T>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ============================================================
// EXPORT
// ============================================================

export default axiosInstance;