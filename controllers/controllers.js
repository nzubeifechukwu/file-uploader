const passport = require("passport");
const { validationResult, matchedData } = require("express-validator");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const supabase = require("../lib/supabase");

const validateUser = require("../inputValidator/inputValidator");
const { formatBytes, formatDate } = require("../utils");

async function home(req, res) {
  let folders = [];
  if (req.user) {
    folders = await prisma.folder.findMany({
      where: { ownerId: req.user.id },
      include: { files: true },
    });
  }
  res.render("index", {
    user: req.user,
    folders: folders,
    formatBytes,
    formatDate,
  });
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
    next(error); // Sends error to error handler in app.js
  }
}

async function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const { originalname, size, mimetype, buffer } = req.file;
  const { folderId } = req.body;

  try {
    const fileTimestamp = Date.now();
    const storagePath = `user_${req.user.id}/${fileTimestamp}_${originalname}`;

    // Upload to Supabase: `uploads` is the bucket name created on Supabase
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

    if (error) {
      throw error;
    }

    // Save file details to Prisma
    await prisma.file.create({
      data: {
        name: originalname,
        size: size,
        mimetype: mimetype,
        storagePath: storagePath,
        folderId: parseInt(folderId),
        ownerId: parseInt(req.user.id),
      },
    });

    res.redirect("/");
  } catch (error) {
    next(error); // Sends error to error handler in app.js
  }
}

async function deleteFolder(req, res) {
  const { id } = req.params;
  const folderId = parseInt(id);

  try {
    const filesInFolder = await prisma.file.findMany({
      where: { folderId: folderId },
    });

    // Get all files in folder and delete them from Supabase
    if (filesInFolder.length > 0) {
      const pathsToDelete = filesInFolder.map((file) => file.storagePath);
      const { error: storageError } = await supabase.storage
        .from("uploads")
        .remove(pathsToDelete);

      if (storageError) {
        throw storageError;
      }
    }

    // Now delete folder in database
    await prisma.folder.delete({
      where: { id: folderId },
    });

    res.redirect("/");
  } catch (error) {
    console.error("Delete Folder Error:", error);
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
    return res
      .status(400)
      .send("Folder ID is required. You must create or choose a folder.");
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

async function downloadFile(req, res) {
  const id = parseInt(req.params.id);

  try {
    const file = await prisma.file.findUnique({
      where: { id: id },
    });

    if (!file) {
      return res.status(404).send("File not found in database.");
    }

    if (file.ownerId !== req.user.id) {
      return res.status(403).send("Unauthorized access.");
    }

    // Generate a 60-second temporary URL: `download: true` forces browser to download rather than play/view
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(file.storagePath, 60, { download: true });

    if (error) {
      throw error;
    }

    // Redirect user's browser to the temporary cloud link
    res.redirect(data.signedUrl);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).send("An error occurred during download.");
  }
}

async function deleteFile(req, res) {
  const { id } = req.params;

  try {
    const file = await prisma.file.findUnique({
      where: { id: parseInt(id) },
    });

    if (!file) {
      return res.status(404).send("File not found.");
    }

    if (file.ownerId !== req.user.id) {
      return res.status(403).send("Unauthorized access.");
    }

    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([file.storagePath]); // .remove() expects an array of paths

    if (storageError) {
      throw storageError;
    }

    await prisma.file.delete({ where: { id: parseInt(id) } });

    res.redirect("/");
  } catch (error) {
    console.error("Delete File Error:", error);
    res.status(500).send("Error deleting file.");
  }
}

module.exports = {
  home,
  logIn,
  signUpGet,
  signUpPost,
  logOut,
  createFolder,
  uploadFile,
  deleteFolder,
  renameFolder,
  checkFolderOwnership,
  downloadFile,
  deleteFile,
};
