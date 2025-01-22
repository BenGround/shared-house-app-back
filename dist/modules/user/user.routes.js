"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
exports.default = (app) => {
    const router = (0, express_1.Router)();
    router.post('/register', user_controller_1.register);
    router.post('/login', user_controller_1.login);
    router.post('/logout', user_controller_1.logout);
    router.post('/user/:username', user_controller_1.findByUsername);
    app.use('/api/auth', router);
};
//# sourceMappingURL=user.routes.js.map