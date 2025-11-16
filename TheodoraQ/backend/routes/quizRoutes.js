import express from 'express';
import { 
  generateQuiz, 
  getQuizzes, 
  getQuizById, 
  deleteQuiz,
  updateQuiz,
  createManualQuiz
} from '../controllers/quizController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All quiz routes require authentication
router.use(protect);

/**
 * POST /api/quiz/generate
 * Generate quiz content using AI and save to database
 */
router.post('/generate', generateQuiz);

/**
 * POST /api/quiz/manual
 * Create a quiz manually
 */
router.post('/manual', createManualQuiz);

/**
 * GET /api/quiz
 * Get all quizzes created by the authenticated admin
 */
router.get('/', getQuizzes);

/**
 * GET /api/quiz/:id
 * Get a single quiz by ID
 */
router.get('/:id', getQuizById);

/**
 * PUT /api/quiz/:id
 * Update a quiz
 */
router.put('/:id', updateQuiz);

/**
 * DELETE /api/quiz/:id
 * Delete a quiz
 */
router.delete('/:id', deleteQuiz);

export default router;
