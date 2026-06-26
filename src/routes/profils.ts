import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET tous les profils
router.get("/", async (_req, res) => {
  try {
    const profils = await prisma.profil.findMany({
      where: { nom: { not: "admin" } },
      orderBy: { id: "desc" },
    });
    res.json(profils);
  } catch (error) {
    console.error("Erreur lors de la récupération des profils:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET un profil par id
router.get("/:id", async (req, res) => {
  try {
    const profil = await prisma.profil.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!profil) {
      return res.status(404).json({ error: "Profil non trouvé" });
    }
    res.json(profil);
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// CREATE profil
router.post("/", async (req, res) => {
  try {
    const { nom, code } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom du profil est requis" });
    }

    const profil = await prisma.profil.create({
      data: {
        nom: nom.trim(),
        code: code ? code.trim().toUpperCase() : null,
      },
    });

    await logAudit({
      action: "CREATION",
      entite: "Profil",
      entiteId: profil.id,
      entiteNom: profil.nom,
      utilisateurId: getUid(req),
    });

    res.status(201).json(profil);
  } catch (error: any) {
    console.error("Erreur lors de la création du profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// UPDATE profil
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, code } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom du profil est requis" });
    }

    const profil = await prisma.profil.update({
      where: { id: parseInt(id) },
      data: {
        nom: nom.trim(),
        code: code ? code.trim().toUpperCase() : null,
      },
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Profil",
      entiteId: profil.id,
      entiteNom: profil.nom,
      utilisateurId: getUid(req),
    });

    res.json(profil);
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH activer/désactiver un profil
router.patch("/:id/activation", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actif, motifDesactivation, utilisateurId } = req.body;

    const profil = await (prisma as any).profil.update({
      where: { id },
      data: {
        actif: Boolean(actif),
        motifDesactivation: actif ? null : (motifDesactivation || null),
      },
    });

    await logAudit({
      action: actif ? "REACTIVATION" : "DESACTIVATION",
      entite: "Profil",
      entiteId: profil.id,
      entiteNom: profil.nom,
      details: actif ? null : { motif: motifDesactivation || "" },
      utilisateurId: utilisateurId ? parseInt(utilisateurId) : null,
    });

    res.json(profil);
  } catch (error: any) {
    console.error("Erreur lors du toggle activation profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE profil
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profil = await prisma.profil.findUnique({ where: { id } });
    if (!profil) return res.status(404).json({ error: "Profil non trouvé" });

    const usersCount = await prisma.user.count({ where: { profilId: id } });
    if (usersCount > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${usersCount} utilisateur(s) utilisent ce profil` });
    }

    await prisma.profil.delete({ where: { id } });
    await logAudit({
      action: "SUPPRESSION",
      entite: "Profil",
      entiteId: id,
      entiteNom: profil?.nom ?? null,
      utilisateurId: getUid(req),
    });
    res.json({ message: "Profil supprimé" });
  } catch (error: any) {
    console.error("Erreur lors de la suppression du profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
