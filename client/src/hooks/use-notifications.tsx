import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NotificationConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'feature_unlock' | 'milestone';
  trigger: string;
  title: string;
  description: string;
  badge?: string;
  emoji?: string;
  buttonText?: string;
}

interface NotificationState {
  isOpen: boolean;
  notification: NotificationConfig | null;
}

export function useNotifications() {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isOpen: false,
    notification: null
  });
  const queryClient = useQueryClient();

  const triggerNotification = async (trigger: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/notifications/trigger", { trigger });
      
      if (response.status === 409) {
        // Notification already shown, silently ignore
        console.log('Notification already shown for trigger:', trigger);
        return false;
      }
      
      const result = await response.json();
      
      if (result.shouldShow && result.notification) {
        setNotificationState({
          isOpen: true,
          notification: result.notification
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to trigger notification:', error);
      return false;
    }
  };

  const closeNotification = async () => {
    if (notificationState.notification) {
      try {
        await apiRequest("POST", "/api/notifications/mark-shown", {
          notificationId: notificationState.notification.id
        });
        
        // Refresh credits in case this affects the user's state
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      } catch (error) {
        console.error('Failed to mark notification as shown:', error);
      }
    }
    
    setNotificationState({
      isOpen: false,
      notification: null
    });
  };

  return {
    notificationState,
    triggerNotification,
    closeNotification
  };
}