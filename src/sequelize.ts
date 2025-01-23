import dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { User } from './modules/user/user.model';
import { Booking } from './modules/booking/booking.model';
import { SharedSpace } from './modules/sharedSpace/sharedspace.model';
import * as fs from 'fs';

dotenv.config();

let sequelize: Sequelize;

const initializeSequelize = () => {
  const { DEV_DATABASE_HOST, DEV_DATABASE_NAME, DEV_DATABASE_USERNAME, DEV_DATABASE_PASSWORD, DEV_DATABASE_PORT } =
    process.env;

  if (!DEV_DATABASE_HOST || !DEV_DATABASE_NAME || !DEV_DATABASE_USERNAME) {
    throw new Error('Missing DB configuration in env');
  }

  if (!sequelize) {
    sequelize = new Sequelize(DEV_DATABASE_NAME, DEV_DATABASE_USERNAME, DEV_DATABASE_PASSWORD, {
      host: DEV_DATABASE_HOST,
      port: parseInt(DEV_DATABASE_PORT ?? '5432'),
      dialect: 'postgres',
      models: [User, SharedSpace, Booking],
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          ca: fs.existsSync('./database/ca.pem') ? fs.readFileSync('./database/ca.pem').toString() : undefined,
        },
      },
    });
  }

  return sequelize;
};

export const db = { User, SharedSpace, Booking };
export const initializedSequelize = initializeSequelize();
