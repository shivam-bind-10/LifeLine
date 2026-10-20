import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { authRouter } from './modules/auth/routes.js';
import { requestRouter } from './modules/requests/routes.js';
import { notificationRouter } from './modules/notifications/routes.js';
import { conversationRouter } from './modules/conversations/routes.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

  app.use(cors({ origin: clientUrl, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1', authRouter);
  app.use('/api/v1/requests', requestRouter);
  app.use('/api/v1/requests', conversationRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use(errorHandler);

  return app;
}
