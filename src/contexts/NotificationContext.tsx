import { createContext, useContext } from 'react';
import type { NotificationRegistrationStatus } from '../types/notification';

export type NotificationContextValue = {
  status: NotificationRegistrationStatus;
  retryRegistration: () => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextValue>({
  status: { state: 'idle' },
  retryRegistration: async () => undefined,
});

export function useNotificationStatus(): NotificationContextValue {
  return useContext(NotificationContext);
}
