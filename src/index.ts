import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { prismaClient } from "./lib/db";

async function init() {
    const app = express();
    const PORT = Number(process.env.PORT) || 8000;

    // creating graphql server from documentation 
    const gqlServer = new ApolloServer({
        typeDefs: `
          type Query { 
            hello: String
            say(name: String!): String
          }
          type Mutation {
            createUser(firstName: String!, lastName: String!, email: String!, password: String!): Boolean
          }
        `, // schema
        resolvers: {
          Query: {
            hello: () => `Hey there, I am a GraphQL server illaya`,
            say: (_, {name}: {name: string}) => `Hey ${name}, How are u ilka?`
          },
          Mutation: {
            createUser: async(_, {firstName, lastName, email, password}: {
              firstName: string;
              lastName: string;
              email: string;
              password: string;
            }) => {
              await prismaClient.user.create({
                data: {
                  email, 
                  firstName, 
                  lastName,
                  password, 
                  salt: "random_salt",
                },
              });
              return true;
            }
          }
        },
    }); // schema layer

    app.use(express.json());

    // start the gql server , should make it globally 
    await gqlServer.start();

    app.get("/", (req, res) => {
        res.json({message: "Server is up and running"});
    });

    // opening the port to communicate : mouth opener in figure
    app.use('/graphql', expressMiddleware(gqlServer));

    app.listen(PORT, () => {
        console.log(`Server started at port ${PORT}`);
    });
}

init();