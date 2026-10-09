import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { syncGroupMembers } from '../services/membershipSync.js';
import { isValidId } from '../services/recipientResolver.js';

export const groupsRouter = Router();

/**
 * POST /groups/:groupId/sync-members
 * Recalcula o espelho de integrantes no RTDB a partir do Firestore. É idempotente e
 * não aceita dados do cliente: qualquer usuário autenticado pode disparar, mas o
 * resultado depende apenas do documento do grupo (inclusive quem acabou de sair).
 */
groupsRouter.post('/:groupId/sync-members', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupId = req.params.groupId;
    if (!isValidId(groupId) || groupId.startsWith('dm_')) {
      throw new HttpError(400, 'invalid-group', 'Grupo inválido.');
    }
    const result = await syncGroupMembers(groupId);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
