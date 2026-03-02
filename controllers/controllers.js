const passport = require("passport");
const { validationResult, matchedData } = require("express-validator");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const validateUser = require("../inputValidator/inputValidator");

async function home(req, res) {
  let folders = [];
  if (req.user) {
    folders = await prisma.folder.findMany({
      where: { ownerId: req.user.id },
      include: { files: true },
    });
  }
  res.render("index", { user: req.user, folders: folders });
}

async function showFileDetails(req, res) {
  const { folderId, fileName } = req.params;
  let file;

  if (req.user) {
    file = await prisma.file.findFirst({
      where: {
        ownerId: req.user.id,
        folderId: parseInt(folderId),
        name: fileName,
      },
    });
  }

  res.render("fileDetails", { user: req.user, file: file });
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

async function createFolder(req, res) {
  const { folderName } = req.body;
  try {
    await prisma.folder.create({
      data: {
        name: folderName,
        ownerId: req.user.id,
      },
    });
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Error creating folder.");
  }
}

async function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const { filename } = req.file;
  const { folderId } = req.body;

  try {
    await prisma.file.create({
      data: {
        name: filename,
        folderId: parseInt(folderId),
        ownerId: req.user.id,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error linking file to folder.");
  }
}

async function deleteFolder(req, res) {
  const { id } = req.params;
  try {
    await prisma.folder.delete({
      where: { id: parseInt(id) },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting folder.");
  }
}

async function renameFolder(req, res) {
  const { id } = req.params;
  const { newName } = req.body;
  try {
    await prisma.folder.update({
      where: { id: parseInt(id) },
      data: { name: newName },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error renaming folder.");
  }
}

async function checkFolderOwnership(req, res, next) {
  // Find the folder ID in params first, then fall back to body
  const folderId = req.params.id || req.body.folderId;
  if (!folderId) {
    return res.status(400).send("Folder ID is required.");
  }
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
    });
    // Check if folder exists and if logged-in user owns it
    if (!folder || folder.ownerId !== req.user.id) {
      return res.status(403).send("Access denied: You do not own this folder.");
    }
    next(); // If all is well, move to the next function
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error during authorization.");
  }
}

module.exports = {
  home,
  showFileDetails,
  logIn,
  signUpGet,
  signUpPost,
  logOut,
  createFolder,
  uploadFile,
  deleteFolder,
  renameFolder,
  checkFolderOwnership,
};
