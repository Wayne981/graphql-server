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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const db_1 = require("./lib/db");
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = '$superlam@284';
class UserService {
    static createUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { firstName, lastName, email, password } = payload;
            const salt = (0, node_crypto_1.randomBytes)(32).toString('hex');
            const hashedPassword = (0, node_crypto_1.createHmac)('sha256', salt).update(password).digest("hex");
            return db_1.prismaClient.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: hashedPassword,
                    salt
                }
            });
        });
    }
    static getUserToken(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = payload;
            const user = yield db_1.prismaClient.user.findUnique({ where: { email } });
            if (!user)
                throw new Error('User not found');
            const hashedPassword = (0, node_crypto_1.createHmac)('sha256', user.salt).update(password).digest("hex");
            if (hashedPassword !== user.password)
                throw new Error('Incorrect password');
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET);
            return token;
        });
    }
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        const PORT = Number(process.env.PORT) || 8000;
        const gqlServer = new server_1.ApolloServer({
            typeDefs: `
            type Query {
                getUserToken(email: String!, password: String!): String
            }
            type Mutation {
                createUser(firstName: String!, lastName: String, email: String!, password: String!): Boolean
            }
        `,
            resolvers: {
                Query: {
                    getUserToken: (_, payload) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const token = yield UserService.getUserToken(payload);
                            return token;
                        }
                        catch (error) {
                            console.error('Error in getUserToken:', error);
                            throw new Error('Authentication failed');
                        }
                    })
                },
                Mutation: {
                    createUser: (_, payload) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            yield UserService.createUser(payload);
                            return true;
                        }
                        catch (error) {
                            console.error('Error in createUser:', error);
                            return false;
                        }
                    })
                }
            },
        });
        app.use(express_1.default.json());
        yield gqlServer.start();
        app.use('/graphql', (0, express4_1.expressMiddleware)(gqlServer));
        app.listen(PORT, () => console.log(`Server started at port ${PORT}`));
    });
}
init();
