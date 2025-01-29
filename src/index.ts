import * as dotenv from 'dotenv';
dotenv.config();
import express, { json, Request, Response, urlencoded } from 'express';
import cors from 'cors';
import registerRoutes from './routes';
import registerSession from './session';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializedSequelize } from './sequelize';

const port = Number(process.env.PORT) || 3000;
const app: express.Express = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONT_URL,
    credentials: true,
  }),
);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('trust proxy', 1);

app.use(json());

app.use(urlencoded({ extended: true }));

// use helmet security middlewares
//app.use(hidePoweredBy());
//app.use(noSniff());
//app.use(xssFilter());

registerSession(app, initializedSequelize);
registerRoutes(app);

app.use((req: Request, res: Response) => {
  res.status(404).send('Route not found');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});

export { io };
