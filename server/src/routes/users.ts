import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { canViewProfile, loadProfile } from '../services/profileAccess.js';
import { isValidId } from '../services/recipientResolver.js';

export const usersRouter = Router();

/** GET /users/:uid/profile — dados cadastrais somente para quem compartilha conversa/grupo. */
usersRouter.get('/:uid/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUid = req.params.uid;
    if (!isValidId(targetUid)) throw new HttpError(400, 'invalid-uid', 'Usuário inválido.');
    if (!(await canViewProfile(res.locals.uid, targetUid))) {
      throw new HttpError(403, 'no-shared-conversation', 'Você não compartilha uma conversa com este usuário.');
    }
    const profile = await loadProfile(targetUid);
    if (!profile) throw new HttpError(404, 'user-not-found', 'Usuário não encontrado.');
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
});
