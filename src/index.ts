import * as dotenv from 'dotenv';
import express, { json, Request, Response, urlencoded } from 'express';
import cors from 'cors';
import registerRoutes from './routes.js';
import registerSession from './session.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializedSequelize } from './sequelize.js';
import hidePoweredBy from 'hide-powered-by';
import helmet from 'helmet';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerOptions } from './openApi/swagger.js';

dotenv.config();

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

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req: Request, res: Response) => {
  res.status(404).send('Route not found');
});

app.use((err: any, req: Request, res: Response) => {
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

export { io, app };
