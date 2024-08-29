import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { prismaClient } from "./lib/db";
import { createHmac, randomBytes } from 'node:crypto';
import JWT, { JwtPayload } from 'jsonwebtoken';

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

    public static getUserById(id: string) {
        return prismaClient.user.findUnique({ where: { id } });
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

    public static decodeJWTToken(token: string): JwtPayload {
        const decoded = JWT.verify(token, JWT_SECRET);
        if (typeof decoded === 'string') {
            throw new Error('Invalid token');
        }
        return decoded as JwtPayload;
    }
}

const typeDefs = `
    type User {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        profileImageURL: String
    }

    type Query {
        getUserToken(email: String!, password: String!): String
        getCurrentLoggedInUser: User
    }

    type Mutation {
        createUser(firstName: String!, lastName: String, email: String!, password: String!): Boolean
    }
`;

const resolvers = {
    Query: {
        getUserToken: async (_: any, payload: GetUserTokenPayload) => {
            try {
                const token = await UserService.getUserToken(payload);
                return token;
            } catch (error) {
                console.error('Error in getUserToken:', error);
                throw new Error('Authentication failed');
            }
        },
        getCurrentLoggedInUser: async (_: any, parameters: any, context: any) => {
            if (context && context.user) {
                return context.user;
            }
            throw new Error('Not authenticated');
        },
    },
    Mutation: {
        createUser: async (_: any, payload: CreateUserPayload) => {
            try {
                await UserService.createUser(payload);
                return true;
            } catch (error) {
                console.error('Error in createUser:', error);
                return false;
            }
        }
    }
};

async function createApolloGraphqlServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await server.start();

    return server;
}

async function init() {
    const app = express();
    const PORT = Number(process.env.PORT) || 8000;

    app.use(express.json());

    app.use('/graphql', expressMiddleware(await createApolloGraphqlServer(), {
        context: async ({ req }) => {
            const token = req.headers['token'];
            try {
                if (typeof token === 'string') {
                    const decoded = UserService.decodeJWTToken(token);
                    if (decoded && typeof decoded.id === 'string') {
                        const user = await UserService.getUserById(decoded.id);
                        return { user };
                    }
                }
            } catch (error) {
                console.error('Error in context:', error);
            }
            return {};
        }
    }));

    app.listen(PORT, () => console.log(`Server started at port ${PORT}`));
}

init();