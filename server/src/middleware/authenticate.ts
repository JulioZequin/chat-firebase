import type { NextFunction, Request, Response } from 'express';
import { firebase } from '../services/firebaseAdmin.js';
import { HttpError } from './errorHandler.js';

/**
 * Valida o Firebase ID Token enviado em `Authorization: Bearer <token>` com o Admin SDK
 * e disponibiliza o uid em `res.locals.uid`.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    next(new HttpError(401, 'unauthenticated', 'Token de autenticação ausente.'));
    return;
  }
  try {
    const decoded = await firebase().auth.verifyIdToken(match[1], true);
    if (decoded.firebase.sign_in_provider !== 'password') {
      next(new HttpError(403, 'invalid-provider', 'Somente contas de e-mail e senha são aceitas.'));
      return;
    }
    res.locals.uid = decoded.uid;
    next();
  } catch {
    next(new HttpError(401, 'invalid-token', 'Token inválido ou expirado.'));
  }
}
