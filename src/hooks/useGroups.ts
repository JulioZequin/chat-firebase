import { useCallback, useEffect, useState } from 'react';
import * as groupService from '../services/groupService';
import type { ChatGroup, GroupFormInput } from '../types/group';
import { toUserMessage } from '../utils/errors';

type GroupsState = { groups: ChatGroup[]; loading: boolean; error: string | null };

/** Grupos dos quais o usuário participa, em tempo real. */
export function useMyGroups(uid: string): GroupsState {
  const [state, setState] = useState<GroupsState>({ groups: [], loading: true, error: null });

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    const unsubscribe = groupService.observeMyGroups(
      uid,
      (groups) => setState({ groups, loading: false, error: null }),
      (err) => setState((prev) => ({ ...prev, loading: false, error: toUserMessage(err, 'Não foi possível carregar os grupos.') })),
    );
    return unsubscribe;
  }, [uid]);

  return state;
}

type GroupState = { group: ChatGroup | null; loading: boolean; error: string | null; removed: boolean };

/** Um grupo específico. `removed` = o usuário não tem mais acesso (foi removido ou o grupo não existe). */
export function useGroup(groupId: string | null): GroupState {
  const [state, setState] = useState<GroupState>({ group: null, loading: groupId !== null, error: null, removed: false });

  useEffect(() => {
    if (!groupId) {
      setState({ group: null, loading: false, error: null, removed: false });
      return undefined;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const unsubscribe = groupService.observeGroup(
      groupId,
      (group) => setState({ group, loading: false, error: null, removed: group === null }),
      (err) =>
        setState({
          group: null,
          loading: false,
          error: toUserMessage(err, 'Não foi possível carregar o grupo.'),
          removed: true,
        }),
    );
    return unsubscribe;
  }, [groupId]);

  return state;
}

type Status = { saving: boolean; error: string | null };

/** Ações de gerenciamento do grupo com estados de loading/erro. */
export function useGroupActions(uid: string) {
  const [status, setStatus] = useState<Status>({ saving: false, error: null });

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setStatus({ saving: true, error: null });
    try {
      const result = await action();
      setStatus({ saving: false, error: null });
      return result;
    } catch (err) {
      setStatus({ saving: false, error: toUserMessage(err, 'Não foi possível salvar o grupo.') });
      return null;
    }
  }, []);

  const createGroup = useCallback(
    (input: GroupFormInput) => run(() => groupService.createGroup(uid, input)),
    [run, uid],
  );
  const updateGroup = useCallback(
    (groupId: string, patch: groupService.GroupPatch) => run(() => groupService.updateGroup(groupId, uid, patch).then(() => true)),
    [run, uid],
  );
  const removeMember = useCallback(
    (groupId: string, memberId: string) => run(() => groupService.removeMember(groupId, uid, memberId).then(() => true)),
    [run, uid],
  );
  const leaveGroup = useCallback(
    (groupId: string) => run(() => groupService.leaveGroup(groupId, uid).then(() => true)),
    [run, uid],
  );
  const clearError = useCallback(() => setStatus((prev) => ({ ...prev, error: null })), []);

  return { ...status, createGroup, updateGroup, removeMember, leaveGroup, clearError };
}
