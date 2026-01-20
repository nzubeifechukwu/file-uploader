require("dotenv").config();
// const expressSession = require("express-session");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma/client.js");
// const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
