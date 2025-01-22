'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const dotenv_1 = __importDefault(require('dotenv'));
dotenv_1.default.config();
const { DEV_DATABASE_HOST, DEV_DATABASE_USERNAME, DEV_DATABASE_PASSWORD, DEV_DATABASE_NAME } = process.env;
const config = {
  development: {
    username: DEV_DATABASE_USERNAME || null,
    password: DEV_DATABASE_PASSWORD || null,
    database: DEV_DATABASE_NAME || null,
    host: DEV_DATABASE_HOST || null,
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
    username: 'root',
    password: null,
    database: 'my_express_app_production',
    host: '127.0.0.1',
    dialect: 'postgres',
  },
};
exports.default = config;
