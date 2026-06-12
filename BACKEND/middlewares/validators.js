import { body, validationResult } from "express-validator";

/**
 * Validation chain for user registration.
 */
export const validateRegister = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),

  body("contact")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\d{10,15}$/)
    .withMessage("Phone number must be 10–15 digits."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number."),
];

/**
 * Validation chain for user login.
 */
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required."),
];

/**
 * Middleware to check validation results and return 400 with
 * structured errors if validation failed.
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

// ─── Directory Validators ────────────────────────────────────────

const directoryNameChain = body("name")
  .trim()
  .notEmpty()
  .withMessage("Directory name is required.")
  .isLength({ min: 1, max: 255 })
  .withMessage("Directory name must be between 1 and 255 characters.")
  .not()
  .matches(/[\/\\:*?"<>|]/)
  .withMessage(
    'Directory name cannot contain special characters: / \\ : * ? " < > |',
  );

/**
 * Validation chain for creating a directory.
 */
export const validateCreateDirectory = [directoryNameChain];

/**
 * Validation chain for renaming a directory.
 */
export const validateRenameDirectory = [directoryNameChain];

