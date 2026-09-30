import './load-env';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env, features } from './env';
import { RoomManager } from './rooms';
import { apiRoutes } from './api';
import { billingRoutes, stripeWebhook } from './billing';
import type { IO } from './room';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const corsOptions = { origin: env.webOrigins, credentials: true };
app.use(cors(corsOptions));

const httpServer = createServer(app);
const io: IO = new Server(httpServer, {
  cors: corsOptions,
  pingInterval: 20_000,
  pingTimeout: 20_000,
});
const rooms = new RoomManager(io);

app.use(stripeWebhook(rooms));
app.use(express.json({ limit: '32kb' }));
app.use(apiRoutes(rooms));
app.use(billingRoutes(rooms));
app.get('/', (_req, res) => res.type('text').send('Take 6 Online game server'));

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[http]', error);
  res.status(500).json({ error: 'Something went wrong.' });
});

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`[server] listening on :${env.port}`);
  console.log(`[server] features`, features, `bots=${env.botEngine}`, `origins=${env.webOrigins.join(',')}`);
});

const shutdown = () => {
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => console.error('[server] unhandled rejection', reason));
