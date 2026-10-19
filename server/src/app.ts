import cors from 'cors';
import express from 'express';

export function createApp() {
  const app = express();
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

  app.use(cors({ origin: clientUrl }));
  app.use(express.json());

  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  return app;
}
