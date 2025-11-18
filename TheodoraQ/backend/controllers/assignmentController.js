/**
 * Assignment Controller
 * Handles assignment creation and management
 */

import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';
import Class from '../models/Class.js';

/**
 * Create a new assignment (assign a quiz to a class)
 * POST /api/assignments
 */
export const createAssignment = async (req, res) => {
  try {
  const { quizId, classId, dueDate, timeLimit, weightage, weightageType, subgroup, subclasses } = req.body;
    const adminId = req.user?.id || req.user?._id;

    console.log('Creating assignment:', { quizId, classId, dueDate, timeLimit, weightage, weightageType, adminId });

    // Validate input
    if (!quizId || !classId || !dueDate || !timeLimit) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (quizId, classId, dueDate, timeLimit)',
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to create an assignment',
      });
    }

    // --- Security Checks ---
    // Check if the admin owns the quiz
    const quiz = await Quiz.findOne({ _id: quizId, adminId: adminId });
    if (!quiz) {
      console.log('❌ Quiz not found or admin does not own it');
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you are not the owner',
      });
    }

    // Check if the admin owns the class
    const classData = await Class.findOne({ _id: classId, adminId: adminId });
    if (!classData) {
      console.log('❌ Class not found or admin does not own it');
      return res.status(404).json({
        success: false,
        message: 'Class not found or you are not the owner',
      });
    }
    // --- End Security Checks ---

    // Filter students by subgroup and subclasses
    let filteredStudents = classData.students;
    if (subgroup) {
      // Import User model dynamically
      const User = (await import('../models/User.js')).default;
      filteredStudents = await User.find({
        _id: { $in: classData.students },
        registrationNumber: { $regex: `^${subgroup}`, $options: 'i' }
      }).select('_id');
      filteredStudents = filteredStudents.map(u => u._id);
    }
    if (subclasses && Array.isArray(subclasses) && subclasses.length > 0) {
      // Further filter by subclasses (assume subclasses are part of registrationNumber after subgroup)
      const User = (await import('../models/User.js')).default;
      filteredStudents = await User.find({
        _id: { $in: filteredStudents },
        registrationNumber: { $regex: `${subgroup}(${subclasses.join('|')})`, $options: 'i' }
      }).select('_id');
      filteredStudents = filteredStudents.map(u => u._id);
    }

    // Create the new assignment
    const newAssignment = new Assignment({
      quizId,
      classId,
      adminId,
      dueDate: new Date(dueDate),
      timeLimit: parseInt(timeLimit),
      weightage: weightage !== undefined ? Number(weightage) : 0,
      weightageType: weightageType || 'percentage',
      subgroup: subgroup || '',
      subclasses: subclasses || [],
      submissions: [], // Start with an empty list
    });

    await newAssignment.save();
    console.log('✅ Assignment created successfully:', newAssignment._id);

    // Populate the assignment with quiz and class details for the response
    await newAssignment.populate('quizId', 'title questions');
    await newAssignment.populate('classId', 'title courseCode');

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: newAssignment,
    });

  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: error.message,
    });
  }
};

/**
 * Get all assignments created by the authenticated admin
 * GET /api/assignments
 */
export const getAssignments = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;

    console.log('Fetching assignments for admin:', adminId);

    const assignments = await Assignment.find({ adminId })
      .populate('quizId', 'title questions')
      .populate('classId', 'title courseCode')
      .sort({ createdAt: -1 });

    console.log('✅ Found', assignments.length, 'assignments');

    res.status(200).json({
      success: true,
      data: assignments,
    });

  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get a single assignment for a candidate to take
 * GET /api/candidate/assignment/:assignmentId
 */
