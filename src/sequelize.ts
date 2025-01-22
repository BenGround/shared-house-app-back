import dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { User } from './modules/user/user.model';
import { Booking } from './modules/booking/booking.model';
import { SharedSpace } from './modules/sharedSpace/sharedspace.model';

dotenv.config();

let sequelize: Sequelize;
const initializeSequelize = () => {
  if (!process.env['DEV_DATABASE_HOST'] || !process.env['DEV_DATABASE_NAME'] || !process.env['DEV_DATABASE_USERNAME']) {
    throw new Error('Missing DB configuration in env');
  }

  if (!sequelize) {
    sequelize = new Sequelize(
      process.env['DEV_DATABASE_NAME'],
      process.env['DEV_DATABASE_USERNAME'],
      process.env['DEV_DATABASE_PASSWORD'],
      {
        host: process.env['DB_HOST'],
        dialect: 'postgres',
        models: [User, SharedSpace, Booking],
      },
    );
  }

  return sequelize;
};

export const db = { User, SharedSpace, Booking };
export const intializedSequelize = initializeSequelize();
