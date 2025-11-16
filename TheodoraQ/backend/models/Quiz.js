// server/models/Quiz.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// This is a "sub-schema" for a single question
const questionSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'short_answer', 'true_false'],
    required: true,
  },
  options: {
    type: [String], // An array of strings
    // This will only be required if the type is 'mcq'
    default: [],
  },
  answer: {
    type: String,
    required: true,
  },
  // Image support for questions
  questionImage: {
    type: String, // Base64 encoded image or URL
    default: '',
  },
  // Images for each option (for MCQ questions)
  optionImages: {
    type: [String], // Array of base64 encoded images or URLs
    default: [],
  },
});

// This is the main Quiz model
const quizSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  subgroup: {
    type: String,
    required: false,
    trim: true,
    default: '',
    description: 'Branch or subgroup for quiz assignment (e.g., BCE, BCY)'
  },
  // This links the quiz to its creator
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Time limit in minutes
  timeLimit: {
    type: Number,
    default: 10,
    min: 1,
    max: 180,
  },
  // This embeds the array of questions
  questions: [questionSchema],
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
