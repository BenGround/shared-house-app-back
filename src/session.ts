import dotenv from 'dotenv';
import { Application } from 'express';
import session from 'express-session';
import { Sequelize as SequelizeTypescript } from 'sequelize-typescript';
import { Pool } from 'pg';
import connectPgSimple from 'connect-pg-simple';
const { DEV_DATABASE_HOST, DEV_DATABASE_USERNAME, DEV_DATABASE_PASSWORD, DEV_DATABASE_NAME, SESSION_SECRET } =
  process.env;

dotenv.config();

export default (app: Application, sequelize: SequelizeTypescript): void => {
  const secret = SESSION_SECRET;

  if (!secret) {
    throw new Error('SESSION_SECRET is missing from env!');
  }

  const PgSessionStore = connectPgSimple(session);

  const poolConfigOpts = {
    user: DEV_DATABASE_USERNAME,
    password: DEV_DATABASE_PASSWORD,
    database: DEV_DATABASE_NAME,
    host: DEV_DATABASE_HOST,
    dialect: 'postgres',
  };
  const postgreStore = new PgSessionStore({
    pool: new Pool(poolConfigOpts),
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: postgreStore,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
      secret,
      resave: true,
      saveUninitialized: true,
    }),
  );
};
