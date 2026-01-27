const { Router } = require("express");
const multer = require("multer");
const controllers = require("../controllers/controllers");

const router = Router();
const upload = multer({ dest: "./public/data/uploads" });

router.get("/", controllers.home);
router.post("/log-in", controllers.logIn);
router.get("/sign-up", controllers.signUpGet);
router.post("/sign-up", controllers.signUpPost);
router.get("/log-out", controllers.logOut);
router.post("/upload", upload.single("uploadedFile"), controllers.uploadFile);

module.exports = router;
