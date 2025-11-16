import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAnalyticsOverview,
  getQuestionAnalytics,
  getClassAnalytics,
  getStudentAnalytics,
} from '../controllers/analyticsController.js';

const router = express.Router();

// All routes are protected - only admins can access
router.get('/overview', protect, getAnalyticsOverview);
router.get('/questions', protect, getQuestionAnalytics);
router.get('/class/:classId', protect, getClassAnalytics);
router.get('/student/:studentId/class/:classId', protect, getStudentAnalytics);

export default router;
