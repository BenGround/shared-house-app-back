import dotenv from 'dotenv';
dotenv.config();
import express, { json, Request, Response, urlencoded } from 'express';
import cors from 'cors';
import registerRoutes from './routes';
import registerSession from './session';
import { intializedSequelize } from './sequelize';

const PORT = process.env.PORT || 3000;
const app: express.Express = express();
app.use(express.json());
/*app.use(
  cors({
    origin: 'http://172.20.10.4:3001',
    credentials: true,
  }),
);*/

app.use(json());

app.use(urlencoded({ extended: true }));

// use helmet security middlewares
//app.use(hidePoweredBy());
//app.use(noSniff());
//app.use(xssFilter());

registerSession(app, intializedSequelize);
registerRoutes(app);

app.use((req: Request, res: Response) => {
  res.status(404).send('Route not found');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
