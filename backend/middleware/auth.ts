import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'civicflow_jwt_secret_token_key_change_me_in_production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'Citizen' | 'Officer' | 'Administrator' | 'ADMIN';
    department?: string;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  };
}

export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ message: 'Access denied. Missing or malformed authorization token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Fetch the user from the database to check the latest status and role
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User account not found.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ message: 'Access denied. Your account has been suspended.' });
      return;
    }

    req.user = {
      id: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status
    };
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired authorization token.' });
  }
}

export function requireCitizen(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }
  if (req.user.role !== 'Citizen') {
    res.status(403).json({ message: 'Access denied. Citizen role required.' });
    return;
  }
  next();
}

export function requireOfficer(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }
  if (req.user.role !== 'Officer') {
    res.status(403).json({ message: 'Access denied. Officer role required.' });
    return;
  }
  if (req.user.status === 'PENDING') {
    res.status(403).json({ message: 'Your officer registration is awaiting administrator approval.' });
    return;
  }
  if (req.user.status === 'REJECTED') {
    res.status(403).json({ message: 'Your officer registration was rejected.' });
    return;
  }
  if (req.user.status !== 'ACTIVE') {
    res.status(403).json({ message: 'Access denied. Active officer account required.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }
  if (req.user.role !== 'Administrator' && req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Access denied. Administrator role required.' });
    return;
  }
  if (req.user.status !== 'ACTIVE') {
    res.status(403).json({ message: 'Access denied. Active admin account required.' });
    return;
  }
  next();
}

export function authorizeRoles(roles: Array<'Citizen' | 'Officer' | 'Administrator' | 'ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }
    
    const hasRole = roles.some(role => {
      if (role === 'Administrator' || role === 'ADMIN') {
        return req.user?.role === 'Administrator' || req.user?.role === 'ADMIN';
      }
      return req.user?.role === role;
    });

    if (!hasRole) {
      res.status(403).json({ message: 'Forbidden. You do not have permission to access this resource.' });
      return;
    }

    if (req.user.role === 'Officer' && req.user.status !== 'ACTIVE') {
      if (req.user.status === 'PENDING') {
        res.status(403).json({ message: 'Your officer registration is awaiting administrator approval.' });
      } else if (req.user.status === 'REJECTED') {
        res.status(403).json({ message: 'Your officer registration was rejected.' });
      } else {
        res.status(403).json({ message: 'Access denied. Active account required.' });
      }
      return;
    }

    next();
  };
}
