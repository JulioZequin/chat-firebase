import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** `false` quando o aparelho está sem internet. */
export function useConnectivity(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return online;
}
