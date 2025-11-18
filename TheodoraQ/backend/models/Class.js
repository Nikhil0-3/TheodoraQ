import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  courseCode: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Admin/teacher who created the class
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
  },
  
  // Students enrolled in the class
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Unique invite code for students to join
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Track if class is active
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Class settings
  allowLateSubmissions: {
    type: Boolean,
    default: true,
  },
  autoGrading: {
    type: Boolean,
    default: true,
  },
  showResults: {
    type: Boolean,
    default: true,
  },
  showRosterToCandidates: {
    type: Boolean,
    default: false,
  },
  showLeaderboardToCandidates: {
    type: Boolean,
    default: false,
  },
  semester: {
    type: String,
    default: '',
  },
  academicYear: {
    type: String,
    default: '',
  }
}, { 
  timestamps: true // Adds `createdAt` and `updatedAt` fields
});

const Class = mongoose.model('Class', classSchema);

export default Class;
