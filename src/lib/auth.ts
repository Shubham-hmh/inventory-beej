import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'kisan-beej-bhandar-default-secret-key-12345';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'employee';
}

export function signToken(user: { id: string; name: string; username: string; role: 'admin' | 'employee' }): string {
  return jwt.sign(
    { 
      id: user.id, 
      name: user.name, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.id || !decoded.username || !decoded.role) {
      return null;
    }
    return {
      id: decoded.id,
      name: decoded.name,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}