export const getSingleAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const candidateId = req.user?.id || req.user?._id;
    const candidateRole = req.user?.role;

    console.log('🔍 Fetching assignment:', assignmentId, 'for candidate:', candidateId);

    // Security check: Only Candidates can take quizzes
    if (candidateRole !== 'candidate') {
      console.log('❌ User is not a candidate:', candidateRole);
      return res.status(403).json({
        success: false,
        message: 'Only candidates can take quizzes',
      });
    }

    // Find the assignment and populate quiz details
    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: 'quizId',
        select: 'title questions',
      })
      .populate('classId', 'title');

    if (!assignment) {
      console.log('❌ Assignment not found');
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Import Class model dynamically
    const Class = (await import('../models/Class.js')).default;

    // Verify the candidate is enrolled in the class
    const classData = await Class.findOne({ 
      _id: assignment.classId._id, 
      students: candidateId 
    });
    if (!classData) {
      console.log('❌ Candidate not enrolled in class');
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in the class for this assignment',
      });
    }
    // Restrict access by subgroup (with multi-branch support)
    if (assignment.subgroup) {
      const User = (await import('../models/User.js')).default;
      const candidate = await User.findById(candidateId).select('registrationNumber');
      
      if (!candidate || !candidate.registrationNumber) {
        console.log('❌ Candidate has no registration number');
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this quiz (subgroup mismatch)',
        });
      }

      // Extract branch from registration number
      const extractBranch = (registrationNumber) => {
        if (!registrationNumber) return null;
        const regNum = registrationNumber.toString().trim();
        
        // Pattern 1: 22BCE10100 → BCE
        let match = regNum.match(/^\d{2}([A-Z]{2,4})\d+$/);
        if (match) return match[1];
        
        // Pattern 2: 2024BCE001 → BCE
        match = regNum.match(/^\d{4}([A-Z]{2,4})\d+$/);
        if (match) return match[1];
        
        // Pattern 3: BCE001 → BCE
        match = regNum.match(/^([A-Z]{2,4})\d+$/);
        if (match) return match[1];
        
        // Pattern 4: General - extract alphabetic part
        match = regNum.match(/[A-Z]{2,4}/);
        return match ? match[0] : null;
      };

      const candidateBranch = extractBranch(candidate.registrationNumber);
      
      if (!candidateBranch) {
        console.log('❌ Could not extract branch from registration:', candidate.registrationNumber);
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this quiz (subgroup mismatch)',
        });
      }

      const subgroup = assignment.subgroup.trim().toUpperCase();
      
      // Handle comma-separated branches (e.g., "BCE,MIM,BAI")
      if (subgroup.includes(',')) {
        const allowedBranches = subgroup.split(',').map(b => b.trim());
        console.log('🔍 Multi-branch check - Allowed:', allowedBranches, '| Candidate:', candidateBranch);
        
        if (!allowedBranches.includes(candidateBranch.toUpperCase())) {
          console.log('❌ Candidate branch not in allowed list');
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to access this quiz (subgroup mismatch)',
          });
        }
        console.log('✅ Candidate branch matches multi-branch assignment');
      } else {
        // Single branch - exact match
        if (candidateBranch.toUpperCase() !== subgroup) {
          console.log('❌ Candidate branch does not match:', candidateBranch, '!==', subgroup);
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to access this quiz (subgroup mismatch)',
          });
        }
        console.log('✅ Candidate branch matches single-branch assignment');
      }
    }

    // *** SECURITY: Remove answers before sending to frontend ***
    const quizData = assignment.quizId.toObject();
    // Shuffle questions for anti-cheating
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    const shuffledQuestions = shuffle([...quizData.questions]);
    const questionsForCandidate = shuffledQuestions.map(q => {
      const { answer, ...questionWithoutAnswer } = q.toObject ? q.toObject() : q;
      return questionWithoutAnswer;
    });

    // Check if candidate has already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.candidateId.toString() === candidateId.toString()
    );

    // Get class data to check late submission settings
    const ClassModel = (await import('../models/Class.js')).default;
    const classInfo = await ClassModel.findById(assignment.classId);

    // Check if assignment is past due date
    const isPastDue = new Date(assignment.dueDate) < new Date();
    const allowLateSubmissions = classInfo ? classInfo.allowLateSubmissions : false;

    console.log('✅ Sending quiz with', questionsForCandidate.length, 'questions (answers removed)');
    console.log('⏱️ Time limit being sent:', assignment.timeLimit, 'minutes');
    console.log('📊 Has submitted:', !!existingSubmission);
    console.log('📅 Is past due:', isPastDue);
    console.log('🔓 Allow late submissions:', allowLateSubmissions);
    console.log('🎥 Proctoring enabled:', assignment.proctoringEnabled || false);

    // Send the safe data to the candidate
    res.status(200).json({
      success: true,
      data: {
        assignmentId: assignment._id,
        classId: assignment.classId._id,
        className: assignment.classId.title,
        title: quizData.title,
        timeLimit: assignment.timeLimit,
        dueDate: assignment.dueDate,
        questions: questionsForCandidate,
        // Include updatedAt to help detect if assignment was modified
        updatedAt: assignment.updatedAt,
        // Include submission status
        hasSubmitted: !!existingSubmission,
        submissionScore: existingSubmission ? existingSubmission.score : null,
        isPastDue: isPastDue,
        allowLateSubmissions: allowLateSubmissions,
        // Include proctoring settings
        proctoringEnabled: assignment.proctoringEnabled || false,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment',
      error: error.message,
    });
  }
};

