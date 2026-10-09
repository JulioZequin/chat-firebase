import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';
import { firestore } from '../services/firebase';
import { disableCurrentDevice } from '../services/notificationService';
import { parsePublicUser } from '../services/userService';
import type { LoginInput, PublicUser, RegisterInput } from '../types/user';

export type AuthContextValue = {
  user: User | null;
  profile: PublicUser | null;
  initializing: boolean;
  /** true enquanto o cadastro (conta + foto + perfil) está em andamento */
  registering: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [registering, setRegistering] = useState<boolean>(false);

  // Recupera a sessão persistida e acompanha login/logout.
  useEffect(() => {
    const unsubscribe = authService.observeSession((nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Perfil público do usuário logado (nome/foto) em tempo real.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }
    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => setProfile(snapshot.exists() ? parsePublicUser(snapshot.id, snapshot.data()) : null),
      () => setProfile(null),
    );
    return unsubscribe;
  }, [user]);

  const login = useCallback(async (input: LoginInput) => {
    await authService.login(input);
  }, []);

  // Mantém a tela de cadastro montada até o perfil estar salvo; se algo falhar,
  // a conta é desfeita e o erro aparece no próprio formulário.
  const register = useCallback(async (input: RegisterInput) => {
    setRegistering(true);
    try {
      await authService.register(input);
    } finally {
      setRegistering(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const current = user;
    if (current) await disableCurrentDevice(current.uid);
    // signOut dispara onAuthStateChanged(null): as telas protegidas são desmontadas
    // e todos os listeners (Firestore e RTDB) são removidos nos cleanups dos efeitos.
    await authService.logout();
    setProfile(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, initializing, registering, login, register, logout }),
    [user, profile, initializing, registering, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
