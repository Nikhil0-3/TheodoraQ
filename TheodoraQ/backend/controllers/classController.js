import Class from '../models/Class.js';

/**
 * Create a new class
 * POST /api/classes
 */
export const createClass = async (req, res) => {
  try {
    const { title, courseCode, description } = req.body;

    // Validate input
    if (!title || !courseCode) {
      return res.status(400).json({
        success: false,
        message: 'Title and course code are required',
      });
    }

    // Generate unique invite code
    const inviteCode = `${courseCode.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Get adminId from authenticated user
    const adminId = req.user?.id || req.user?._id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to create a class',
      });
    }

    const newClass = new Class({
      title,
      courseCode,
      description: description || '',
      inviteCode,
      adminId,
    });

    await newClass.save();
    
    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });

  } catch (error) {
    console.error('❌ Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message,
    });
  }
};

/**
 * Get all classes for the current user
 * GET /api/classes
 * Supports optional ?limit=N query parameter to limit results
 */
export const getClasses = async (req, res) => {
  try {
    // Get adminId from authenticated user
    const adminId = req.user?.id || req.user?._id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to view classes',
      });
    }

    // Get the 'limit' from the query string (e.g., /api/classes?limit=5)
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    // Prepare the query
    let query = Class.find({ adminId, isActive: true })
      .sort({ createdAt: -1 })
      .populate('adminId', 'name email')
      .populate('students', 'name email registrationNumber'); // Populate students to get count

    // Apply the limit if it exists
    if (limit) {
      query = query.limit(limit);
    }

    // Execute the query
    const classes = await query;

    res.status(200).json({
      success: true,
      data: classes,
    });

  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message,
    });
  }
};

/**
 * Get a single class by ID with full details (including populated student roster)
 * GET /api/classes/:id
 */
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    console.log('🔍 Fetching class details for ID:', id);

    // 1. Find the class by its ID and populate the students array
    const classData = await Class.findById(id)
      .populate('adminId', 'name email')
      // *** This is the magic part ***
      // .populate() will find all the Candidates in the 'students' array
      // and fetch their 'name', 'email', and 'registrationNumber' from the 'User' collection
      .populate('students', 'name email registrationNumber');

    if (!classData) {
      console.log('❌ Class not found');
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // 2. Security Check: Make sure the user requesting it is the owner
    //    Only the admin who created the class should see the full roster
    if (classData.adminId._id.toString() !== userId.toString()) {
      console.log('❌ Unauthorized access attempt by user:', userId);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this class',
      });
    }

    console.log('✅ Class details fetched successfully');
    console.log('   Students enrolled:', classData.students.length);

    // 3. Send the full class data (with the populated student list)
    res.status(200).json({
      success: true,
      data: classData,
    });

  } catch (error) {
    console.error('❌ Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class',
      error: error.message,
    });
  }
};

/**
 * Update a class
 * PUT /api/classes/:id
 */
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      courseCode, 
      description, 
      semester, 
      academicYear,
      allowLateSubmissions,
      autoGrading,
      showResults,
      showRosterToCandidates,
      showLeaderboardToCandidates
    } = req.body;

    // First, find the class to check ownership
    const classToUpdate = await Class.findById(id);

    if (!classToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Security check: Ensure the user updating is the one who created it
    const adminId = req.user?.id || req.user?._id;
    if (classToUpdate.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this class. Only the class creator can update it.',
      });
    }

    // Prepare update object with only provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (courseCode !== undefined) updateData.courseCode = courseCode;
    if (description !== undefined) updateData.description = description;
    if (semester !== undefined) updateData.semester = semester;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (allowLateSubmissions !== undefined) updateData.allowLateSubmissions = allowLateSubmissions;
    if (autoGrading !== undefined) updateData.autoGrading = autoGrading;
    if (showResults !== undefined) updateData.showResults = showResults;
    if (showRosterToCandidates !== undefined) updateData.showRosterToCandidates = showRosterToCandidates;
    if (showLeaderboardToCandidates !== undefined) updateData.showLeaderboardToCandidates = showLeaderboardToCandidates;

    // Now update the class
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    });

  } catch (error) {
    console.error('❌ Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: error.message,
    });
  }
};

/**
 * Delete a class (hard delete - permanently removes from database)
 * DELETE /api/classes/:id
 */
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // First, find the class to check ownership
    const classToDelete = await Class.findById(id);

    if (!classToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Security check: Ensure the user deleting is the one who created it
    const adminId = req.user?.id || req.user?._id;
    if (classToDelete.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this class. Only the class creator can delete it.',
      });
    }

    // Now delete the class
    await Class.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully',
    });

  } catch (error) {
    console.error('❌ Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: error.message,
    });
  }
};

/**
 * Join a class using invite code
 * POST /api/classes/join
 */
export const joinClass = async (req, res) => {
  try {
    console.log('🔵 Join class endpoint hit!');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const { inviteCode } = req.body;
    const candidateId = req.user?.id || req.user?._id;
    const candidateRole = req.user?.role;

    console.log('Extracted data:', { inviteCode, candidateId, candidateRole });

    // Validate input
    if (!inviteCode) {
      console.log('❌ No invite code provided');
      return res.status(400).json({
        success: false,
        message: 'Invite code is required',
      });
    }

    // Security Check: Only Candidates can join classes
    if (candidateRole !== 'candidate') {
      console.log('❌ User is not a candidate:', candidateRole);
      return res.status(403).json({
        success: false,
        message: 'Only candidates can join a class',
      });
    }

    console.log('🔍 Searching for class with invite code:', inviteCode);
    
    // Find the class by the invite code
    const classToJoin = await Class.findOne({ inviteCode, isActive: true });
    
    console.log('Found class:', classToJoin ? classToJoin.title : 'NOT FOUND');
    
    if (!classToJoin) {
      return res.status(404).json({
        success: false,
        message: 'Class not found. Please check the invite code.',
      });
    }

    // Check if Candidate is already in the class
    if (classToJoin.students.includes(candidateId)) {
      console.log('❌ Candidate already enrolled');
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this class',
      });
    }

    // Add the Candidate to the class
    classToJoin.students.push(candidateId);
    await classToJoin.save();

    console.log('✅ Successfully added candidate to class');

    // Populate the class data for response
    await classToJoin.populate('adminId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Successfully joined class!',
      data: classToJoin,
    });

  } catch (error) {
    console.error('❌ Error joining class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join class',
      error: error.message,
    });
  }
};

/**
 * Remove a student from a class
 * POST /api/classes/:id/remove-student
 */
export const removeStudentFromClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    const adminId = req.user?.id || req.user?._id;

    console.log('🔴 Remove student request:', { classId: id, studentId, adminId });

    // Validate input
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Find the class and verify ownership
    const classDoc = await Class.findById(id);

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Security check: Ensure the user is the class admin
    if (classDoc.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this class. Only the class creator can remove students.',
      });
    }

    // Check if student is in the class
    if (!classDoc.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in this class',
      });
    }

    // Remove the student from the class
    classDoc.students = classDoc.students.filter(
      (sid) => sid.toString() !== studentId.toString()
    );
    await classDoc.save();

    // Remove all submissions from this student in assignments for this class
    const Assignment = (await import('../models/Assignment.js')).default;
    const assignments = await Assignment.find({ classId: id });

    let totalSubmissionsRemoved = 0;
    for (const assignment of assignments) {
      const initialLength = assignment.submissions.length;
      assignment.submissions = assignment.submissions.filter(
        (sub) => sub.candidateId.toString() !== studentId.toString()
      );
      const removedCount = initialLength - assignment.submissions.length;
      if (removedCount > 0) {
        await assignment.save();
        totalSubmissionsRemoved += removedCount;
      }
    }

    console.log('✅ Student removed successfully');
    console.log(`🗑️ Removed ${totalSubmissionsRemoved} submission(s) from assignments`);

    res.status(200).json({
      success: true,
      message: `Student removed from class successfully. ${totalSubmissionsRemoved} submission(s) deleted.`,
      data: classDoc,
    });

  } catch (error) {
    console.error('❌ Error removing student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove student from class',
      error: error.message,
    });
  }
};

/**
 * Get all classes a candidate is enrolled in
 * GET /api/candidate/my-classes
 */
export const getCandidateClasses = async (req, res) => {
  try {
    const candidateId = req.user?.id || req.user?._id;
    const candidateRole = req.user?.role;

    console.log('🔍 Fetching classes for candidate:', candidateId);

    // Security check: Only Candidates can use this endpoint
    if (candidateRole !== 'candidate') {
      console.log('❌ User is not a candidate:', candidateRole);
      return res.status(403).json({
        success: false,
        message: 'Only candidates can view this',
      });
    }

    // Find all classes where the 'students' array contains the candidate's ID
    const classes = await Class.find({ students: candidateId, isActive: true })
      .select('title courseCode adminId students createdAt')
      .populate('adminId', 'name email')
      .populate('students', 'name email registrationNumber') // Populate students for count
      .sort({ createdAt: -1 });

    console.log('✅ Found', classes.length, 'classes for candidate');

    res.status(200).json({
      success: true,
      data: classes,
    });

  } catch (error) {
    console.error('❌ Error fetching candidate classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message,
    });
  }
};