/**
 * Get assignments for a specific class
 * GET /api/assignments/class/:classId
 */
export const getAssignmentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const adminId = req.user?.id || req.user?._id;

    console.log('Fetching assignments for class:', classId);

    // Verify the admin owns this class
    const classData = await Class.findOne({ _id: classId, adminId: adminId });
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or you are not the owner',
      });
    }

    const assignments = await Assignment.find({ classId })
      .populate('quizId', 'title questions')
      .sort({ dueDate: 1 }); // Sort by due date (earliest first)

    console.log('✅ Found', assignments.length, 'assignments for class');

    res.status(200).json({
      success: true,
      data: assignments,
    });

  } catch (error) {
    console.error('❌ Error fetching class assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message,
    });
  }
};

/**
 * Update an assignment (edit due date and time limit)
 * PUT /api/assignments/:id
 */
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { dueDate, timeLimit, weightage, weightageType, allowRetake, subgroup, proctoringEnabled } = req.body;
    const adminId = req.user?.id || req.user?._id;

    console.log('Attempting to update assignment:', id, { dueDate, timeLimit, weightage, weightageType, allowRetake, subgroup, proctoringEnabled });

    // Find the assignment
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Security check: Only the creator can update
    if (assignment.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this assignment',
      });
    }

    // Validate input
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format',
        });
      }
      assignment.dueDate = dueDateObj;
    }

    if (timeLimit !== undefined) {
      const timeLimitNum = parseInt(timeLimit);
      if (isNaN(timeLimitNum) || timeLimitNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be a positive number',
        });
      }
      assignment.timeLimit = timeLimitNum;
    }

    // Update weightage if provided
    if (weightage !== undefined) {
      const weightageNum = parseFloat(weightage);
      if (isNaN(weightageNum) || weightageNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Weightage must be a positive number',
        });
      }
      
      // Validate percentage range
      if (weightageType === 'percentage' && weightageNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage weightage cannot exceed 100%',
        });
      }
      
      assignment.weightage = weightageNum;
      console.log(`📊 Updated weightage: ${weightageNum} ${weightageType || assignment.weightageType}`);
    }

    // Update weightage type if provided
    if (weightageType !== undefined) {
      if (!['percentage', 'marks'].includes(weightageType)) {
        return res.status(400).json({
          success: false,
          message: 'Weightage type must be either "percentage" or "marks"',
        });
      }
      assignment.weightageType = weightageType;
    }

    // Update subgroup if provided
    if (subgroup !== undefined) {
      assignment.subgroup = subgroup.trim();
      console.log(`🎯 Updated subgroup: "${assignment.subgroup}"`);
    }

    // Update proctoring setting if provided
    if (proctoringEnabled !== undefined) {
      assignment.proctoringEnabled = proctoringEnabled;
      console.log(`🎥 Updated proctoring enabled: ${proctoringEnabled}`);
    }

    // If allowRetake is explicitly set to true, clear all submissions
    if (allowRetake === true) {
      console.log('🔄 Clearing all submissions to allow retakes');
      assignment.submissions = [];
    }

    await assignment.save();
    console.log('✅ Assignment updated successfully');

    // Populate for response
    await assignment.populate('quizId', 'title questions');
    await assignment.populate('classId', 'title courseCode');

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    });

  } catch (error) {
    console.error('❌ Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: error.message,
    });
  }
};

