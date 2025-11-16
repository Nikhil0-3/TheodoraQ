import express from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentsByClass,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  getSubmissionDetails,
  getClassResults,
} from '../controllers/assignmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All assignment routes require authentication
router.use(protect);

/**
 * POST /api/assignments
 * Create a new assignment (assign a quiz to a class)
 */
router.post('/', createAssignment);

/**
 * GET /api/assignments
 * Get all assignments created by the authenticated admin
 */
router.get('/', getAssignments);

/**
 * GET /api/assignments/class/:classId
 * Get all assignments for a specific class
 */
router.get('/class/:classId', getAssignmentsByClass);

/**
 * GET /api/assignments/class/:classId/results
 * Get all results for a class (weighted calculations)
 */
router.get('/class/:classId/results', getClassResults);

/**
 * GET /api/assignments/:assignmentId/submissions
 * Get all submissions for a single assignment (for Admins)
 */
router.get('/:assignmentId/submissions', getAssignmentSubmissions);

/**
 * GET /api/assignments/:assignmentId/submissions/:submissionId
 * Get detailed submission with question breakdown (for Admins)
 */
router.get('/:assignmentId/submissions/:submissionId', getSubmissionDetails);

/**
 * PUT /api/assignments/:id
 * Update an assignment (edit due date and time limit)
 */
router.put('/:id', updateAssignment);

/**
 * DELETE /api/assignments/:id
 * Delete an assignment
 */
router.delete('/:id', deleteAssignment);

export default router;
