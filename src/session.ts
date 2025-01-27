import dotenv from 'dotenv';
import { Application } from 'express';
import session from 'express-session';
import { Sequelize as SequelizeTypescript } from 'sequelize-typescript';
import { Pool, PoolConfig } from 'pg';
import connectPgSimple from 'connect-pg-simple';
import * as fs from 'fs';

const {
  DEV_DATABASE_HOST,
  DEV_DATABASE_PORT,
  DEV_DATABASE_USERNAME,
  DEV_DATABASE_PASSWORD,
  DEV_DATABASE_NAME,
  SESSION_SECRET,
} = process.env;

dotenv.config();

export default (app: Application, sequelize: SequelizeTypescript): void => {
  const secret = SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    throw new Error('SESSION_SECRET is missing from env!');
  }

  const PgSessionStore = connectPgSimple(session);

  let poolConfigOpts: PoolConfig;

  if (isProduction) {
    poolConfigOpts = {
      user: DEV_DATABASE_USERNAME,
      password: DEV_DATABASE_PASSWORD,
      database: DEV_DATABASE_NAME,
      host: DEV_DATABASE_HOST,
      port: parseInt(DEV_DATABASE_PORT ?? '5432'),
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./database/ca.pem').toString(),
      },
    };
  } else {
    poolConfigOpts = {
      user: DEV_DATABASE_USERNAME,
      password: DEV_DATABASE_PASSWORD,
      database: DEV_DATABASE_NAME,
      host: DEV_DATABASE_HOST,
      port: parseInt(DEV_DATABASE_PORT ?? '5432'),
    };
  }

  const postgreStore = new PgSessionStore({
    pool: new Pool(poolConfigOpts),
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: postgreStore,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
      },
      secret,
      resave: false,
      saveUninitialized: false,
    }),
  );
};
