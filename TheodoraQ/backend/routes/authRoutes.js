import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  getMe,
  googleAuthSuccess,
  googleAuthFailure,
  updateProfile,
  changePassword,
  uploadAvatar,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { googleAuth } from '../controllers/googleAuthController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator';
import upload from '../config/multer.js';

const router = express.Router();

/**
 * Validation middleware
 */
const validateRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('role').optional().isIn(['candidate', 'admin']).withMessage('Invalid role'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

// Local authentication routes
router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Profile management routes
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Google OAuth - Credential-based (for frontend Google Identity Services)
router.post('/google', googleAuth);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false,
  }),
  googleAuthSuccess
);

router.get('/google/failure', googleAuthFailure);

export default router;
