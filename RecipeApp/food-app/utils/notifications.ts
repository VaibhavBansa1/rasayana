import { apiClient } from './Auth-Request';
import { Notification } from '../types/notification';

export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get('api/notifications/');
  return response.data;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await apiClient.post(`api/notifications/${id}/mark-read/`,{});
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post('api/notifications/mark-all-read/',{});
};

export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete(`api/notifications/${id}/`);
};

export const registerPushToken = async (pushToken: string): Promise<void> => {
  await apiClient.post('api/notifications/register-push-token/', {
    push_token: pushToken
  });
};