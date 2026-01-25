const { body } = require("express-validator");

const validateUser = [
  body("username").trim().isEmail().withMessage("Not a valid email address."),
  body("password")
    .trim()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one symbol.",
    ),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password.");
    }
    return true;
  }),
];

module.exports = validateUser;
