/**
 * O Metro resolve `firebase/auth` pela condição "react-native", que exporta
 * `getReactNativePersistence`. Os tipos públicos do pacote não incluem essa
 * função, então declaramos a assinatura aqui (sem usar `any`).
 */
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
