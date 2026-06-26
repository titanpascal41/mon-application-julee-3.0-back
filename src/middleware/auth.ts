import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  console.error("ERREUR: le JWT_SECRET est absent dans le env");
  process.exit(1);
}

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userProfilNom?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
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

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    const nom = (req.userProfilNom || "").toLowerCase();
    if (nom !== "admin" && nom !== "administrateur") {
      return res
        .status(403)
        .json({ error: "Accès réservé aux administrateurs" });
    }
    next();
  });
}

export { JWT_SECRET };
