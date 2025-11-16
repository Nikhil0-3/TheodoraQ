import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

/**
 * Configure Google OAuth Strategy
 */
const configureGoogleOAuth = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails[0].value;
          const name = profile.displayName;
          const googleId = profile.id;
          const profilePicture = profile.photos[0]?.value || null;

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // User exists - update Google info if needed
            if (!user.googleId) {
              user.googleId = googleId;
              user.authProvider = 'google';
              user.profilePicture = profilePicture;
              user.isEmailVerified = true;
              await user.save();
            }
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            
            return done(null, user);
          }

          // User doesn't exist - create new user
          user = await User.create({
            name,
            email,
            googleId,
            profilePicture,
            authProvider: 'google',
            isEmailVerified: true,
            role: 'candidate', // Default role for new OAuth users
            lastLogin: new Date(),
          });

          return done(null, user);
        } catch (error) {
          console.error('Error in Google OAuth strategy:', error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default configureGoogleOAuth;
