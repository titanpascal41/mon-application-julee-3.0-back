import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /audit — Récupérer tous les logs d'audit
router.get("/", async (_req, res) => {
  try {
    const logs = await (prisma as any).auditLog.findMany({
      orderBy: { date: "desc" },
    });
    res.json(logs);
  } catch (error) {
    console.error("Erreur chargement piste d'audit:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
