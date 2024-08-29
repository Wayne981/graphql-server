"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const db_1 = require("./src/lib/db");
class UserService {
    static createUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { firstName, lastName, email, password } = payload;
                const salt = (0, node_crypto_1.randomBytes)(32).toString('hex');
                const hashedPassword = (0, node_crypto_1.createHmac)('sha256', salt).update(password).digest("hex");
                const storedPassword = `${salt}:${hashedPassword}`;
                return yield db_1.prismaClient.user.create({
                    data: {
                        firstName,
                        lastName: lastName || null,
                        email,
                        password: storedPassword
                    }
                });
            }
            catch (error) {
                console.error('Error creating user:', error);
                throw new Error('Failed to create user');
            }
        });
    }
}
