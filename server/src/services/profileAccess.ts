import { firebase } from './firebaseAdmin.js';

function directId(a: string, b: string): string {
  const [first, second] = a < b ? [a, b] : [b, a];
  return `dm_${first}_${second}`;
}

/**
 * Regra de privacidade dos dados cadastrais: só pode ver o perfil quem compartilha
 * uma conversa individual ou um grupo com o usuário consultado (ou o próprio usuário).
 * Como envolve conversas individuais e grupos, a validação é feita aqui na API.
 */
export async function canViewProfile(viewerUid: string, targetUid: string): Promise<boolean> {
  if (viewerUid === targetUid) return true;
  const { firestore } = firebase();
  const direct = await firestore.collection('directConversations').doc(directId(viewerUid, targetUid)).get();
  if (direct.exists) return true;
  const groups = await firestore.collection('groups').where('memberIds', 'array-contains', viewerUid).get();
  return groups.docs.some((doc) => {
    const members: unknown = doc.get('memberIds');
    return Array.isArray(members) && members.includes(targetUid);
  });
}

export type ProfileResponse = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export async function loadProfile(uid: string): Promise<ProfileResponse | null> {
  const { firestore } = firebase();
  const userRef = firestore.collection('users').doc(uid);
  const [publicSnap, privateSnap] = await Promise.all([userRef.get(), userRef.collection('private').doc('profile').get()]);
  if (!publicSnap.exists) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    uid,
    name: str(publicSnap.get('name')),
    photoUrl: str(publicSnap.get('photoUrl')),
    createdAt: typeof publicSnap.get('createdAt') === 'number' ? (publicSnap.get('createdAt') as number) : 0,
    email: str(privateSnap.get('email')),
    phoneNumber: str(privateSnap.get('phoneNumber')),
    birthDate: str(privateSnap.get('birthDate')),
  };
}
