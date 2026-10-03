import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import User from '../modules/users/user.model.js';
export async function requireAuth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-password');
    if (!user || !user.isActive) throw new Error('Invalid user');
    req.user = user;
    next();
  } catch { next(new ApiError(401, 'Invalid or expired token')); }
}
