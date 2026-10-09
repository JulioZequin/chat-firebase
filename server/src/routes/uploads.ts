import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { cloudinaryConfig, signUpload } from '../services/cloudinary.js';
import { firebase } from '../services/firebaseAdmin.js';
import { isValidId } from '../services/recipientResolver.js';

export const uploadsRouter = Router();

/**
 * POST /uploads/signature
 * Body: { kind: 'user' } → foto de perfil do próprio usuário
 *       { kind: 'group', groupId } → foto do grupo (somente o proprietário)
 * Devolve a assinatura para o app enviar a imagem direto ao Cloudinary.
 */
uploadsRouter.post('/signature', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = cloudinaryConfig();
    if (!cfg) throw new HttpError(503, 'uploads-disabled', 'Envio de imagens não configurado na API.');
    const uid = res.locals.uid;
    const body: unknown = req.body;
    const data = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

    if (data.kind === 'user') {
      res.json(signUpload(cfg, `chatfire/users/${uid}`, 'avatar'));
      return;
    }

    if (data.kind === 'group' && isValidId(data.groupId)) {
      const group = await firebase().firestore.collection('groups').doc(data.groupId).get();
      if (!group.exists) throw new HttpError(404, 'group-not-found', 'Grupo não encontrado.');
      if (group.get('ownerId') !== uid) {
        throw new HttpError(403, 'not-owner', 'Somente o proprietário pode trocar a foto do grupo.');
      }
      res.json(signUpload(cfg, `chatfire/groups/${data.groupId}`, 'photo'));
      return;
    }

    throw new HttpError(400, 'invalid-body', 'Informe kind "user" ou kind "group" com groupId.');
  } catch (error) {
    next(error);
  }
});
