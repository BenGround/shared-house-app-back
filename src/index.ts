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
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import path from 'path';
import fs from 'fs';

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

const SCHEMAS_DIR = path.join(__dirname, '/openApi/schemas');
const RESPONSES_DIR = path.join(__dirname, '/openApi/responses');

const loadAllYamlSchemas = (dirPath: string) => {
  const schemas: Record<string, any> = {};

  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      if (file.endsWith('.yaml')) {
        const schemaName = path.basename(file, '.yaml');
        const filePath = path.join(dirPath, file);
        try {
          schemas[schemaName] = yaml.load(filePath);
        } catch (error) {
          console.error(`❌ Error loading schema: ${file}`, error);
        }
      }
    });
  } else {
    console.error(`❌ Schemas directory not found: ${dirPath}`);
  }

  return schemas;
};

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shared House API',
      version: '1.0.0',
      description: 'API for a shared house',
    },
    components: {
      schemas: loadAllYamlSchemas(SCHEMAS_DIR),
      responses: loadAllYamlSchemas(RESPONSES_DIR),
    },
  },
  apis: ['./src/modules/**/*controller.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
