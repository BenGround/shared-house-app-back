"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connect_session_sequelize_1 = __importDefault(require("connect-session-sequelize"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
dotenv_1.default.config();
exports.default = (app, sequelize) => {
    const SequelizeStore = (0, connect_session_sequelize_1.default)(express_session_1.default.Store);
    const secret = process.env['SESSION_SECRET'];
    if (!secret) {
        throw new Error('SESSION_SECRET is missing from env!');
    }
    const sessionOptions = {
        name: 'sesssionId',
        secret,
        store: new SequelizeStore({
            db: sequelize,
        }),
        resave: false,
        saveUninitialized: false,
        cookie: {
            expires: new Date(Date.now() + 60 * 60 * 1000),
            // secure: true, // uncomment this to allow secure cookie if you'll be running the app on HTTPS
        },
    };
    app.use((0, express_session_1.default)(sessionOptions));
};
//# sourceMappingURL=session.js.map