// server/models/Assignment.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Schema for storing a single answer
const answerSchema = new Schema({
  questionId: {
    type: String, // Store as string since it's the _id from the questions array
    required: true,
  },
  selectedAnswer: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
}, { _id: false }); // Don't create _id for each answer subdocument

// Schema for a submission
const submissionSchema = new Schema({
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  answers: [answerSchema], // Array of candidate's answers
}, { _id: true }); // Keep _id for each submission

const assignmentSchema = new Schema({
  // Link to the Quiz being assigned
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  // Link to the Class it's assigned to
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  // Link to the Admin who assigned it
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Subgroup for assignment (e.g., BCE, BCY)
  subgroup: {
    type: String,
    trim: true,
    default: '',
    description: 'Branch or subgroup for assignment (e.g., BCE, BCY)'
  },
  // Subclasses for further filtering (array of strings)
  subclasses: {
    type: [String],
    default: [],
    description: 'Optional subclasses for more granular assignment'
  },
  // Assignment Settings
  dueDate: {
    type: Date,
    required: true,
  },
  timeLimit: {
    type: Number, // Time in minutes
    required: true,
  },
  // Weightage for grading
  weightage: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Weightage of this assignment (value depends on weightageType)'
  },
  // Weightage type (percentage or marks)
  weightageType: {
    type: String,
    enum: ['percentage', 'marks'],
    default: 'percentage',
    description: 'Type of weightage: percentage (0-100%) or marks-based'
  },
  // Submissions from candidates with detailed answers
  submissions: [submissionSchema],

}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
