import XLSX from 'xlsx';
import fs from 'fs';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { sendClassInvitation } from '../utils/emailService.js';

/**
 * Parse uploaded Excel/CSV file and return candidate list for preview
 * POST /api/candidate/parse-file
 */
export const parseFileForPreview = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Delete the uploaded file after reading
    fs.unlinkSync(req.file.path);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or has no valid data'
      });
    }

    // Parse candidates
    const candidates = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Extract data (handle different column name variations)
      const name = row.name || row.Name || row.NAME || 
                   row['Full Name'] || row.fullName || '';
      const email = (row.email || row.Email || row.EMAIL || '').toLowerCase().trim();

      // Validate required fields
      if (!name || !email) {
        errors.push({
          row: i + 2,
          reason: 'Missing name or email',
          data: row
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          row: i + 2,
          reason: 'Invalid email format',
          email
        });
        continue;
      }

      candidates.push({ name, email });
    }

    res.status(200).json({
      success: true,
      candidates,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0 
        ? `Parsed ${candidates.length} valid candidates, ${errors.length} rows had errors`
        : `Successfully parsed ${candidates.length} candidates`
    });

  } catch (error) {
    console.error('File parse error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to parse file',
      error: error.message
    });
  }
};

/**
 * Send invitation emails to a list of candidates
 * POST /api/candidate/send-invites
 */
export const sendBulkInvites = async (req, res) => {
  try {
    const { classId, candidates } = req.body;
    const adminId = req.user?.id || req.user?._id;

    // Validate input
    if (!classId || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and candidates list are required'
      });
    }

    // Validate class exists and belongs to admin
    const classDoc = await Class.findOne({ _id: classId, adminId });
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or you do not have permission to modify it'
      });
    }

    // Get admin details for email
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Process candidates and send invitation emails
    const results = {
      emailsSent: [],
      alreadyInvited: [],
      errors: []
    };

    for (const candidate of candidates) {
      const { name, email } = candidate;

      // Validate required fields
      if (!name || !email) {
        results.errors.push({
          reason: 'Missing name or email',
          data: candidate
        });
        continue;
      }

      try {
        // Check if user already exists and is in the class
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser && classDoc.students.includes(existingUser._id)) {
          results.alreadyInvited.push({
            name: existingUser.name,
            email: existingUser.email,
            reason: 'Already enrolled in class'
          });
          continue;
        }

        // Send invitation email
        await sendClassInvitation(
          email,
          name,
          {
            title: classDoc.title,
            courseCode: classDoc.courseCode,
            description: classDoc.description
          },
          classDoc.inviteCode,
          admin.name
        );

        results.emailsSent.push({
          name,
          email
        });

      } catch (error) {
        results.errors.push({
          reason: error.message,
          email,
          name
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Invitation emails processed',
      results: {
        total: candidates.length,
        emailsSent: results.emailsSent.length,
        alreadyInvited: results.alreadyInvited.length,
        errors: results.errors.length
      },
      details: results
    });

  } catch (error) {
    console.error('Send invites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitations',
      error: error.message
    });
  }
};

/**
 * Upload Excel/CSV file and send bulk invitation emails
 * POST /api/candidate/bulk-invite
 */
