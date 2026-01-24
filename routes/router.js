const { Router } = require("express");

const controllers = require("../controllers/controllers");

const router = Router();

router.get("/", controllers.home);
router.post("/log-in", controllers.logIn);
router.get("/sign-up", controllers.signUpGet);
router.post("/sign-up", controllers.signUpPost);
router.get("/log-out", controllers.logOut);

module.exports = router;
