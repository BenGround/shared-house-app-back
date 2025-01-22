"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intializedSequelize = exports.db = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_typescript_1 = require("sequelize-typescript");
const user_model_1 = require("./modules/user/user.model");
const booking_model_1 = require("./modules/booking/booking.model");
dotenv_1.default.config();
let sequelize;
const initializeSequelize = () => {
    if (!process.env['DEV_DATABASE_HOST'] || !process.env['DEV_DATABASE_NAME'] || !process.env['DEV_DATABASE_USERNAME']) {
        throw new Error('Missing DB configuration in env');
    }
    if (!sequelize) {
        sequelize = new sequelize_typescript_1.Sequelize(process.env['DEV_DATABASE_NAME'], process.env['DEV_DATABASE_USERNAME'], process.env['DEV_DATABASE_PASSWORD'], {
            host: process.env['DB_HOST'],
            dialect: 'postgres',
            models: [user_model_1.User, booking_model_1.Booking],
        });
    }
    return sequelize;
};
exports.db = { User: user_model_1.User, Booking: booking_model_1.Booking };
exports.intializedSequelize = initializeSequelize();
//# sourceMappingURL=sequelize.js.map