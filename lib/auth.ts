// lib/auth.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "fallback-secret";

export function generateToken(payload: { authenticated: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): { authenticated: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { authenticated: boolean };
    return decoded;
  } catch (error) {
    return null;
  }
}
