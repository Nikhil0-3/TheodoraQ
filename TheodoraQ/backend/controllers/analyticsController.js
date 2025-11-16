import Assignment from '../models/Assignment.js';
import Class from '../models/Class.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';

/**
 * Get comprehensive analytics for admin
 * GET /api/analytics/overview
 */
export const getAnalyticsOverview = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const adminRole = req.user?.role;

    console.log('📊 Fetching analytics overview for admin:', adminId);

    // Security: Only Admins can access analytics
    if (adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only admins can view analytics.',
      });
    }

    // Get all classes for this admin
    const classes = await Class.find({ adminId, isActive: true })
      .populate('students', 'name email registrationNumber');

    // Get all assignments for this admin
    const assignments = await Assignment.find({ adminId })
      .populate('quizId', 'title questions')
      .populate('classId', 'title courseCode')
      .populate('submissions.candidateId', 'name email registrationNumber');

    // Calculate overall statistics
    let totalStudents = 0;
    let totalSubmissions = 0;
    let totalQuizzes = 0;
    let allScores = [];
    const studentScores = {}; // Track individual student performance
    const questionAnalysis = {}; // Track question-level performance

    // Count unique students across all classes
    const uniqueStudents = new Set();
    classes.forEach(classItem => {
      classItem.students.forEach(student => {
        uniqueStudents.add(student._id.toString());
      });
    });
    totalStudents = uniqueStudents.size;

    // Analyze assignments and submissions
    assignments.forEach(assignment => {
      // Skip assignments with missing data
      if (!assignment.submissions || assignment.submissions.length === 0) {
        return;
      }
      
      totalQuizzes++;
      
      assignment.submissions.forEach(submission => {
        // Skip submissions without candidate data
        if (!submission.candidateId) {
          return;
        }
        
        totalSubmissions++;
        allScores.push(submission.score);

        // Track student performance
        const studentId = submission.candidateId._id.toString();
        if (!studentScores[studentId]) {
          studentScores[studentId] = {
            id: studentId,
            name: submission.candidateId.name || 'Unknown',
            email: submission.candidateId.email || 'No email',
            scores: [],
            totalQuizzes: 0,
            averageScore: 0,
          };
        }
        studentScores[studentId].scores.push(submission.score);
        studentScores[studentId].totalQuizzes++;

        // Analyze question-level performance (only for submissions with answers)
        if (submission.answers && submission.answers.length > 0) {
          submission.answers.forEach(answer => {
            if (!questionAnalysis[answer.questionId]) {
              questionAnalysis[answer.questionId] = {
                totalAttempts: 0,
                correctAttempts: 0,
                incorrectAttempts: 0,
              };
            }
            questionAnalysis[answer.questionId].totalAttempts++;
            if (answer.isCorrect) {
              questionAnalysis[answer.questionId].correctAttempts++;
            } else {
              questionAnalysis[answer.questionId].incorrectAttempts++;
            }
          });
        }
      });
    });

    // Calculate average scores for each student
    Object.values(studentScores).forEach(student => {
      const sum = student.scores.reduce((acc, score) => acc + score, 0);
      student.averageScore = student.scores.length > 0 ? sum / student.scores.length : 0;
    });

    // Sort students by average score
    const sortedStudents = Object.values(studentScores).sort((a, b) => b.averageScore - a.averageScore);

    // Calculate overall metrics
    const averageScore = allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
      : 0;

    const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0;

    // Grade distribution
    const gradeDistribution = {
      excellent: allScores.filter(s => s >= 90).length, // A (90-100)
      good: allScores.filter(s => s >= 80 && s < 90).length, // B (80-89)
      average: allScores.filter(s => s >= 70 && s < 80).length, // C (70-79)
      belowAverage: allScores.filter(s => s >= 60 && s < 70).length, // D (60-69)
      failing: allScores.filter(s => s < 60).length, // F (0-59)
    };

    // Identify weak areas (questions with low success rate)
    const weakQuestions = [];
    for (const [questionId, data] of Object.entries(questionAnalysis)) {
      const successRate = data.totalAttempts > 0
        ? (data.correctAttempts / data.totalAttempts) * 100
        : 0;
      
      if (successRate < 60 && data.totalAttempts >= 3) { // Only consider if attempted by at least 3 students
        weakQuestions.push({
          questionId,
          successRate,
          totalAttempts: data.totalAttempts,
          correctAttempts: data.correctAttempts,
          incorrectAttempts: data.incorrectAttempts,
        });
      }
    }

    // Sort weak questions by success rate (lowest first)
    weakQuestions.sort((a, b) => a.successRate - b.successRate);

    // Identify struggling students (average score < 60%)
    const strugglingStudents = sortedStudents.filter(s => s.averageScore < 60);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSubmissions = assignments.flatMap(assignment => {
      // Skip assignments with missing data
      if (!assignment.quizId || !assignment.classId || !assignment.submissions) {
        return [];
      }
      
      return assignment.submissions
        .filter(sub => sub.candidateId && new Date(sub.submittedAt) >= sevenDaysAgo)
        .map(sub => ({
          candidateName: sub.candidateId.name || 'Unknown',
          quizTitle: assignment.quizId.title || 'Unknown Quiz',
          className: assignment.classId.title || 'Unknown Class',
          score: sub.score,
          submittedAt: sub.submittedAt,
        }));
    });

    // Sort by most recent first
    recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    console.log('✅ Analytics overview generated successfully');

    // Send comprehensive analytics
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalClasses: classes.length,
          totalStudents,
          totalQuizzes,
          totalSubmissions,
          averageScore: parseFloat(averageScore.toFixed(2)),
          highestScore: parseFloat(highestScore.toFixed(2)),
          lowestScore: parseFloat(lowestScore.toFixed(2)),
        },
        gradeDistribution,
        studentPerformance: sortedStudents.slice(0, 10), // Top 10 students
        strugglingStudents: strugglingStudents.slice(0, 5), // Top 5 struggling students
        weakQuestions: weakQuestions.slice(0, 10), // Top 10 weak questions
        recentActivity: recentSubmissions.slice(0, 10), // Last 10 submissions
      },
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get detailed question-level analytics
 * GET /api/analytics/questions
 */
