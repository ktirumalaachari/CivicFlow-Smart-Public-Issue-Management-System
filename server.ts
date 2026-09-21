import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './backend/middleware/db.ts';

// Import route handlers
import authRoutes from './backend/routes/authRoutes.ts';
import complaintRoutes from './backend/routes/complaintRoutes.ts';
import dashboardRoutes from './backend/routes/dashboardRoutes.ts';
import notificationRoutes from './backend/routes/notificationRoutes.ts';
import adminRoutes from './backend/routes/adminRoutes.ts';
import officerRoutes from './backend/routes/officerRoutes.ts';
import chatRoutes from './backend/routes/chatRoutes.ts';
import { AuthController } from './backend/controllers/authController.ts';
import { authenticateJWT, requireAdmin, requireOfficer, requireCitizen } from './backend/middleware/auth.ts';
import { ComplaintController } from './backend/controllers/complaintController.ts';

// Import Passport and Strategy configuration
import passport from 'passport';
import './backend/config/passport.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // 1. Initialize DB Connection (or seamless JSON store fallback)
  await initializeDatabase();

  // 2. Global Safety Middlewares
  app.use(cors());
  
  // Configure Helmet securely with frame and content-security-policy overrides for iframe compatibility
  app.use(
    helmet({
      contentSecurityPolicy: false, // Enabled for development rendering & cross-origin loads
      frameguard: false,            // Crucial: allows rendering inside AI Studio's preview iframe
    })
  );

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize passport middleware
  app.use(passport.initialize());

  // 3. API Rate Limiting (Prevents flooding)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiter to API routes only
  app.use('/api', apiLimiter);

  // 4. Static media uploads serving
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // 5. Register REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/officers', officerRoutes);
  app.use('/api/chat', chatRoutes);
  // Specific role-based complaint routes requested by user
  
  app.get('/api/citizen/complaints', authenticateJWT as any, requireCitizen as any, ComplaintController.getCitizenComplaints);
  app.get('/api/officer/complaints', authenticateJWT as any, requireOfficer as any, ComplaintController.getOfficerComplaints);
  app.get('/api/admin/complaints', authenticateJWT as any, requireAdmin as any, ComplaintController.getAdminComplaints);

  // Exact Root-Level Google OAuth routes (Redirects and Callbacks)
  app.get('/auth/google', AuthController.googleAuthInitiate);
  app.get(['/auth/google/callback', '/auth/google/callback/'], AuthController.googleAuthCallback);

  // Simple API Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // 6. Vite Integration as Middleware (for zero-latency hot reloads) or Static Production Server
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CivicFlow Server] Running in DEVELOPMENT mode. Mounting Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[CivicFlow Server] Running in PRODUCTION mode. Serving static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CivicFlow Server] Server actively listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[CivicFlow Startup Error] Server crashed on initialization:', error);
});
