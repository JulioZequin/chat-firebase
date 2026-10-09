import { Linking } from 'react-native';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { ErrorMessage } from './ErrorMessage';

/** Mostra problemas de push: permissão negada, sem token, emulador etc. */
export function NotificationStatusBanner() {
  const { status, retryRegistration } = useNotificationStatus();
  switch (status.state) {
    case 'permission-denied':
      return (
        <ErrorMessage
          tone="warning"
          message="Notificações desativadas. Ative-as nas configurações do aparelho para receber avisos de novas mensagens."
          onRetry={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      );
    case 'unsupported-device':
      return <ErrorMessage tone="warning" message="Push só funciona em dispositivo físico. Neste emulador/simulador você não receberá notificações." />;
    case 'no-token':
      return <ErrorMessage tone="warning" message={`Dispositivo sem token de notificação: ${status.message}`} onRetry={retryRegistration} />;
    case 'error':
      return <ErrorMessage tone="warning" message={status.message} onRetry={retryRegistration} />;
    default:
      return null;
  }
}
