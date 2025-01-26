require('dotenv').config();
const fs = require('fs');

const { DEV_DATABASE_HOST, DEV_DATABASE_PORT, DEV_DATABASE_USERNAME, DEV_DATABASE_PASSWORD, DEV_DATABASE_NAME } =
  process.env;

module.exports = {
  development: {
    username: DEV_DATABASE_USERNAME,
    password: DEV_DATABASE_PASSWORD,
    database: DEV_DATABASE_NAME,
    host: DEV_DATABASE_HOST,
    port: parseInt(DEV_DATABASE_PORT ?? '5432'),
    dialect: 'postgres',
  },
  test: {
    username: 'root',
    password: null,
    database: 'my_express_app_test',
    host: '127.0.0.1',
    dialect: 'postgres',
  },
  production: {
    username: DEV_DATABASE_USERNAME,
    password: DEV_DATABASE_PASSWORD,
    database: DEV_DATABASE_NAME,
    host: DEV_DATABASE_HOST,
    port: parseInt(DEV_DATABASE_PORT ?? '5432'),
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: fs.existsSync('./database/ca.pem') ? fs.readFileSync('./database/ca.pem').toString() : undefined,
      },
    },
  },
};
