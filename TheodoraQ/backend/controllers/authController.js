import User from '../models/User.js';
import { sendTokenResponse } from '../utils/jwtUtils.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../config/email.js';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, registrationNumber } = req.body;

    // Validate role
    if (role && !['candidate', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "candidate" or "admin"',
      });
    }

    // Validate registration number for candidates
    if (role === 'candidate' && !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Registration number is required for candidates',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if registration number already exists (for candidates)
    if (role === 'candidate' && registrationNumber) {
      const existingRegNumber = await User.findOne({ registrationNumber: registrationNumber.toUpperCase() });
      if (existingRegNumber) {
        return res.status(400).json({
          success: false,
          message: 'This registration number is already in use',
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'candidate',
      registrationNumber: role === 'candidate' ? registrationNumber : undefined,
      authProvider: 'local',
    });

    // Send token response
    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error registering user',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is using OAuth
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please login with Google.',
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send token response
    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
    });
  }
};

/**
 * @desc    Google OAuth Success Handler
 * @route   GET /api/auth/google/callback (handled by passport)
 * @access  Public
 */
export const googleAuthSuccess = async (req, res) => {
  try {
    // User is already authenticated by passport
    const user = req.user;

    // Generate token
    const { generateToken } = await import('../utils/jwtUtils.js');
    const token = generateToken(user.getAuthPayload());

    // Redirect to frontend with token
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/auth/callback?token=${token}&role=${user.role}`);
  } catch (error) {
    console.error('Google auth success error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/auth/error?message=${encodeURIComponent('Authentication failed')}`);
  }
};

/**
 * @desc    Google OAuth Failure Handler
 * @route   GET /api/auth/google/callback (on failure)
 * @access  Public
 */
export const googleAuthFailure = (req, res) => {
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendURL}/auth/error?message=${encodeURIComponent('Google authentication failed')}`);
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    // Update user (only name, email is not allowed to change)
    const user = await User.findByIdAndUpdate(
      userId,
      { name },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile',
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is using OAuth
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for Google Sign-In accounts',
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error changing password',
    });
  }
};

/**
 * @desc    Upload user avatar
 * @route   POST /api/auth/upload-avatar
 * @access  Private
 */
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    // Generate avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user's avatar
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading avatar',
    });
  }
};

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    console.log('📧 Forgot password request received');
    console.log('Request body:', req.body);
    
    const { email } = req.body;

    // Validate input
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    console.log('🔍 Looking for user with email:', email);
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    console.log('User found:', user ? 'Yes' : 'No');

    // Security: Always return success message even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log('⚠️  User not found, but returning success message for security');
      return res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent.',
      });
    }

    // Check if user is using OAuth
    if (user.authProvider === 'google') {
      console.log('❌ User is using Google OAuth');
      return res.status(400).json({
        success: false,
        message: 'Cannot reset password for Google Sign-In accounts. Please use Google to sign in.',
      });
    }

    console.log('🔐 Generating reset token...');
    
    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (security best practice)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    console.log('💾 Saving reset token to database...');
    
    // Save hashed token and expiry to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    console.log('✅ Token saved. Attempting to send email...');
    
    // Send email with the unhashed token (this is what user clicks)
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      console.log('✅ Email sent successfully!');
      
      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email.',
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      console.error('Error details:', emailError.message);
      
      // Clear the reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
        error: emailError.message, // Add error details for debugging
      });
    }
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing password reset request',
      error: error.message, // Add error details for debugging
    });
  }
};

/**
 * @desc    Reset password using token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate input
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      });
    }

    // Check if user is using OAuth
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reset password for Google Sign-In accounts',
      });
    }

    // Update password (will be hashed by pre-save hook in User model)
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resetting password',
    });
  }
};
