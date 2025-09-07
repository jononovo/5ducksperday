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

interface BadgeConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'milestone' | 'special';
  trigger: string;
  title: string;
  description: string;
  badge: string;
  emoji?: string;
  buttonText?: string;
}

interface NotificationState {
  isOpen: boolean;
  notification: NotificationConfig | null;
  badge: BadgeConfig | null;
}

export function useNotifications() {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isOpen: false,
    notification: null,
    badge: null
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
      
      if (result.shouldShow && (result.notification || result.badge)) {
        setNotificationState({
          isOpen: true,
          notification: result.notification || null,
          badge: result.badge || null
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
    if (notificationState.badge) {
      try {
        await apiRequest("POST", "/api/notifications/mark-shown", {
          badgeId: notificationState.badge.id
        });
        
        // Refresh credits and notification status
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/status"] });
      } catch (error) {
        console.error('Failed to award badge:', error);
      }
    } else if (notificationState.notification) {
      try {
        await apiRequest("POST", "/api/notifications/mark-shown", {
          notificationId: notificationState.notification.id
        });
        
        // Refresh notification status
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/status"] });
      } catch (error) {
        console.error('Failed to mark notification as shown:', error);
      }
    }
    
    setNotificationState({
      isOpen: false,
      notification: null,
      badge: null
    });
  };

  return {
    notificationState,
    triggerNotification,
    closeNotification
  };
}