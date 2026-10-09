import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { groupsRouter } from './routes/groups.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { uploadsRouter } from './routes/uploads.js';
import { usersRouter } from './routes/users.js';

/** Configura middlewares e rotas no app Express recebido. */
export function createApp(app: Express = express()): Express {
  app.set('trust proxy', 1); // atrás do proxy HTTPS da hospedagem (Vercel)
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'ChatFire API',
      endpoints: [
        'GET  /health',
        'POST /notifications/messages',
        'POST /groups/:groupId/sync-members',
        'GET  /users/:uid/profile',
        'POST /uploads/signature',
      ],
    });
  });
  app.use('/health', healthRouter);

  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/notifications', notificationsRouter);
  app.use('/groups', groupsRouter);
  app.use('/users', usersRouter);
  app.use('/uploads', uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
