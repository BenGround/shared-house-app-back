import dotenv from 'dotenv';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { User } from './modules/user/user.model';
import { Booking } from './modules/booking/booking.model';
import { SharedSpace } from './modules/sharedSpace/sharedspace.model';
import * as fs from 'fs';

dotenv.config();

let sequelize: Sequelize;

const initializeSequelize = () => {
  const { NODE_ENV, DATABASE_HOST, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_PORT } = process.env;

  if (!DATABASE_HOST || !DATABASE_NAME || !DATABASE_USERNAME) {
    throw new Error('Missing DB configuration in env');
  }

  if (!sequelize) {
    const sequelizeConfigs = {
      host: DATABASE_HOST,
      port: parseInt(DATABASE_PORT ?? '5432'),
      dialect: 'postgres',
      models: [User, SharedSpace, Booking],
      dialectOptions: {},
    };

    if (NODE_ENV === 'production') {
      sequelizeConfigs.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          ca: fs.existsSync('./database/ca.pem') ? fs.readFileSync('./database/ca.pem').toString() : undefined,
        },
      };
    }

    sequelize = new Sequelize(
      DATABASE_NAME,
      DATABASE_USERNAME,
      DATABASE_PASSWORD,
      sequelizeConfigs as SequelizeOptions,
    );
  }

  return sequelize;
};

export const db = { User, SharedSpace, Booking };
export const initializedSequelize = initializeSequelize();
