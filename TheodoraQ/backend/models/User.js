import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    registrationNumber: {
      type: String,
      required: function () {
        // Registration number is required only for candidates
        return this.role === 'candidate';
      },
      unique: true,
      sparse: true, // Allows null values but ensures uniqueness for non-null
      trim: true,
      uppercase: true,
    },
    password: {
      type: String,
      required: function () {
        // Password is required only if not using OAuth
        return !this.googleId;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['candidate', 'admin'],
      default: 'candidate',
    },
    // Google OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but ensures uniqueness for non-null
    },
    profilePicture: {
      type: String,
      default: null,
    },
    // Authentication method
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Test-related data for candidates
    testsCompleted: [
      {
        testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        score: Number,
        completedAt: Date,
        status: {
          type: String,
          enum: ['passed', 'failed'],
        },
      },
    ],
    testsInProgress: [
      {
        testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        startedAt: Date,
      },
    ],
    // Last login tracking
    lastLogin: {
      type: Date,
      default: null,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // Don't hash if using OAuth
  if (this.authProvider === 'google') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // Get the password field (since it's select: false by default)
    if (!this.password) {
      const user = await mongoose.model('User').findById(this._id).select('+password');
      return await bcrypt.compare(candidatePassword, user.password);
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Method to generate auth token payload
userSchema.methods.getAuthPayload = function () {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    registrationNumber: this.registrationNumber,
    profilePicture: this.profilePicture,
  };
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
