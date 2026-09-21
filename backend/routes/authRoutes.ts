import { Router } from 'express';
import { AuthController } from '../controllers/authController.ts';
import { authenticateJWT } from '../middleware/auth.ts';

const router = Router();

// Registration & Standard Email Login
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Google Sign-In Payload Route (Handles Client-side OAuth payload validation or Mock OAuth sync)
router.post('/google', AuthController.googleSignIn);

// Real Google OAuth Redirect and Callback routes
router.get('/google', AuthController.googleAuthInitiate);
router.get(['/google/callback', '/google/callback/'], AuthController.googleAuthCallback);

// Profile Management (Protected)
router.get('/profile', authenticateJWT as any, AuthController.getProfile);
router.put('/profile', authenticateJWT as any, AuthController.updateProfile);
router.put('/password', authenticateJWT as any, AuthController.updatePassword);

export default router;
