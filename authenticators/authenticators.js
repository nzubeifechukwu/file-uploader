const prisma = require("../lib/prisma");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

const localStrategy = new LocalStrategy(async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: username },
    });
    if (!user) {
      return done(null, false, { message: "Incorrect email and/or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return done(null, false, {
        message: "Incorrect password and/or password",
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});

function serializeSession(user, done) {
  done(null, user.id);
}

async function deserializeSession(id, done) {
  try {
    const user = await prisma.user.findUnique({ where: { id: id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
}

module.exports = { localStrategy, serializeSession, deserializeSession };