export const getQuestionAnalytics = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const adminRole = req.user?.role;

    console.log('📊 Fetching question analytics for admin:', adminId);

    if (adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only admins can view analytics.',
      });
    }

    // Get all assignments with submissions
    const assignments = await Assignment.find({ adminId })
      .populate('quizId', 'title questions')
      .populate('classId', 'title');

    const questionDetails = [];

    // Analyze each question across all quizzes
    assignments.forEach(assignment => {
      // Skip assignments with missing quiz or class data
      if (!assignment.quizId || !assignment.classId || !assignment.quizId.questions) {
        return;
      }
      
      assignment.quizId.questions.forEach(question => {
        const questionId = question._id.toString();
        
        // Count performance for this question
        let totalAttempts = 0;
        let correctAttempts = 0;

        if (assignment.submissions && assignment.submissions.length > 0) {
          assignment.submissions.forEach(submission => {
            if (submission.answers && submission.answers.length > 0) {
              const answer = submission.answers.find(a => a.questionId === questionId);
              if (answer) {
                totalAttempts++;
                if (answer.isCorrect) {
                  correctAttempts++;
                }
              }
            }
          });
        }

        if (totalAttempts > 0) {
          const successRate = (correctAttempts / totalAttempts) * 100;
          
          questionDetails.push({
            questionId,
            questionText: question.text || 'Unknown question',
            questionType: question.type || 'unknown',
            quizTitle: assignment.quizId.title || 'Unknown Quiz',
            className: assignment.classId.title || 'Unknown Class',
            totalAttempts,
            correctAttempts,
            incorrectAttempts: totalAttempts - correctAttempts,
            successRate: parseFloat(successRate.toFixed(2)),
          });
        }
      });
    });

    // Sort by success rate (lowest first to show problem areas)
    questionDetails.sort((a, b) => a.successRate - b.successRate);

    res.status(200).json({
      success: true,
      data: questionDetails,
    });

  } catch (error) {
    console.error('❌ Error fetching question analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get class-specific analytics
 * GET /api/analytics/class/:classId
 */
export const getClassAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const adminRole = req.user?.role;

    console.log('📊 Fetching class analytics for:', classId);

    if (adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only admins can view analytics.',
      });
    }

    // Get class details
    const classData = await Class.findById(classId)
      .populate('students', 'name email registrationNumber')
      .populate('adminId', 'name email');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Security check
    if (classData.adminId._id.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this class analytics',
      });
    }

    // Get all assignments for this class
    const assignments = await Assignment.find({ classId })
      .populate('quizId', 'title questions')
      .populate('submissions.candidateId', 'name email registrationNumber');

    // Analyze class performance
    const studentPerformance = {};
    let totalSubmissions = 0;

    assignments.forEach(assignment => {
      assignment.submissions.forEach(submission => {
        totalSubmissions++;
        const studentId = submission.candidateId._id.toString();
        
        if (!studentPerformance[studentId]) {
          studentPerformance[studentId] = {
            id: studentId,
            name: submission.candidateId.name,
            email: submission.candidateId.email,
            scores: [],
            quizzesTaken: 0,
            averageScore: 0,
          };
        }

        studentPerformance[studentId].scores.push(submission.score);
        studentPerformance[studentId].quizzesTaken++;
      });
    });

    // Calculate averages
    Object.values(studentPerformance).forEach(student => {
      const sum = student.scores.reduce((acc, score) => acc + score, 0);
      student.averageScore = student.scores.length > 0 
        ? parseFloat((sum / student.scores.length).toFixed(2))
        : 0;
    });

    const studentsArray = Object.values(studentPerformance);
    const classAverage = studentsArray.length > 0
      ? studentsArray.reduce((sum, s) => sum + s.averageScore, 0) / studentsArray.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        classInfo: {
          title: classData.title,
          courseCode: classData.courseCode,
          totalStudents: classData.students.length,
        },
        totalAssignments: assignments.length,
        totalSubmissions,
        classAverage: parseFloat(classAverage.toFixed(2)),
        studentPerformance: studentsArray.sort((a, b) => b.averageScore - a.averageScore),
      },
    });

  } catch (error) {
    console.error('❌ Error fetching class analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get detailed analytics for a specific student in a class
 * GET /api/analytics/student/:studentId/class/:classId
 */
export const getStudentAnalytics = async (req, res) => {
  try {
    const { studentId, classId } = req.params;
    const adminId = req.user?.id || req.user?._id;

    console.log('📊 Fetching student analytics:', { studentId, classId, adminId });

    // Get student info
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get all assignments for this class
    const assignments = await Assignment.find({ 
      adminId,
      classId 
    })
      .populate('quizId', 'title questions')
      .populate('submissions.candidateId', 'name email registrationNumber');

    // Filter submissions for this student
    const studentSubmissions = [];
    const questionPerformance = {}; // Track performance per question

    assignments.forEach(assignment => {
      if (!assignment.quizId || !assignment.submissions) return;

      assignment.submissions.forEach(submission => {
        if (submission.candidateId && submission.candidateId._id.toString() === studentId) {
          // Add to submissions list
          const totalQuestions = assignment.quizId.questions?.length || 0;
          let correctAnswers = 0;
          let incorrectAnswers = 0;

          // Calculate correct/incorrect from answers if available
          if (submission.answers && submission.answers.length > 0) {
            submission.answers.forEach(answer => {
              if (answer.isCorrect) {
                correctAnswers++;
              } else {
                incorrectAnswers++;
              }
            });
          } else {
            // Old submission - use total questions as incorrect
            incorrectAnswers = totalQuestions;
          }

          studentSubmissions.push({
            quizTitle: assignment.quizId.title,
            score: submission.score,
            correctAnswers,
            incorrectAnswers,
            submittedAt: submission.submittedAt,
          });

          // Track question-level performance
          if (submission.answers && submission.answers.length > 0) {
            submission.answers.forEach(answer => {
              const questionId = answer.questionId;
              
              // Find the question details
              const question = assignment.quizId.questions.find(
                q => q._id.toString() === questionId
              );

              if (question) {
                if (!questionPerformance[questionId]) {
                  questionPerformance[questionId] = {
                    questionText: question.text,
                    quizTitle: assignment.quizId.title,
                    attempts: 0,
                    correct: 0,
                  };
                }
                questionPerformance[questionId].attempts++;
                if (answer.isCorrect) {
                  questionPerformance[questionId].correct++;
                }
              }
            });
          }
        }
      });
    });

    // Calculate average score
    const averageScore = studentSubmissions.length > 0
      ? studentSubmissions.reduce((sum, sub) => sum + sub.score, 0) / studentSubmissions.length
      : 0;

    // Identify weak points (questions with < 60% success rate)
    const weakPoints = Object.values(questionPerformance)
      .map(qp => ({
        questionText: qp.questionText,
        quizTitle: qp.quizTitle,
        attempts: qp.attempts,
        successRate: (qp.correct / qp.attempts) * 100,
      }))
      .filter(qp => qp.successRate < 60)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 5); // Top 5 weak points

    // Sort submissions by date (most recent first)
    studentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    console.log('✅ Student analytics generated:', {
      totalQuizzes: studentSubmissions.length,
      averageScore: averageScore.toFixed(2),
      weakPoints: weakPoints.length,
    });

    res.json({
      success: true,
      data: {
        studentName: student.name,
        studentEmail: student.email,
        totalQuizzes: studentSubmissions.length,
        averageScore,
        weakPoints,
        attempts: studentSubmissions,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching student analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
