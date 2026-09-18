import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
} from "axios";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const AI_API_BASE_URL =
  process.env.NEXT_PUBLIC_AI_API_URL ||
  "http://localhost:8000";

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
  data?: any;
}

// ============================================================
// LOGGING
// ============================================================

const API_LOG_PREFIX =
  "[NDAO-HIFANOSIKA API]";

const AI_LOG_PREFIX =
  "[NDAO-HIFANOSIKA AI]";

function getTimestamp(): string {
  return new Date().toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

// ============================================================
// SÉCURISATION DES LOGS
// ============================================================

function sanitizeData(data: any): any {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      sanitizeData(item)
    );
  }

  const sanitized = {
    ...data,
  };

  const sensitiveFields = [
    "password",
    "newPassword",
    "confirmPassword",
    "confirmNewPassword",
    "accessToken",
    "refreshToken",
    "token",
    "authorization",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "********";
    }
  }

  return sanitized;
}

// ============================================================
// SERVICE API
// ============================================================

class ApiService {
  private client: AxiosInstance;
  private aiClient: AxiosInstance;

  constructor() {
    // ========================================================
    // API PRINCIPALE
    // ========================================================

    this.client = axios.create({
      baseURL: API_BASE_URL,

      headers: {
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
      },

      timeout: 30000,
    });

    // ========================================================
    // API IA
    // ========================================================

    this.aiClient = axios.create({
      baseURL: AI_API_BASE_URL,

      headers: {
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
      },

      timeout: 60000,
    });

    // ========================================================
    // REQUEST — API PRINCIPALE
    // ========================================================

    this.client.interceptors.request.use(
      (config) => {
        const token =
          this.getToken();

        if (token) {
          config.headers.Authorization =
            `Bearer ${token}`;
        }

        const method =
          config.method?.toUpperCase() ||
          "GET";

        const url =
          `${config.baseURL || ""}${config.url || ""}`;

        console.groupCollapsed(
          `${API_LOG_PREFIX} ${method} ${url}`
        );

        console.log(
          "🕐 Heure :",
          getTimestamp()
        );

        console.log(
          "➡️ Méthode :",
          method
        );

        console.log(
          "🌐 URL :",
          url
        );

        if (config.params) {
          console.log(
            "🔎 Params :",
            sanitizeData(
              config.params
            )
          );
        }

        if (config.data) {
          console.log(
            "📦 Données :",
            sanitizeData(
              config.data
            )
          );
        }

        console.log(
          "🔐 Token :",
          token
            ? "Présent"
            : "Absent"
        );

        console.groupEnd();

        return config;
      },

      (error) => {
        console.error(
          `${API_LOG_PREFIX} ❌ Erreur préparation requête`,
          error
        );

        return Promise.reject(
          error
        );
      }
    );

    // ========================================================
    // REQUEST — API IA
    // ========================================================

    this.aiClient.interceptors.request.use(
      (config) => {
        const token =
          this.getToken();

        if (token) {
          config.headers.Authorization =
            `Bearer ${token}`;
        }

        const method =
          config.method?.toUpperCase() ||
          "GET";

        const url =
          `${config.baseURL || ""}${config.url || ""}`;

        console.groupCollapsed(
          `${AI_LOG_PREFIX} ${method} ${url}`
        );

        console.log(
          "🕐 Heure :",
          getTimestamp()
        );

        console.log(
          "➡️ Méthode :",
          method
        );

        console.log(
          "🤖 URL IA :",
          url
        );

        if (config.params) {
          console.log(
            "🔎 Params :",
            sanitizeData(
              config.params
            )
          );
        }

        if (config.data) {
          console.log(
            "📦 Données IA :",
            sanitizeData(
              config.data
            )
          );
        }

        console.groupEnd();

        return config;
      },

      (error) => {
        console.error(
          `${AI_LOG_PREFIX} ❌ Erreur préparation requête`,
          error
        );

        return Promise.reject(
          error
        );
      }
    );

    // ========================================================
    // RESPONSE — API PRINCIPALE
    // ========================================================

    this.client.interceptors.response.use(
      (response) => {
        const method =
          response.config.method?.toUpperCase() ||
          "GET";

        const url =
          `${response.config.baseURL || ""}${response.config.url || ""}`;

        console.groupCollapsed(
          `${API_LOG_PREFIX} ✅ ${method} ${url}`
        );

        console.log(
          "🕐 Heure :",
          getTimestamp()
        );

        console.log(
          "📊 Status :",
          response.status
        );

        console.log(
          "📥 Réponse :",
          sanitizeData(
            response.data
          )
        );

        console.groupEnd();

        return response;
      },

      this.handleError.bind(this)
    );

    // ========================================================
    // RESPONSE — API IA
    // ========================================================

    this.aiClient.interceptors.response.use(
      (response) => {
        const method =
          response.config.method?.toUpperCase() ||
          "GET";

        const url =
          `${response.config.baseURL || ""}${response.config.url || ""}`;

        console.groupCollapsed(
          `${AI_LOG_PREFIX} ✅ ${method} ${url}`
        );

        console.log(
          "🕐 Heure :",
          getTimestamp()
        );

        console.log(
          "📊 Status :",
          response.status
        );

        console.log(
          "📥 Réponse IA :",
          sanitizeData(
            response.data
          )
        );

        console.groupEnd();

        return response;
      },

      this.handleAIError.bind(this)
    );
  }

