import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return context;
}

/** Para telas autenticadas: garante o usuário logado. */
export function useCurrentUid(): string {
  const { user } = useAuth();
  if (!user) throw new Error('Tela protegida acessada sem usuário autenticado.');
  return user.uid;
}
