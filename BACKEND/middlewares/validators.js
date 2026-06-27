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

// ─── Share Validators ────────────────────────────────────────────

export const validateCreateShare = [
  body("resourceId")
    .notEmpty()
    .withMessage("resourceId is required.")
    .isMongoId()
    .withMessage("resourceId must be a valid ID."),

  body("resourceType")
    .optional()
    .isIn(["file", "directory"])
    .withMessage("resourceType must be 'file' or 'directory'."),
];

export const validateUpdateShare = [
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean."),

  body("visibility")
    .optional()
    .isIn(["public", "restricted"])
    .withMessage("visibility must be 'public' or 'restricted'."),

  body("password")
    .optional({ nullable: true })
    .isLength({ min: 4, max: 128 })
    .withMessage("Password must be between 4 and 128 characters."),

  body("expirationPreset")
    .optional()
    .isIn(["Never", "1 Day", "7 Days", "30 Days"])
    .withMessage("Invalid expiration preset."),

  body("permissions.allowView")
    .optional()
    .isBoolean()
    .withMessage("permissions.allowView must be a boolean."),

  body("permissions.allowDownload")
    .optional()
    .isBoolean()
    .withMessage("permissions.allowDownload must be a boolean."),
];

export const validateInviteCollaborator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),

  body("role")
    .optional()
    .isIn(["viewer", "editor"])
    .withMessage("role must be 'viewer' or 'editor'."),
];

export const validateCollaboratorRole = [
  body("role")
    .notEmpty()
    .withMessage("role is required.")
    .isIn(["viewer", "editor"])
    .withMessage("role must be 'viewer' or 'editor'."),
];

export const validateSharePassword = [
  body("password")
    .optional()
    .isLength({ max: 128 })
    .withMessage("Password cannot exceed 128 characters."),
];

// ─── Account / Profile Validators ────────────────────────────────

/**
 * Validation chain for updating user profile.
 */
export const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters."),

  body("contact")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone number cannot exceed 20 characters."),

  body("language")
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage("Language code must be between 2 and 10 characters."),

  body("timezone")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Timezone cannot exceed 50 characters."),
];

/**
 * Validation chain for changing password.
 */
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters.")
    .matches(/[a-zA-Z]/)
    .withMessage("New password must contain at least one letter.")
    .matches(/\d/)
    .withMessage("New password must contain at least one number."),
];