export const bulkInviteCandidates = async (req, res) => {
  try {
    const { classId } = req.body;
    const adminId = req.user?.id || req.user?._id;

    // Validate class exists and belongs to admin
    const classDoc = await Class.findOne({ _id: classId, adminId });
    if (!classDoc) {
      // Clean up uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Class not found or you do not have permission to modify it'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Delete the uploaded file after reading
    fs.unlinkSync(req.file.path);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or has no valid data'
      });
    }

    // Get admin details for email
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Process candidates and send invitation emails
    const results = {
      emailsSent: [],
      alreadyInvited: [],
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Extract data (handle different column name variations)
      const name = row.name || row.Name || row.NAME || 
                   row['Full Name'] || row.fullName || '';
      const email = (row.email || row.Email || row.EMAIL || '').toLowerCase().trim();

      // Validate required fields
      if (!name || !email) {
        results.errors.push({
          row: i + 2, // Excel rows start at 1, header is row 1
          reason: 'Missing name or email',
          data: row
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.errors.push({
          row: i + 2,
          reason: 'Invalid email format',
          email
        });
        continue;
      }

      try {
        // Check if user already exists and is in the class
        const existingUser = await User.findOne({ email });
        
        if (existingUser && classDoc.students.includes(existingUser._id)) {
          // User is already enrolled in this class
          results.alreadyInvited.push({
            name: existingUser.name,
            email: existingUser.email,
            reason: 'Already enrolled in class'
          });
          continue;
        }

        // Send invitation email
        await sendClassInvitation(
          email,
          name,
          {
            title: classDoc.title,
            courseCode: classDoc.courseCode,
            description: classDoc.description
          },
          classDoc.inviteCode,
          admin.name
        );

        results.emailsSent.push({
          name,
          email
        });

      } catch (error) {
        results.errors.push({
          row: i + 2,
          reason: error.message,
          email
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Invitation emails sent successfully',
      results: {
        total: data.length,
        emailsSent: results.emailsSent.length,
        alreadyInvited: results.alreadyInvited.length,
        errors: results.errors.length
      },
      details: results
    });

  } catch (error) {
    console.error('Bulk invite error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

/**
 * Download sample CSV/Excel template for email invitations
 * GET /api/candidate/download-template
 */
export const downloadTemplate = (req, res) => {
  try {
    // Create sample data (no password field needed anymore)
    const sampleData = [
      { name: 'John Doe', email: 'john.doe@example.com' },
      { name: 'Jane Smith', email: 'jane.smith@example.com' },
      { name: 'Bob Johnson', email: 'bob.johnson@example.com' }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=candidate-upload-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

/**
 * Get class roster for candidates (if enabled by admin)
 * GET /api/candidate/class/:classId/roster
 */
export const getClassRoster = async (req, res) => {
  try {
    const { classId } = req.params;
    const candidateId = req.user?.id || req.user?._id;

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to view the roster',
      });
    }

    // Find the class
    const classData = await Class.findById(classId)
      .populate('students', 'name registrationNumber');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check if the candidate is enrolled in this class
    const isEnrolled = classData.students.some(
      student => student._id.toString() === candidateId.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class',
      });
    }

    // Check if roster is enabled for candidates
    if (!classData.showRosterToCandidates) {
      return res.status(403).json({
        success: false,
        message: 'Class roster is not available for students',
      });
    }

    // Return class data with roster
    res.status(200).json({
      success: true,
      data: {
        _id: classData._id,
        title: classData.title,
        courseCode: classData.courseCode,
        semester: classData.semester,
        academicYear: classData.academicYear,
        students: classData.students,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching class roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class roster',
      error: error.message,
    });
  }
};

/**
 * Get class leaderboard for candidates
 * GET /api/candidate/class/:classId/leaderboard
 */
export const getClassLeaderboard = async (req, res) => {
  try {
    const { classId } = req.params;
    const candidateId = req.user?.id || req.user?._id;

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to view the leaderboard',
      });
    }

    // Import Assignment and User models
    const Assignment = (await import('../models/Assignment.js')).default;
    const User = (await import('../models/User.js')).default;

    // Find the class
    const classData = await Class.findById(classId).populate('students', 'name registrationNumber');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check if the candidate is enrolled in this class
    const isEnrolled = classData.students.some(
      student => student._id.toString() === candidateId.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class',
      });
    }

    // Check if leaderboard is enabled for candidates
    if (!classData.showLeaderboardToCandidates) {
      return res.status(403).json({
        success: false,
        message: 'Class leaderboard is not available for candidates',
      });
    }

    // Get all assignments for this class
    const assignments = await Assignment.find({ classId })
      .populate('submissions.candidateId', 'name registrationNumber');

    // Calculate rankings
    const studentStats = {};

    // Initialize stats for all enrolled students
    classData.students.forEach(student => {
      studentStats[student._id.toString()] = {
        userId: student._id,
        name: student.name,
        registrationNumber: student.registrationNumber,
        totalAssignments: assignments.length,
        completedAssignments: 0,
        totalScore: 0,
        averageScore: 0,
      };
    });

    // Calculate scores from submissions
    assignments.forEach(assignment => {
      assignment.submissions.forEach(submission => {
        const studentId = submission.candidateId._id.toString();
        if (studentStats[studentId]) {
          studentStats[studentId].completedAssignments += 1;
          studentStats[studentId].totalScore += submission.score || 0;
        }
      });
    });

    // Calculate average scores and completion percentage
    Object.values(studentStats).forEach(stat => {
      if (stat.completedAssignments > 0) {
        stat.averageScore = stat.totalScore / stat.completedAssignments;
        stat.completionRate = (stat.completedAssignments / stat.totalAssignments) * 100;
      } else {
        stat.completionRate = 0;
      }
    });

    // Sort by: 1) Completion rate (higher first), 2) Average score (higher first), 3) Total score (higher first)
    // This ensures students who complete more quizzes rank higher
    // Among those with same completion, higher average wins
    const rankings = Object.values(studentStats)
      .sort((a, b) => {
        // First priority: Completion rate (students who completed more quizzes)
        if (b.completionRate !== a.completionRate) {
          return b.completionRate - a.completionRate;
        }
        // Second priority: Average score (if completion rate is same)
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        // Third priority: Total score (tiebreaker)
        return b.totalScore - a.totalScore;
      })
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));

    // Find current user's rank and score
    const currentUserStats = rankings.find(r => r.userId.toString() === candidateId.toString());
    const currentUserRank = currentUserStats ? currentUserStats.rank : null;
    const currentUserScore = currentUserStats ? currentUserStats.averageScore : 0;

    res.status(200).json({
      success: true,
      data: {
        classTitle: classData.title,
        courseCode: classData.courseCode,
        rankings,
        currentUserRank,
        currentUserScore,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching class leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class leaderboard',
      error: error.message,
    });
  }
};

