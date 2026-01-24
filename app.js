// require("dotenv").config();
const express = require("express");
const path = require("node:path");
const session = require("express-session");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const passport = require("passport");
const flash = require("connect-flash");

const router = require("./routes/router");
const {
  localStrategy,
  serializeSession,
  deserializeSession,
} = require("./authenticators/authenticators");
const prisma = require("./lib/prisma");

const app = express();
const PORT = 10000; // Render uses port 10000
const assetsPath = path.join(__dirname, "public");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(assetsPath));
app.use(
  session({
    secret: "romeo and juliet",
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  }),
);
app.use(flash());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.locals.errorMessage = req.flash("error");
  next();
});
app.use("/", router);

passport.use(localStrategy);
passport.serializeUser(serializeSession);
passport.deserializeUser(deserializeSession);

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`App listening on port ${PORT}`);
});
