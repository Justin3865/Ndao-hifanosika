// src/services/notification.service.ts
import api, { ApiResponse } from "./api";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category: "evaluation" | "project" | "report" | "member" | "beneficiary" | "ai" | "system";
  read: boolean;
  userId: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  read?: boolean;
  type?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface NotificationCreateData {
  title: string;
  message: string;
  type: string;
  category: string;
  userId: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
}

export interface NotificationUpdateData {
  read?: boolean;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

class NotificationService {
  private readonly basePath = "/notifications";

  // Récupérer les notifications
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}?${queryParams.toString()}`;
    const response = await api.get<{ notifications: Notification[] }>(url);
    
    return {
      notifications: response.data?.notifications || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getNotificationById(id: string): Promise<Notification> {
    const response = await api.get<Notification>(`${this.basePath}/${id}`);
    return response.data!;
  }

  async createNotification(data: NotificationCreateData): Promise<Notification> {
    const response = await api.post<Notification>(this.basePath, data);
    return response.data!;
  }

  async updateNotification(id: string, data: NotificationUpdateData): Promise<Notification> {
    const response = await api.patch<Notification>(`${this.basePath}/${id}`, data);
    return response.data!;
  }

  async deleteNotification(id: string): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/${id}`);
  }

  // Marquer comme lu/non lu
  async markAsRead(id: string): Promise<Notification> {
    const response = await api.patch<Notification>(`${this.basePath}/${id}/read`);
    return response.data!;
  }

  async markAsUnread(id: string): Promise<Notification> {
    const response = await api.patch<Notification>(`${this.basePath}/${id}/unread`);
    return response.data!;
  }

  async markAllAsRead(): Promise<ApiResponse> {
    return api.post(`${this.basePath}/mark-all-read`);
  }

  // Notifications de l'utilisateur connecté
  async getMyNotifications(filters: Omit<NotificationFilters, "userId"> = {}): Promise<{
    notifications: Notification[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.basePath}/me?${queryParams.toString()}`;
    const response = await api.get<{ notifications: Notification[] }>(url);
    
    return {
      notifications: response.data?.notifications || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>(`${this.basePath}/unread-count`);
    return response.data?.count || 0;
  }

  // Notifications par utilisateur
  async getNotificationsByUser(userId: string, filters: Omit<NotificationFilters, "userId"> = {}): Promise<Notification[]> {
    const response = await api.get<{ notifications: Notification[] }>(`${this.basePath}/user/${userId}`, {
      params: filters,
    });
    return response.data?.notifications || [];
  }

  // Notifications par catégorie
  async getNotificationsByCategory(category: string): Promise<Notification[]> {
    const response = await api.get<{ notifications: Notification[] }>(`${this.basePath}/category/${category}`);
    return response.data?.notifications || [];
  }

  // Statistiques
  async getNotificationStats(): Promise<NotificationStats> {
    const response = await api.get<NotificationStats>(`${this.basePath}/stats`);
    return response.data!;
  }

  async getMyStats(): Promise<NotificationStats> {
    const response = await api.get<NotificationStats>(`${this.basePath}/my-stats`);
    return response.data!;
  }

  // Envoyer des notifications en masse
  async sendBulkNotifications(data: Omit<NotificationCreateData, "userId"> & { userIds: string[] }): Promise<ApiResponse> {
    return api.post(`${this.basePath}/bulk`, data);
  }

  // Supprimer les notifications lues
  async deleteReadNotifications(): Promise<ApiResponse> {
    return api.delete(`${this.basePath}/delete-read`);
  }
}

// Singleton
export const notificationService = new NotificationService();

export default notificationService;