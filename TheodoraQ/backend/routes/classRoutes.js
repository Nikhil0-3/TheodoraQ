import express from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  joinClass,
  removeStudentFromClass,
} from '../controllers/classController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test endpoint to verify routing works
router.get('/test', (req, res) => {
  res.json({ message: 'Class routes are working!' });
});

// All class routes require authentication
router.use(protect);

// Test endpoint after authentication
router.get('/test-auth', (req, res) => {
  res.json({ 
    message: 'Authentication working!',
    user: req.user 
  });
});

/**
 * POST /api/classes
 * Create a new class (protected - requires authentication)
 */
router.post('/', createClass);

/**
 * GET /api/classes
 * Get all classes for the current user
 */
router.get('/', getClasses);

/**
 * POST /api/classes/join
 * Join a class using invite code (for candidates)
 * This endpoint allows candidates to join a class by providing an invite code
 */
router.post('/join', (req, res, next) => {
  console.log('🟢 /api/classes/join route hit!');
  next();
}, joinClass);

/**
 * GET /api/classes/:id
 * Get a single class by ID
 */
router.get('/:id', getClassById);

/**
 * POST /api/classes/:id/remove-student
 * Remove a student from a class
 */
router.post('/:id/remove-student', removeStudentFromClass);

/**
 * PUT /api/classes/:id
 * Update a class
 */
router.put('/:id', updateClass);

/**
 * DELETE /api/classes/:id
 * Delete a class (soft delete)
 */
router.delete('/:id', deleteClass);

export default router;
