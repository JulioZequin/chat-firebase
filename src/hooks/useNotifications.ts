import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { navigationRef } from '../navigation/navigationRef';
import { extractPayload, listenTokenRefresh, registerDevice } from '../services/notificationService';
import type { NotificationPayload, NotificationRegistrationStatus } from '../types/notification';

function openConversation(payload: NotificationPayload): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate('Chat', {
    conversationId: payload.conversationId,
    conversationType: payload.conversationType,
  });
  return true;
}

/**
 * Registra o dispositivo para push e trata o toque nas notificações
 * (app aberto, em segundo plano ou iniciado a partir da notificação).
 */
export function useNotifications(uid: string) {
  const [status, setStatus] = useState<NotificationRegistrationStatus>({ state: 'idle' });
  const handledIds = useRef<Set<string>>(new Set());
  const pending = useRef<NotificationPayload | null>(null);

  const register = useCallback(async () => {
    setStatus({ state: 'registering' });
    setStatus(await registerDevice(uid));
  }, [uid]);

  useEffect(() => {
    register();
    const stopTokenRefresh = listenTokenRefresh(uid);
    return stopTokenRefresh;
  }, [register, uid]);

  // Cobre o "cold start" (app aberto pela notificação) e toques posteriores.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledIds.current.has(id)) return;
    handledIds.current.add(id);
    const payload = extractPayload(lastResponse.notification);
    if (!payload) return;
    if (!openConversation(payload)) pending.current = payload;
    Notifications.clearLastNotificationResponse();
  }, [lastResponse]);

  /** Chamado quando o NavigationContainer fica pronto. */
  const flushPending = useCallback(() => {
    if (pending.current && openConversation(pending.current)) pending.current = null;
  }, []);

  return { status, retryRegistration: register, flushPending };
}
