const { Router } = require("express");
const multer = require("multer");

const controllers = require("../controllers/controllers");

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", controllers.home);
router.post("/log-in", controllers.logIn);
router.get("/sign-up", controllers.signUpGet);
router.post("/sign-up", controllers.signUpPost);
router.get("/log-out", controllers.logOut);
router.post("/folders", controllers.createFolder);
router.post(
  "/upload",
  upload.single("uploadedFile"),
  controllers.checkFolderOwnership,
  controllers.uploadFile,
);
router.post(
  "/folders/:id/delete",
  controllers.checkFolderOwnership,
  controllers.deleteFolder,
);
router.post("/files/:id/delete", controllers.deleteFile);
router.post(
  "/folders/:id/update",
  controllers.checkFolderOwnership,
  controllers.renameFolder,
);
router.get("/files/:id/download", controllers.downloadFile);

module.exports = router;
