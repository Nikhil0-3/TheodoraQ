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
