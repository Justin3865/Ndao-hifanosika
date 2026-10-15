"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNotifications = findNotifications;
exports.findNotificationById = findNotificationById;
exports.createNotification = createNotification;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.deleteNotification = deleteNotification;
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const notifications = [];
let nextNotificationId = 1;
async function findNotifications(userId) {
    if (userId === undefined) {
        return notifications;
    }
    return notifications.filter((notification) => notification.userId === userId);
}
async function findNotificationById(id) {
    return (notifications.find((notification) => notification.id === id) ?? null);
}
async function createNotification(data) {
    const notification = {
        id: nextNotificationId++,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type ?? "INFO",
        read: false,
        createdAt: new Date().toISOString(),
    };
    notifications.unshift(notification);
    return notification;
}
async function markNotificationAsRead(id) {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) {
        return null;
    }
    notification.read = true;
    return notification;
}
async function markAllNotificationsAsRead(userId) {
    notifications.forEach((notification) => {
        if (userId === undefined ||
            notification.userId === userId) {
            notification.read = true;
        }
    });
    return notifications;
}
async function deleteNotification(id) {
    const index = notifications.findIndex((notification) => notification.id === id);
    if (index === -1) {
        return false;
    }
    notifications.splice(index, 1);
    return true;
}
function getUnreadNotificationCount(userId) {
    return notifications.filter((notification) => notification.userId === userId &&
        !notification.read).length;
}
//# sourceMappingURL=notification.service.js.map