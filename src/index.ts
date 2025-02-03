import * as dotenv from 'dotenv';
dotenv.config();
import express, { json, Request, Response, urlencoded } from 'express';
import cors from 'cors';
import registerRoutes from './routes';
import registerSession from './session';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializedSequelize } from './sequelize';
import hidePoweredBy from 'hide-powered-by';
import helmet from 'helmet';

const port = Number(process.env.PORT) || 3000;
const app: express.Express = express();

app.use(hidePoweredBy());
app.use(helmet());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.FRONT_URL,
    credentials: true,
  }),
);

registerSession(app, initializedSequelize);
registerRoutes(app);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use((req: Request, res: Response) => {
  res.status(404).send('Route not found');
});

app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err);
  res.status(500).send('Something went wrong!');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
});

export { io };
