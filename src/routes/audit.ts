import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /audit — Récupérer tous les logs d'audit
router.get("/", async (_req, res) => {
  try {
    const logs = await (prisma as any).auditLog.findMany({
      orderBy: { date: "desc" },
    });

    // Enrichir avec le nom de l'utilisateur
    const userIds: number[] = [...new Set(
      logs.filter((l: any) => l.utilisateurId).map((l: any) => l.utilisateurId)
    )] as number[];

    let userMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const users = await (prisma as any).utilisateur.findMany({
        where: { id: { in: userIds } },
        select: { id: true, prenom: true, nom: true },
      });
      userMap = Object.fromEntries(
        users.map((u: any) => [u.id, `${u.prenom} ${u.nom}`.trim()])
      );
    }

    const logsEnrichis = logs.map((l: any) => ({
      ...l,
      utilisateurNom: l.utilisateurId ? (userMap[l.utilisateurId] || null) : null,
    }));

    res.json(logsEnrichis);
  } catch (error) {
    console.error("Erreur chargement piste d'audit:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
