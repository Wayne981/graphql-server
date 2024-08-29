import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { prismaClient } from "./lib/db";
import { createHmac, randomBytes } from 'node:crypto';
import JWT from 'jsonwebtoken';

const JWT_SECRET = '$superlam@284'

interface CreateUserPayload {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
}

interface GetUserTokenPayload {
    email: string;
    password: string;
}

class UserService {
    public static async createUser(payload: CreateUserPayload) {
        const { firstName, lastName, email, password } = payload;
        const salt = randomBytes(32).toString('hex');
        const hashedPassword = createHmac('sha256', salt).update(password).digest("hex");

        return prismaClient.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                salt
            }
        });
    }

    public static async getUserToken(payload: GetUserTokenPayload) {
        const { email, password } = payload;
        const user = await prismaClient.user.findUnique({ where: { email } });
        if (!user) throw new Error('User not found');

        const hashedPassword = createHmac('sha256', user.salt).update(password).digest("hex");
        if (hashedPassword !== user.password) throw new Error('Incorrect password');

        const token = JWT.sign({ id: user.id, email: user.email }, JWT_SECRET);
        return token;
    }
}

async function init() {
    const app = express();
    const PORT = Number(process.env.PORT) || 8000;

    const gqlServer = new ApolloServer({
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
                getUserToken: async (_, payload: GetUserTokenPayload) => {
                    try {
                        const token = await UserService.getUserToken(payload);
                        return token;
                    } catch (error) {
                        console.error('Error in getUserToken:', error);
                        throw new Error('Authentication failed');
                    }
                }
            },
            Mutation: {
                createUser: async (_, payload: CreateUserPayload) => {
                    try {
                        await UserService.createUser(payload);
                        return true;
                    } catch (error) {
                        console.error('Error in createUser:', error);
                        return false;
                    }
                }
            }
        },
    });

    app.use(express.json());

    await gqlServer.start();

    app.use('/graphql', expressMiddleware(gqlServer));

    app.listen(PORT, () => console.log(`Server started at port ${PORT}`));
}

init();