  // ============================================================
  // TOKEN
  // ============================================================

  private getToken(): string | null {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    return localStorage.getItem(
      "accessToken"
    );
  }

  // ============================================================
  // ERREUR API
  // ============================================================

  private handleError(
    error: AxiosError
  ): Promise<never> {
    const status =
      error.response?.status ||
      500;

    const serverData =
      error.response?.data as any;

    const apiError: ApiError = {
      status,

      message:
        serverData?.message ||
        serverData?.error ||
        serverData?.detail ||
        "Une erreur est survenue",

      errors:
        serverData?.errors,

      data:
        serverData,
    };

    const method =
      error.config?.method?.toUpperCase() ||
      "UNKNOWN";

    const url =
      `${error.config?.baseURL || ""}${error.config?.url || ""}`;

    console.groupCollapsed(
      `${API_LOG_PREFIX} ❌ ${method} ${url}`
    );

    console.error(
      "🕐 Heure :",
      getTimestamp()
    );

    console.error(
      "📊 Status :",
      status
    );

    console.error(
      "💬 Message :",
      apiError.message
    );

    if (apiError.errors) {
      console.error(
        "⚠️ Erreurs :",
        apiError.errors
      );
    }

    console.error(
      "📥 Réponse serveur :",
      sanitizeData(
        serverData
      )
    );

    console.groupEnd();

    // ========================================================
    // TOKEN INVALIDE
    // ========================================================

    if (status === 401) {
      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        localStorage.removeItem(
          "user"
        );

        window.location.href =
          "/login";
      }
    }

    return Promise.reject(
      apiError
    );
  }

  // ============================================================
  // ERREUR IA
  // ============================================================

  private handleAIError(
    error: AxiosError
  ): Promise<never> {
    const status =
      error.response?.status ||
      500;

    const serverData =
      error.response?.data as any;

    const apiError: ApiError = {
      status,

      message:
        serverData?.message ||
        serverData?.detail ||
        serverData?.error ||
        "Une erreur est survenue avec le service IA",

      errors:
        serverData?.errors,

      data:
        serverData,
    };

    const method =
      error.config?.method?.toUpperCase() ||
      "UNKNOWN";

    const url =
      `${error.config?.baseURL || ""}${error.config?.url || ""}`;

    console.groupCollapsed(
      `${AI_LOG_PREFIX} ❌ ${method} ${url}`
    );

    console.error(
      "🕐 Heure :",
      getTimestamp()
    );

    console.error(
      "📊 Status :",
      status
    );

    console.error(
      "💬 Message :",
      apiError.message
    );

    console.error(
      "📥 Réponse IA :",
      sanitizeData(
        serverData
      )
    );

    console.groupEnd();

    if (status === 401) {
      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        localStorage.removeItem(
          "user"
        );

        window.location.href =
          "/login";
      }
    }

    return Promise.reject(
      apiError
    );
  }

  // ============================================================
  // GET
  // ============================================================

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client
      .get<ApiResponse<T>>(
        url,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // POST
  // ============================================================

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client
      .post<ApiResponse<T>>(
        url,
        data,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // PUT
  // ============================================================

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client
      .put<ApiResponse<T>>(
        url,
        data,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // PATCH
  // ============================================================

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client
      .patch<ApiResponse<T>>(
        url,
        data,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // DELETE
  // ============================================================

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client
      .delete<ApiResponse<T>>(
        url,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // AI GET
  // ============================================================

  async aiGet<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.aiClient
      .get<T>(
        url,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // AI POST
  // ============================================================

  async aiPost<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.aiClient
      .post<T>(
        url,
        data,
        config
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // UPLOAD
  // ============================================================

  async upload<T = any>(
    url: string,
    file: File,
    fieldName: string = "file"
  ): Promise<ApiResponse<T>> {
    const formData =
      new FormData();

    formData.append(
      fieldName,
      file
    );

    return this.client
      .post<ApiResponse<T>>(
        url,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      )
      .then(
        (response) =>
          response.data
      );
  }

  // ============================================================
  // UPLOAD MULTIPLE
  // ============================================================

  async uploadMultiple<T = any>(
    url: string,
    files: File[],
    fieldName: string = "files"
  ): Promise<ApiResponse<T>> {
    const formData =
      new FormData();

    files.forEach((file) => {
      formData.append(
        fieldName,
        file
      );
    });

    return this.client
      .post<ApiResponse<T>>(
        url,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      )
      .then(
        (response) =>
          response.data
      );
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const api =
  new ApiService();

export default api;