import 'dotenv/config';
import fs from 'fs';

const { DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME } = process.env;

export default {
  development: {
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT ?? '5432'),
    dialect: 'postgres',
  },
  production: {
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT ?? '5432'),
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: fs.existsSync('./database/ca.pem') ? fs.readFileSync('./database/ca.pem', 'utf8') : undefined,
      },
    },
  },
};
