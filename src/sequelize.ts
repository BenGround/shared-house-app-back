import dotenv from 'dotenv';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { User } from './modules/user/user.model';
import { Booking } from './modules/booking/booking.model';
import { SharedSpace } from './modules/sharedSpace/sharedspace.model';

dotenv.config();

let sequelize: Sequelize;

const initializeSequelize = (): Sequelize => {
  const { DATABASE_HOST, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_PORT } = process.env;

  if (!DATABASE_HOST || !DATABASE_NAME || !DATABASE_USERNAME) {
    throw new Error('Missing DB configuration in env');
  }

  if (!sequelize) {
    const sequelizeConfigs: SequelizeOptions = {
      host: DATABASE_HOST,
      port: parseInt(DATABASE_PORT ?? '5432'),
      dialect: 'postgres',
      models: [User, SharedSpace, Booking],
      dialectOptions: {},
    };

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