/**
 * Delete an assignment
 * DELETE /api/assignments/:id
 */
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id;

    console.log('Attempting to delete assignment:', id);

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Security check: Only the creator can delete
    if (assignment.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this assignment',
      });
    }

    await Assignment.findByIdAndDelete(id);
    console.log('✅ Assignment deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully',
    });

  } catch (error) {
    console.error('❌ Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment',
      error: error.message,
    });
  }
};

/**
 * Get assignments for a specific class (for candidates)
 * GET /api/candidate/assignments/:classId
 */
export const getCandidateAssignments = async (req, res) => {
  try {
    const { classId } = req.params;
    const candidateId = req.user?.id || req.user?._id;
    const candidateRole = req.user?.role;

    console.log('🔍 Fetching assignments for class:', classId, 'candidate:', candidateId);

    // Security check: Only Candidates can use this endpoint
    if (candidateRole !== 'candidate') {
      console.log('❌ User is not a candidate:', candidateRole);
      return res.status(403).json({
        success: false,
        message: 'Only candidates can view assignments',
      });
    }

    // Import Class model dynamically to avoid circular dependency
    const Class = (await import('../models/Class.js')).default;

    // Find the class and check if the candidate is enrolled
    const classData = await Class.findOne({ _id: classId, students: candidateId });
    if (!classData) {
      console.log('❌ Class not found or candidate not enrolled');
      return res.status(404).json({
        success: false,
        message: 'Class not found or you are not enrolled',
      });
    }

    // Find all assignments for that class
    const assignments = await Assignment.find({ classId: classId })
      .select('dueDate timeLimit quizId submissions subgroup')
      .populate('quizId', 'title questions')
      .sort({ dueDate: 1 }); // Sort by due date (earliest first)

    // Get candidate registration number
    const User = (await import('../models/User.js')).default;
    const candidate = await User.findById(candidateId).select('registrationNumber');
    const candidateReg = candidate?.registrationNumber || '';

    console.log('📋 Candidate registration number:', candidateReg);

    // Helper function to extract branch from registration number
    const extractBranch = (registrationNumber) => {
      if (!registrationNumber) return null;
      const regNum = registrationNumber.toString().toUpperCase().trim();
      
      // Try multiple patterns
      let match = regNum.match(/^\d{2}([A-Z]{2,4})\d+$/); // 22BCE10100
      if (match) return match[1];
      
      match = regNum.match(/^\d{4}([A-Z]{2,4})\d+$/); // 2024BCE001
      if (match) return match[1];
      
      match = regNum.match(/^([A-Z]{2,4})\d+$/); // BCE001
      if (match) return match[1];
      
      match = regNum.match(/([A-Z]{2,4})/); // Any 2-4 capital letters
      if (match) return match[1];
      
      return null;
    };

    const candidateBranch = extractBranch(candidateReg);
    console.log('🎓 Extracted candidate branch:', candidateBranch);

    // Filter assignments by subgroup
    const filteredAssignments = assignments.filter(assignment => {
      // If no subgroup restriction, everyone can see it
      if (!assignment.subgroup) {
        console.log(`✅ Assignment ${assignment.quizId?.title} - No restriction (ALL)`);
        return true;
      }
      
      // If candidate has no branch, they can't take restricted quizzes
      if (!candidateBranch) {
        console.log(`❌ Assignment ${assignment.quizId?.title} - Candidate has no branch`);
        return false;
      }
      
      const subgroup = assignment.subgroup.toUpperCase();
      
      // Handle multiple branches (comma-separated)
      if (subgroup.includes(',')) {
        const allowedBranches = subgroup.split(',').map(b => b.trim());
        const isEligible = allowedBranches.includes(candidateBranch.toUpperCase());
        console.log(`${isEligible ? '✅' : '❌'} Assignment ${assignment.quizId?.title} - Multi-branch [${allowedBranches.join(', ')}] - Candidate: ${candidateBranch}`);
        return isEligible;
      }
      
      // Single branch - exact match
      const isEligible = candidateBranch.toUpperCase() === subgroup;
      console.log(`${isEligible ? '✅' : '❌'} Assignment ${assignment.quizId?.title} - Single branch [${subgroup}] - Candidate: ${candidateBranch}`);
      return isEligible;
    });

    // Add submission status for this candidate to each assignment
    const assignmentsWithStatus = filteredAssignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      const candidateSubmission = assignmentObj.submissions.find(
        sub => sub.candidateId.toString() === candidateId.toString()
      );
      
      // Check if class allows showing results to candidates
      const showScore = classData.showResults && candidateSubmission;
      
      return {
        ...assignmentObj,
        hasSubmitted: !!candidateSubmission,
        submissionScore: showScore ? candidateSubmission.score : null,
        submittedAt: candidateSubmission ? candidateSubmission.submittedAt : null,
        isLateSubmission: candidateSubmission ? candidateSubmission.isLateSubmission : false,
        allowLateSubmissions: classData.allowLateSubmissions,
      };
    });

    console.log('✅ Found', assignments.length, 'assignments, filtered to', assignmentsWithStatus.length);

    res.status(200).json({
      success: true,
      data: assignmentsWithStatus,
    });

  } catch (error) {
    console.error('❌ Error fetching candidate assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message,
    });
  }
};

