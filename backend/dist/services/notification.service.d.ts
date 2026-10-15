export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationItem = {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: string;
};
export declare function findNotifications(userId?: number): Promise<NotificationItem[]>;
export declare function findNotificationById(id: number): Promise<NotificationItem | null>;
export declare function createNotification(data: {
    userId: number;
    title: string;
    message: string;
    type?: NotificationType;
}): Promise<NotificationItem>;
export declare function markNotificationAsRead(id: number): Promise<NotificationItem | null>;
export declare function markAllNotificationsAsRead(userId?: number): Promise<NotificationItem[]>;
export declare function deleteNotification(id: number): Promise<boolean>;
export declare function getUnreadNotificationCount(userId: number): number;
//# sourceMappingURL=notification.service.d.ts.map