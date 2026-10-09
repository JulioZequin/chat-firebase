import { useEffect, useMemo, useState } from 'react';
import { observeUserDirectory } from '../services/userService';
import type { PublicUser } from '../types/user';
import { toUserMessage } from '../utils/errors';

export type UserDirectory = {
  users: PublicUser[];
  byId: ReadonlyMap<string, PublicUser>;
  loading: boolean;
  error: string | null;
};

export function useUserDirectory(): UserDirectory {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = observeUserDirectory(
      (next) => {
        setUsers(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(toUserMessage(err, 'Não foi possível carregar os usuários.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const byId = useMemo(() => new Map(users.map((u) => [u.uid, u] as const)), [users]);

  return { users, byId, loading, error };
}
