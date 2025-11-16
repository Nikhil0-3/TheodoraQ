import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import configureGoogleOAuth from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import classRoutes from './routes/classRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import Class from './models/Class.js';
import Quiz from './models/Quiz.js';
import Assignment from './models/Assignment.js';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Configure Google OAuth
configureGoogleOAuth();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
// Increase payload size limit to handle Base64 encoded images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Session configuration (required for passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Dashboard Stats Route
// @route   GET /api/admin/dashboard/stats
// @desc    Get high-level stats for the admin dashboard
app.get('/api/admin/dashboard/stats', protect, async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;

    console.log('Fetching dashboard stats for admin:', adminId);

    // 1. Get Class Count
    const classCount = await Class.countDocuments({ adminId, isActive: true });

    // 2. Get Quiz Count
    const quizCount = await Quiz.countDocuments({ adminId });

    // 3. Get total unique Candidates
    // (This query finds all classes, gets all their 'students' arrays, and counts the unique IDs)
    const classes = await Class.find({ adminId, isActive: true }).select('students');
    const studentSet = new Set();
    classes.forEach(cls => {
      cls.students.forEach(studentId => {
        studentSet.add(studentId.toString());
      });
    });
    const studentCount = studentSet.size;

    console.log('Dashboard stats:', { classCount, quizCount, studentCount });

    // 4. Send all stats
    res.status(200).json({
      success: true,
      data: {
        classCount,
        quizCount,
        studentCount,
      },
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// Candidate Dashboard Route
// @route   GET /api/candidate/dashboard
// @desc    Get all upcoming assignments for a Candidate
app.get('/api/candidate/dashboard', protect, async (req, res) => {
  try {
    const candidateId = req.user?.id || req.user?._id;
    const candidateRole = req.user?.role;

    console.log('Fetching candidate dashboard for:', candidateId);

    // Security check: Only Candidates can use this endpoint
    if (candidateRole !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can view this',
      });
    }

    // 1. Find all classes the candidate is in
    const classes = await Class.find({ students: candidateId, isActive: true }).select('_id');
    const classIds = classes.map(cls => cls._id);

    console.log('Candidate is enrolled in', classIds.length, 'classes');

    // 2. Find all assignments for those classes
    const assignments = await Assignment.find({ 
      classId: { $in: classIds }, // $in operator matches any value in the array
      dueDate: { $gte: new Date() } // $gte = "greater than or equal to" today (upcoming)
    })
    .populate('quizId', 'title questions') // Get quiz title and questions
    .populate('classId', 'title courseCode') // Get class title and course code
    .sort({ dueDate: 1 }); // Sort by due date (1 = ascending)

    console.log('Found', assignments.length, 'upcoming assignments');

    res.status(200).json({
      success: true,
      data: assignments,
    });

  } catch (error) {
    console.error('Error fetching candidate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TheodoraQ API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        googleAuth: 'GET /api/auth/google',
      },
      quiz: {
        generate: 'POST /api/quiz/generate',
        getAll: 'GET /api/quiz',
        getById: 'GET /api/quiz/:id',
        delete: 'DELETE /api/quiz/:id',
      },
      classes: {
        create: 'POST /api/classes',
        getAll: 'GET /api/classes',
        join: 'POST /api/classes/join',
        getById: 'GET /api/classes/:id',
        update: 'PUT /api/classes/:id',
        delete: 'DELETE /api/classes/:id',
      },
      candidate: {
        myClasses: 'GET /api/candidate/my-classes',
      },
      assignments: {
        create: 'POST /api/assignments',
        getAll: 'GET /api/assignments',
        getByClass: 'GET /api/assignments/class/:classId',
        delete: 'DELETE /api/assignments/:id',
      },
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║      🚀 TheodoraQ Server Running          ║
  ║                                           ║
  ║      📍 Port: ${PORT}                        ║
  ║      🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║      🔗 URL: http://localhost:${PORT}       ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
