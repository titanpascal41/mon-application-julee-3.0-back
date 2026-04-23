import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "julee_secret_key_change_in_production_2024";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userProfilNom?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userProfilNom = decoded.profilNom;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.userProfilNom !== "admin") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs" });
    }
    next();
  });
}

export { JWT_SECRET };
