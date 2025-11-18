import express from 'express';
import { getCandidateClasses } from '../controllers/classController.js';
import { getCandidateAssignments, getSingleAssignment, submitQuiz } from '../controllers/assignmentController.js';
import { bulkInviteCandidates, downloadTemplate, parseFileForPreview, sendBulkInvites, getClassRoster, getClassLeaderboard } from '../controllers/candidateController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All candidate routes require authentication
router.use(protect);

/**
 * GET /api/candidate/my-classes
 * Get all classes the authenticated candidate is enrolled in
 */
router.get('/my-classes', getCandidateClasses);

/**
 * GET /api/candidate/assignments/:classId
 * Get all assignments for a specific class (for candidates)
 */
router.get('/assignments/:classId', getCandidateAssignments);

/**
 * GET /api/candidate/assignment/:assignmentId
 * Get a single assignment for a candidate to take (questions without answers)
 */
router.get('/assignment/:assignmentId', getSingleAssignment);

/**
 * POST /api/candidate/submit-quiz/:assignmentId
 * Submit a quiz for grading
 */
router.post('/submit-quiz/:assignmentId', submitQuiz);

/**
 * POST /api/candidate/parse-file
 * Parse Excel/CSV file and return candidate list for preview
 * Requires authentication and file upload
 */
router.post('/parse-file', upload.single('file'), parseFileForPreview);

/**
 * POST /api/candidate/send-invites
 * Send invitation emails to a list of candidates
 * Requires authentication
 */
router.post('/send-invites', sendBulkInvites);

/**
 * POST /api/candidate/bulk-invite
 * Upload Excel/CSV file to bulk invite candidates to a class (legacy endpoint)
 * Requires authentication and file upload
 */
router.post('/bulk-invite', upload.single('file'), bulkInviteCandidates);

/**
 * GET /api/candidate/download-template
 * Download sample Excel template for bulk upload
 */
router.get('/download-template', downloadTemplate);

/**
 * GET /api/candidate/class/:classId/roster
 * Get class roster (if enabled by admin)
 */
router.get('/class/:classId/roster', getClassRoster);

/**
 * GET /api/candidate/class/:classId/leaderboard
 * Get class leaderboard with rankings
 */
router.get('/class/:classId/leaderboard', getClassLeaderboard);

export default router;
