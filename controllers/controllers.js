const passport = require("passport");
const { validationResult, matchedData } = require("express-validator");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
// const multer = require("multer");

const validateUser = require("../inputValidator/inputValidator");

async function home(req, res) {
  res.render("index", { user: req.user });
}

function logIn(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
    failureFlash: true,
  })(req, res, next);
}

function signUpGet(req, res) {
  res.render("sign-up");
}

const signUpPost = [
  validateUser,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .render("sign-up", { errors: errors.array(), formData: req.body });
    }
    const { username, password } = matchedData(req);
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await prisma.user.create({
        data: { username: username, password: hashedPassword },
      });
      res.redirect("/");
    } catch (error) {
      console.error(error);
      return next(error);
    }
  },
];

function logOut(req, res, next) {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    res.redirect("/");
  });
}

async function uploadFile(req, res) {
  const { destination, filename } = req.file;
  const userId = req.user.id;

  try {
    const folder = await prisma.folder.upsert({
      where: {
        name_ownerId: {
          name: destination,
          ownerId: userId,
        },
      },
      update: {}, // If folder exists, do nothing
      create: {
        name: destination,
        owner: { connect: { id: userId } },
      },
    });

    const file = await prisma.file.create({
      data: {
        name: filename,
        folder: { connect: { id: folder.id } },
        owner: { connect: { id: userId } },
      },
    });
    
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading file");
  }
}

module.exports = {
  home,
  logIn,
  signUpGet,
  signUpPost,
  logOut,
  uploadFile,
};
