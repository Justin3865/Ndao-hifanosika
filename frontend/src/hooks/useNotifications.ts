// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";
import { notificationService, Notification, NotificationFilters } from "@/services/notification.service";

export interface UseNotificationsReturn {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  getNotification: (id: string) => Promise<Notification | null>;
  markAsRead: (id: string) => Promise<Notification | null>;
  markAsUnread: (id: string) => Promise<Notification | null>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  deleteReadNotifications: () => Promise<boolean>;
  createNotification: (data: any) => Promise<Notification | null>;
  getStats: () => Promise<any>;
  refetch: () => Promise<void>;
  filters: NotificationFilters;
  setFilters: (filters: NotificationFilters) => void;
}

export function useNotifications(initialFilters: NotificationFilters = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchNotifications = useCallback(async (newFilters?: NotificationFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        notificationService.getMyNotifications(currentFilters),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notificationsResponse.notifications);
      setPagination(notificationsResponse.pagination);
      setUnreadCount(unreadCountResponse);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des notifications");
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getNotification = useCallback(async (id: string): Promise<Notification | null> => {
    try {
      return await notificationService.getNotificationById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de la notification");
      return null;
    }
  }, []);

  const markAsRead = useCallback(async (id: string): Promise<Notification | null> => {
    try {
      const updated = await notificationService.markAsRead(id);
      await fetchNotifications();
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors du marquage comme lu");
      return null;
    }
  }, [fetchNotifications]);

  const markAsUnread = useCallback(async (id: string): Promise<Notification | null> => {
    try {
      const updated = await notificationService.markAsUnread(id);
      await fetchNotifications();
      return updated;
    } catch (err: any) {
      setError(err.message || "Erreur lors du marquage comme non lu");
      return null;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors du marquage de toutes les notifications");
      return false;
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      await notificationService.deleteNotification(id);
      await fetchNotifications();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de la notification");
      return false;
    }
  }, [fetchNotifications]);

  const deleteReadNotifications = useCallback(async (): Promise<boolean> => {
    try {
      await notificationService.deleteReadNotifications();
      await fetchNotifications();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression des notifications lues");
      return false;
    }
  }, [fetchNotifications]);

  const createNotification = useCallback(async (data: any): Promise<Notification | null> => {
    try {
      const newNotification = await notificationService.createNotification(data);
      await fetchNotifications();
      return newNotification;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la notification");
      return null;
    }
  }, [fetchNotifications]);

  const getStats = useCallback(async () => {
    try {
      return await notificationService.getMyStats();
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des statistiques");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    error,
    pagination,
    unreadCount,
    fetchNotifications,
    getNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    createNotification,
    getStats,
    refetch,
    filters,
    setFilters,
  };
}