import { Router } from 'express';
import { firebase } from '../services/firebaseAdmin.js';

export const healthRouter = Router();
const startedAt = new Date().toISOString();

/** GET /health — verifica se a API está no ar e se o Admin SDK foi inicializado. */
healthRouter.get('/', async (_req, res) => {
  let firebaseStatus: 'ok' | 'error' = 'ok';
  try {
    // Leitura leve no Firestore para confirmar credenciais e conectividade (timeout de 5 s).
    const probe = firebase().firestore.collection('notificationDispatches').limit(1).get();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    await Promise.race([probe, timeout]);
  } catch {
    firebaseStatus = 'error';
  }
  res.status(firebaseStatus === 'ok' ? 200 : 503).json({
    status: firebaseStatus === 'ok' ? 'ok' : 'degraded',
    firebase: firebaseStatus,
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});
