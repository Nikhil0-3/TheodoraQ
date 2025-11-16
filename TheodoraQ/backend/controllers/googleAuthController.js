import User from '../models/User.js';
import { generateToken } from '../utils/jwtUtils.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Google OAuth login/signup
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google credential is required' 
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not provided by Google' 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (user) {
      // User exists - LOGIN MODE
      // No role checking needed, just log them in with their existing role
      
      // Update Google info if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.profilePicture = picture;
        user.isEmailVerified = true;
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();

    } else {
      // User doesn't exist - SIGNUP MODE
      // Role is required for new users
      if (!role || !['candidate', 'admin'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please select an account type (candidate or admin) to sign up.' 
        });
      }
      
      // Create new user
      isNewUser = true;
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        role,
        authProvider: 'google',
        profilePicture: picture,
        isEmailVerified: true,
        lastLogin: new Date()
      });
    }

    // Generate token
    const token = generateToken(user.getAuthPayload());

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Google token expired. Please try again.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication error'
    });
  }
};
