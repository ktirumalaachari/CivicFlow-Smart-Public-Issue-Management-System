import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/User.ts';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (clientID && clientSecret && callbackURL) {
  console.log(`[CivicFlow OAuth] Registering Google Strategy with callback: ${callbackURL}`);
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in your Google account profile'), undefined);
          }

          const selectedRole = (req.query.state as string) || 'Citizen';
          let user = await UserModel.findByEmail(email);

          if (selectedRole === 'Citizen') {
            if (!user) {
              console.log(`[CivicFlow OAuth] New Citizen ${email}. Automatically creating account...`);
              const displayName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'CivicFlow User';
              const avatar = profile.photos?.[0]?.value || null;

              const userId = await UserModel.create({
                name: displayName,
                email: email.toLowerCase(),
                role: 'Citizen',
                status: 'ACTIVE',
                googleId: profile.id,
                avatar: avatar
              });

              user = await UserModel.findById(userId);
            } else {
              if (user.status === 'SUSPENDED') {
                return done(new Error('Access denied. Your account has been suspended.'), undefined);
              }
            }
          } else if (selectedRole === 'Officer') {
            if (!user || user.role !== 'Officer') {
              return done(new Error('Officer account not found. Contact Administrator.'), undefined);
            }
            if (user.status === 'PENDING') {
              return done(new Error('Your account is awaiting Administrator approval.'), undefined);
            }
            if (user.status === 'REJECTED') {
              return done(new Error('Your registration has been rejected.'), undefined);
            }
            if (user.status === 'SUSPENDED') {
              return done(new Error('Access denied. Your account has been suspended.'), undefined);
            }
          } else if (selectedRole === 'Administrator' || selectedRole === 'ADMIN') {
            if (!user || (user.role !== 'Administrator' && user.role !== 'ADMIN')) {
              return done(new Error('Administrator account not found.'), undefined);
            }
            if (user.status === 'SUSPENDED') {
              return done(new Error('Access denied. Your account has been suspended.'), undefined);
            }
          }

          if (!user) {
            return done(new Error('Authentication failed.'), undefined);
          }

          console.log(`[CivicFlow OAuth] Found existing user for email: ${email}, logging in with role ${user.role}.`);
          return done(null, user);
        } catch (err) {
          console.error('[CivicFlow OAuth] Error in Google Strategy callback:', err);
          return done(err, undefined);
        }
      }
    )
  );
} else {
  console.warn('[CivicFlow OAuth] WARNING: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL is missing from environment. Google OAuth is disabled.');
}

// Passport session serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id || user.email);
});

passport.deserializeUser(async (id: any, done) => {
  try {
    if (typeof id === 'string') {
      // New user registration payload
      done(null, { email: id, isNewUser: true });
    } else {
      const user = await UserModel.findById(id);
      done(null, user);
    }
  } catch (err) {
    done(err, null);
  }
});

export default passport;
