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
 * PATCH /api/classes/:id/regenerate-invite
 * Regenerate invite code for a class
 */
router.patch('/:id/regenerate-invite', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;

    const Class = (await import('../models/Class.js')).default;
    const classData = await Class.findById(id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check if user is the admin of this class
    if (classData.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this class',
      });
    }

    // Generate new invite code
    const newInviteCode = `${classData.courseCode.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    classData.inviteCode = newInviteCode;
    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Invite code regenerated successfully',
      data: {
        inviteCode: newInviteCode,
      },
    });
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

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
