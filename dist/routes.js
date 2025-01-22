"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
exports.default = (app) => {
    (0, user_routes_1.default)(app);
};
//# sourceMappingURL=routes.js.map