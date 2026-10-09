import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  policyUpdatedBy: string;
  createdAt: number;
  updatedAt: number;
};

/** Formato gravado no Firestore (o id é o próprio id do documento). */
export type ChatGroupDocument = Omit<ChatGroup, 'id'>;

export type GroupFormInput = {
  name: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  photoUri: string | null;
};
