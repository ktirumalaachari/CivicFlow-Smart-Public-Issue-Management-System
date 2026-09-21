import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel, User } from '../models/User.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import passport from 'passport';

const JWT_SECRET = process.env.JWT_SECRET || 'civicflow_jwt_secret_token_key_change_me_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generate Token Utility
function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE as any }
  );
}

export class AuthController {
  // 1. REGISTER USER
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, email, phone, password, role, department, googleId, avatar } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ message: 'Missing required registration fields (Name, Email, Role).' });
      return;
    }

    if (!password && !googleId) {
      res.status(400).json({ message: 'Password or Google authentication is required.' });
      return;
    }

    try {
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ message: 'An account with this email address already exists.' });
        return;
      }

      // Role check: Administrator must NEVER be allowed via registration
      if (role === 'Administrator' || role === 'ADMIN') {
        res.status(403).json({ message: 'Administrator accounts cannot be created via public registration.' });
        return;
      }

      const status = role === 'Officer' ? 'PENDING' : 'ACTIVE';

      // Create user
      const userId = await UserModel.create({
        name,
        email,
        phone: phone || null,
        password: password || null,
        role: role as any,
        department: role === 'Officer' ? department : null,
        googleId: googleId || null,
        avatar: avatar || null,
        status: status
      });

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(500).json({ message: 'Registration succeeded but user retrieval failed.' });
        return;
      }

      // Generate token (even for pending officers, we let them authenticate but block access via routing)
      const token = generateToken(user);

      res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          department: user.department,
          avatar: user.avatar
        }
      });
    } catch (err: any) {
      console.error('Registration Error:', err);
      res.status(500).json({ message: 'Internal server error occurred during registration.' });
    }
  }

  // 2. LOGIN USER
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({ message: 'Invalid credentials. User not found.' });
        return;
      }

      // Check if user is suspended
      if (user.status === 'SUSPENDED') {
        res.status(403).json({ message: 'Access denied. Your account has been suspended.' });
        return;
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      const token = generateToken(user);

      res.status(200).json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          department: user.department,
          avatar: user.avatar
        }
      });
    } catch (err) {
      console.error('Login Error:', err);
      res.status(500).json({ message: 'Internal server error occurred during login.' });
    }
  }

  // 3. GOOGLE SIGN IN (DEMO BYPASS & REAL REDIRECT MOCK)
  static async googleSignIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, name, avatar, role } = req.body;

    if (!email || !name) {
      res.status(400).json({ message: 'Google payload must contain name and email.' });
      return;
    }

    const selectedRole =
    (req.query.role as string) ||
    (req as any).session?.selectedRole ||
    'Citizen';

    try {
      let user = await UserModel.findByEmail(email);

      if (selectedRole === 'Citizen') {
        if (!user) {
          console.log(`[CivicFlow Demo Auth] Creating new Citizen: ${email}`);
          const userId = await UserModel.create({
            name,
            email: email.toLowerCase(),
            role: 'Citizen',
            status: 'ACTIVE',
            avatar: avatar || null
          });
          user = await UserModel.findById(userId);
        } else {
          if (user.status === 'SUSPENDED') {
            res.status(403).json({ message: 'Access denied. Your account has been suspended.' });
            return;
          }
        }
      } else if (selectedRole === 'Officer') {
        if (!user || user.role !== 'Officer') {
          res.status(444).json({ message: 'Officer account not found. Contact Administrator.' });
          return;
        }
        if (user.status === 'PENDING') {
          res.status(403).json({ message: 'Your account is awaiting Administrator approval.' });
          return;
        }
        if (user.status === 'REJECTED') {
          res.status(403).json({ message: 'Your registration has been rejected.' });
          return;
        }
        if (user.status === 'SUSPENDED') {
          res.status(403).json({ message: 'Access denied. Your account has been suspended.' });
          return;
        }
      } else if (selectedRole === 'Administrator' || selectedRole === 'ADMIN') {
        if (!user || (user.role !== 'Administrator' && user.role !== 'ADMIN')) {
          res.status(444).json({ message: 'Administrator account not found.' });
          return;
        }
        if (user.status === 'SUSPENDED') {
          res.status(403).json({ message: 'Access denied. Your account has been suspended.' });
          return;
        }
      }

      if (!user) {
        res.status(500).json({ message: 'Authentication failed.' });
        return;
      }

      const token = generateToken(user);

      res.status(200).json({
        message: 'Google login verified successfully.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          department: user.department,
          avatar: user.avatar
        }
      });
    } catch (err) {
      console.error('Google Auth Error:', err);
      res.status(500).json({ message: 'Internal server error during Google OAuth sync.' });
    }
  }

  // 3b. REAL GOOGLE AUTHENTICATION INITIATION
  static googleAuthInitiate(req: any, res: any, next: any): void {
    
    passport.authenticate('google', {
    scope: ['profile', 'email']
})(req,res,next);
  }

  // 3c. REAL GOOGLE AUTHENTICATION CALLBACK
  static googleAuthCallback(req: any, res: any, next: any): void {
    passport.authenticate('google', { session: false }, (err: any, user: any) => {
      if (err || !user) {
        console.error('[CivicFlow OAuth Callback Error]', err);
        return res.status(500).send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: ${JSON.stringify(err?.message || 'Authentication failed')} }, '*');
                } else {
                  window.location.href = '/?error=' + encodeURIComponent(${JSON.stringify(err?.message || 'oauth_failed')});
                }
              </script>
              <p>Authentication failed. ${err?.message || 'Please try again.'}</p>
            </body>
          </html>
        `);
      }

      if (user.status === 'SUSPENDED') {
        return res.status(403).send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: 'Your account has been suspended.' }, '*');
                } else {
                  window.location.href = '/?error=suspended';
                }
              </script>
              <p>Your account has been suspended. Please contact system administrator.</p>
            </body>
          </html>
        `);
      }

      try {
        const token = generateToken(user);
        const redirectUrl = `/?token=${encodeURIComponent(token)}`;

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Successful</title>
          </head>
          <body>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; margin-top: 50px;">
              <h2 style="color: #1e3a8a; font-size: 24px;">CivicFlow Auth Successful</h2>
              <p style="color: #64748b; font-size: 16px;">Secure token generated. Redirecting you back to dashboard...</p>
            </div>
            <script>
              const token = ${JSON.stringify(token)};
              const userObj = ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, department: user.department, avatar: user.avatar })};

              try {
                localStorage.setItem('civicflow_token', token);
              } catch (e) {
                console.error('Failed to save token to localStorage', e);
              }

              if (window.opener) {
                try {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: token, user: userObj }, '*');
                  window.close();
                } catch (err) {
                  console.error('Failed to postMessage to opener:', err);
                  window.location.href = ${JSON.stringify(redirectUrl)};
                }
              } else {
                window.location.href = ${JSON.stringify(redirectUrl)};
              }
            </script>
          </body>
          </html>
        `);
      } catch (tokenErr) {
        console.error('[CivicFlow OAuth Token Error]', tokenErr);
        res.status(500).send('An error occurred during secure token generation.');
      }
    })(req, res, next);
  }

  // 4. GET CURRENT PROFILE
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Access denied. Unauthorized.' });
      return;
    }

    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({ message: 'User profile not found.' });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          department: user.department,
          avatar: user.avatar
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving user profile.' });
    }
  }

  // 5. UPDATE PROFILE
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Access denied.' });
      return;
    }

    const { name, phone } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Name cannot be empty.' });
      return;
    }

    try {
      const success = await UserModel.updateProfile(req.user.id, name, phone);
      if (!success) {
        res.status(400).json({ message: 'Failed to update profile. User may not exist.' });
        return;
      }

      const updatedUser = await UserModel.findById(req.user.id);

      res.status(200).json({
        message: 'Profile updated successfully.',
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          role: updatedUser?.role,
          status: updatedUser?.status,
          phone: updatedUser?.phone,
          department: updatedUser?.department,
          avatar: updatedUser?.avatar
        }
      });
    } catch (err) {
      console.error('Update Profile Error:', err);
      res.status(500).json({ message: 'Error updating profile details.' });
    }
  }

  // 6. UPDATE PASSWORD
  static async updatePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Access denied.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required.' });
      return;
    }

    try {
      const user = await UserModel.findById(req.user.id);
      if (!user || !user.password) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(401).json({ message: 'Incorrect current password.' });
        return;
      }

      const success = await UserModel.updatePassword(req.user.id, newPassword);
      if (!success) {
        res.status(400).json({ message: 'Failed to reset password.' });
        return;
      }

      res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
      console.error('Password Update Error:', err);
      res.status(500).json({ message: 'Error changing password.' });
    }
  }
}