/**
 * Submit a quiz for grading
 * POST /api/candidate/submit-quiz/:assignmentId
 */
export const submitQuiz = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { answers, tabSwitchCount = 0, escCount = 0, wasFullscreen = false, proctoringData = null } = req.body; // Get the candidate's answers and anti-cheat data
    const candidateId = req.user?.id || req.user?._id;

    console.log('📝 Submitting quiz for assignment:', assignmentId, 'candidate:', candidateId);
    console.log('🔒 Anti-cheat data - Tab switches:', tabSwitchCount, 'ESC count:', escCount, 'Fullscreen:', wasFullscreen);
    if (proctoringData) {
      console.log('🎥 Proctoring data:', proctoringData);
    }

    // 1. Find the assignment and the *full* quiz (with answers)
    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: 'quizId',
        model: 'Quiz', // Explicitly tell it which model
      });

    if (!assignment) {
      console.log('❌ Assignment not found');
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // 2. Check if user is enrolled
    const Class = (await import('../models/Class.js')).default;
    const classData = await Class.findOne({ 
      _id: assignment.classId, 
      students: candidateId 
    });
    
    if (!classData) {
      console.log('❌ Candidate not enrolled in class');
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class',
      });
    }

    // 3. Check if user has already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.candidateId.toString() === candidateId.toString()
    );
    
    if (existingSubmission) {
      console.log('❌ Candidate has already submitted this quiz');
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this quiz',
      });
    }

    // 3.5. Check if submission is past due and late submissions are not allowed
    const isPastDue = new Date() > new Date(assignment.dueDate);
    const isLateSubmission = isPastDue;
    
    if (isPastDue && !classData.allowLateSubmissions) {
      console.log('❌ Late submissions not allowed for this class');
      return res.status(403).json({
        success: false,
        message: 'This assignment is past due and late submissions are not allowed',
      });
    }
    
    if (isLateSubmission) {
      console.log('⚠️ This is a late submission');
    }

    // 4. --- GRADING LOGIC ---
    const correctAnswers = assignment.quizId.questions;
    let score = 0;
    let totalQuestions = correctAnswers.length;

    console.log('🔍 Grading quiz with', totalQuestions, 'questions');

    // Array to store formatted answers with correctness
    const formattedAnswers = [];

    for (const question of correctAnswers) {
      // Find the candidate's answer for this question
      // We use question._id.toString() because the keys in 'answers' are strings
      const candidateAnswer = answers[question._id.toString()];
      
      if (candidateAnswer) {
        let isCorrect = false;
        
        // For short answer questions, do case-insensitive comparison
        if (question.type === 'short_answer') {
          isCorrect = candidateAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
          console.log(`📝 Short Answer - Question: "${question.text}"`);
          console.log(`   Candidate: "${candidateAnswer}" | Correct: "${question.answer}" | Match: ${isCorrect}`);
        } else {
          // For MCQ and True/False, exact match (case-sensitive)
          isCorrect = candidateAnswer === question.answer;
        }
        
        if (isCorrect) {
          score += 1;
        }

        // Store the answer with its correctness
        formattedAnswers.push({
          questionId: question._id.toString(),
          selectedAnswer: candidateAnswer,
          isCorrect: isCorrect,
        });
      } else {
        // If no answer provided, store as incorrect
        formattedAnswers.push({
          questionId: question._id.toString(),
          selectedAnswer: '',
          isCorrect: false,
        });
      }
    }

    const percentageScore = (score / totalQuestions) * 100;

    console.log('✅ Score calculated:', score, '/', totalQuestions, '=', percentageScore.toFixed(2) + '%');
    console.log('📊 Saving', formattedAnswers.length, 'answers');

    // 5. Create the submission record with detailed answers and anti-cheat data
    const submission = {
      candidateId: candidateId,
      score: percentageScore,
      submittedAt: new Date(),
      isLateSubmission: isLateSubmission,
      tabSwitchCount: tabSwitchCount,
      escCount: escCount,
      wasFullscreen: wasFullscreen,
      answers: formattedAnswers, // Include the formatted answers
    };

    // Add proctoring data if present
    if (proctoringData) {
      submission.proctoringData = proctoringData;
      console.log('🎥 Proctoring violations saved:', proctoringData.totalViolations);
    }

    // 6. Save the submission to the assignment
    assignment.submissions.push(submission);
    await assignment.save();

    console.log('✅ Quiz submitted successfully!');

    // 7. Check if results should be shown to candidates
    const showScore = classData.showResults;
    console.log('🔍 Show results to candidate:', showScore);

    // 8. Send the result back to the candidate (conditionally show score)
    res.status(200).json({
      success: true,
      message: isLateSubmission ? 'Late submission recorded successfully!' : 'Quiz submitted successfully!',
      score: showScore ? percentageScore : null,
      totalQuestions: showScore ? totalQuestions : null,
      correctCount: showScore ? score : null,
      showResults: showScore,
      isLateSubmission: isLateSubmission,
    });

  } catch (error) {
    console.error('❌ Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get all submissions for a single assignment (for Admins)
 * GET /api/assignments/:assignmentId/submissions
 */
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const adminRole = req.user?.role;

    console.log('📊 Fetching submissions for assignment:', assignmentId, 'admin:', adminId);

    // 1. Security: Only Admins can access this
    if (adminRole !== 'admin') {
      console.log('❌ User is not an admin:', adminRole);
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only admins can view submissions.',
      });
    }

    // 2. Find the assignment and populate candidate details
    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: 'submissions.candidateId',
        model: 'User',
        select: 'name email registrationNumber',
      })
      .populate('quizId', 'title')
      .populate('classId', 'title courseCode');

    if (!assignment) {
      console.log('❌ Assignment not found');
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // 3. Security: Check if this Admin owns the assignment
    if (assignment.adminId.toString() !== adminId.toString()) {
      console.log('❌ Admin does not own this assignment');
      return res.status(403).json({
        success: false,
        message: 'You do not own this assignment',
      });
    }

    console.log('✅ Found', assignment.submissions.length, 'submissions');

    // 4. Send back the assignment details with submissions
    res.status(200).json({
      success: true,
      data: {
        assignmentId: assignment._id,
        quizTitle: assignment.quizId.title,
        classTitle: assignment.classId.title,
        courseCode: assignment.classId.courseCode,
        dueDate: assignment.dueDate,
        timeLimit: assignment.timeLimit,
        submissions: assignment.submissions,
        totalSubmissions: assignment.submissions.length,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get detailed submission with question-by-question breakdown
 * GET /api/assignments/:assignmentId/submissions/:submissionId
 */
export const getSubmissionDetails = async (req, res) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const adminId = req.user?.id || req.user?._id;
    const adminRole = req.user?.role;

    console.log('🔍 Fetching submission details:', submissionId, 'for assignment:', assignmentId);

    // 1. Security: Only Admins can access this
    if (adminRole !== 'admin') {
      console.log('❌ User is not an admin:', adminRole);
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Only admins can view submission details.',
      });
    }

    // 2. Find the assignment with full quiz details
    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: 'quizId',
        model: 'Quiz',
        select: 'title questions',
      })
      .populate({
        path: 'submissions.candidateId',
        model: 'User',
        select: 'name email registrationNumber',
      })
      .populate('classId', 'title courseCode');

    if (!assignment) {
      console.log('❌ Assignment not found');
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // 3. Security: Check if this Admin owns the assignment
    if (assignment.adminId.toString() !== adminId.toString()) {
      console.log('❌ Admin does not own this assignment');
      return res.status(403).json({
        success: false,
        message: 'You do not own this assignment',
      });
    }

    // 4. Find the specific submission
    const submission = assignment.submissions.id(submissionId);
    
    if (!submission) {
      console.log('❌ Submission not found');
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    console.log('✅ Found submission with', submission.answers.length, 'answers');

    // 5. Build detailed question breakdown
    const questionsWithAnswers = assignment.quizId.questions.map((question) => {
      // Find the candidate's answer for this question
      const candidateAnswer = submission.answers.find(
        (ans) => ans.questionId === question._id.toString()
      );

      return {
        questionId: question._id,
        questionText: question.text,
        questionType: question.type,
        options: question.options || [],
        correctAnswer: question.answer,
        candidateAnswer: candidateAnswer ? candidateAnswer.selectedAnswer : '',
        isCorrect: candidateAnswer ? candidateAnswer.isCorrect : false,
      };
    });

    // 6. Calculate statistics
    const totalQuestions = questionsWithAnswers.length;
    const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;
    const incorrectAnswers = totalQuestions - correctAnswers;

    // 7. Recalculate the actual percentage based on answers (for accuracy)
    const recalculatedPercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    // If submission has no answers array (old submission), use the stored score
    // Otherwise use the recalculated score for accuracy
    const finalScore = submission.answers.length > 0 ? recalculatedPercentage : submission.score;

    console.log('📊 Statistics - Correct:', correctAnswers, 'Incorrect:', incorrectAnswers, 'Score:', finalScore.toFixed(2) + '%');

    // 8. Send back detailed report
    res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        candidate: {
          id: submission.candidateId._id,
          name: submission.candidateId.name,
          email: submission.candidateId.email,
        },
        quiz: {
          id: assignment.quizId._id,
          title: assignment.quizId.title,
        },
        class: {
          id: assignment.classId._id,
          title: assignment.classId.title,
          courseCode: assignment.classId.courseCode,
        },
        score: finalScore,
        submittedAt: submission.submittedAt,
        statistics: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          percentage: finalScore,
        },
        questions: questionsWithAnswers,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching submission details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get all results for a class (for Results tab)
 * GET /api/assignments/class/:classId/results
 */
export const getClassResults = async (req, res) => {
  try {
    const { classId } = req.params;
    const adminId = req.user?.id || req.user?._id;

    console.log('📊 Fetching results for class:', classId);

    // Verify admin owns the class
    const classData = await Class.findOne({ _id: classId, adminId });
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or you are not authorized',
      });
    }

    // Get all assignments for this class
    const assignments = await Assignment.find({ classId })
      .populate('quizId', 'title questions')
      .lean();

    console.log(`📝 Found ${assignments.length} assignments for class`);

    // Get all submissions for these assignments
    const assignmentIds = assignments.map(a => a._id);
    
    const submissions = await Assignment.find({
      _id: { $in: assignmentIds },
      'submissions.0': { $exists: true }
    })
      .populate('submissions.candidateId', 'name email registrationNumber')
      .lean();

    console.log(`📤 Found ${submissions.length} assignments with submissions`);

    // Flatten all submissions with assignment context
    const allSubmissions = [];
    
    submissions.forEach(assignment => {
      const assignmentData = assignments.find(a => a._id.toString() === assignment._id.toString());
      const quiz = assignmentData?.quizId;
      // CRITICAL FIX: Use assignmentData (fresh query) for current weightage, not assignment (submissions query)
      const weightage = assignmentData?.weightage || 0;
      const weightageType = assignmentData?.weightageType || 'percentage';
      
      assignment.submissions.forEach(submission => {
        // IMPORTANT: Only include submissions from candidates enrolled in THIS class
        // This prevents cross-class contamination if somehow a student has submissions in multiple classes
        const candidateId = submission.candidateId?._id || submission.candidateId;
        
        // Verify the candidate is enrolled in this class
        if (!classData.students.some(studentId => studentId.toString() === candidateId.toString())) {
          console.log(`⚠️ Skipping submission from ${submission.candidateId?.name} - not enrolled in this class`);
          return; // Skip this submission
        }
        
        // The submission.score is already a percentage (0-100), not the count of correct answers!
        // This was stored during quiz submission as: score = (correctAnswers / totalQuestions) * 100
        const totalQuestions = quiz?.questions?.length || 0;
        const quizPerformancePercentage = parseFloat(submission.score) || 0; // Already a percentage!
        
        // Calculate marks obtained based on weightage type
        let marksObtained = 0;
        if (weightageType === 'percentage') {
          // For percentage weightage: student gets (their % score * weightage / 100)
          // E.g., 80% on a 20% weighted quiz = 16 points
          marksObtained = (quizPerformancePercentage * weightage) / 100;
        } else {
          // For marks weightage: student gets (their % score * total marks / 100)
          // E.g., 80% on a 6 marks quiz = 4.8 marks
          marksObtained = (quizPerformancePercentage / 100) * weightage;
        }

        // Calculate correct answers count for display
        const correctAnswersCount = Math.round((quizPerformancePercentage / 100) * totalQuestions);

        allSubmissions.push({
          assignmentId: assignment._id,
          quizTitle: quiz?.title || 'Unknown Quiz',
          candidateId: submission.candidateId,
          totalQuestions,
          score: correctAnswersCount, // Number of correct answers for display
          percentage: quizPerformancePercentage, // Quiz performance percentage (0-100)
          marksObtained: marksObtained,
          weightage: weightage,
          weightageType: weightageType,
          submittedAt: submission.submittedAt,
        });
      });
    });

    console.log(`✅ Found ${allSubmissions.length} submissions for class`);
    
    console.log('\n📊 DEBUG: Assignments being returned:');
    assignments.forEach(a => {
      const subgroupInfo = a.subgroup ? ` [${a.subgroup} only]` : ' [All students]';
      console.log(`  - ${a.quizId?.title}: ${a.weightage} ${a.weightageType}${subgroupInfo}`);
    });
    
    console.log('\n📊 DEBUG: Submissions being returned:');
    allSubmissions.forEach(sub => {
      const regNum = sub.candidateId?.registrationNumber || 'N/A';
      console.log(`  - ${sub.candidateId?.name} (${regNum}): ${sub.quizTitle} = ${sub.marksObtained.toFixed(2)} marks (${sub.percentage.toFixed(2)}%)`);
    });

    res.status(200).json({
      success: true,
      data: allSubmissions,
      assignments: assignments.map(a => ({
        _id: a._id,
        quizTitle: a.quizId?.title,
        weightage: a.weightage || 0,
        weightageType: a.weightageType || 'percentage',
        subgroup: a.subgroup || '', // Include subgroup (e.g., 'BCE', 'BAI')
      })),
    });

  } catch (error) {
    console.error('❌ Error fetching class results:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
