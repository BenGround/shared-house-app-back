import dotenv from 'dotenv';
import { Application } from 'express';
import session from 'express-session';
import { Sequelize as SequelizeTypescript } from 'sequelize-typescript';
import pg, { PoolConfig } from 'pg';
import connectPgSimple from 'connect-pg-simple';

const { DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME, SESSION_SECRET } =
  process.env;
const { Pool } = pg;

dotenv.config();

export default (app: Application, sequelize: SequelizeTypescript): void => {
  const secret = SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    throw new Error('SESSION_SECRET is missing from env!');
  }

  const PgSessionStore = connectPgSimple(session);

  const poolConfig: PoolConfig = {
    user: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT || '5432', 10),
  };

  const postgreStore = new PgSessionStore({
    pool: new Pool(poolConfig),
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: postgreStore,
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );
};
