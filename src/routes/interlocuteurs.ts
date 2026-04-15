import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET tous les interlocuteurs
router.get("/", async (_req, res) => {
  try {
    const interlocuteurs = await prisma.interlocuteur.findMany({
      orderBy: { id: "asc" }
    });
    return res.json(interlocuteurs);
  } catch (error) {
    console.error("Erreur SELECT interlocuteurs:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des interlocuteurs", error: error instanceof Error ? error.message : error });
  }
});

// GET un interlocuteur par id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const interlocuteur = await prisma.interlocuteur.findUnique({
      where: { id: parseInt(id) }
    });
    if (!interlocuteur) {
      return res.status(404).json({ message: "Interlocuteur non trouvé" });
    }
    return res.json(interlocuteur);
  } catch (error) {
    console.error("Erreur SELECT interlocuteur:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération de l'interlocuteur", error: error instanceof Error ? error.message : error });
  }
});

// CREATE interlocuteur
router.post("/", async (req, res) => {
  try {
    const { nom, email, poste, telephone, actif, structureUO, uoId } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: "Le nom de l'interlocuteur est requis" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "L'email de l'interlocuteur est requis" });
    }

    const interlocuteur = await prisma.interlocuteur.create({
      data: {
        nom: nom.trim(),
        email: email.trim(),
        poste: poste || null,
        telephone: telephone || null,
        actif: actif ?? true,
        structureUO: structureUO || null,
        uoId: uoId ? parseInt(uoId) : null,
      }
    });

    await logAudit({
      action: "CREATION",
      entite: "Interlocuteur",
      entiteId: interlocuteur.id,
      entiteNom: interlocuteur.nom,
      details: { email: interlocuteur.email },
      utilisateurId: getUid(req),
    });

    return res.status(201).json(interlocuteur);
  } catch (error) {
    console.error("Erreur INSERT interlocuteur:", error);
    return res.status(500).json({ message: "Erreur lors de la création de l'interlocuteur", error: error instanceof Error ? error.message : error });
  }
});

// UPDATE interlocuteur
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, poste, telephone, actif, structureUO, uoId } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: "Le nom de l'interlocuteur est requis" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "L'email de l'interlocuteur est requis" });
    }

    const interlocuteur = await prisma.interlocuteur.update({
      where: { id: parseInt(id) },
      data: {
        nom: nom.trim(),
        email: email.trim(),
        poste: poste || null,
        telephone: telephone || null,
        actif: actif ?? true,
        structureUO: structureUO || null,
        uoId: uoId ? parseInt(uoId) : null,
      }
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Interlocuteur",
      entiteId: interlocuteur.id,
      entiteNom: interlocuteur.nom,
      utilisateurId: getUid(req),
    });

    return res.json(interlocuteur);
  } catch (error) {
    console.error("Erreur UPDATE interlocuteur:", error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour de l'interlocuteur", error: error instanceof Error ? error.message : error });
  }
});

// PATCH activer/désactiver un interlocuteur
router.patch("/:id/activation", async (req, res) => {
  try {
    const { id } = req.params;
    const { actif, utilisateurId } = req.body;
    const interlocuteur = await prisma.interlocuteur.update({
      where: { id: parseInt(id) },
      data: { actif }
    });
    await logAudit({
      action: actif ? "REACTIVATION" : "DESACTIVATION",
      entite: "Interlocuteur",
      entiteId: parseInt(id),
      entiteNom: interlocuteur.nom,
      utilisateurId: utilisateurId || null,
    });
    return res.json(interlocuteur);
  } catch (error) {
    console.error("Erreur activation interlocuteur:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error instanceof Error ? error.message : error });
  }
});

// DELETE interlocuteur
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const interlocuteur = await prisma.interlocuteur.findUnique({ where: { id: parseInt(id) } });
    await prisma.interlocuteur.delete({ where: { id: parseInt(id) } });
    await logAudit({
      action: "SUPPRESSION",
      entite: "Interlocuteur",
      entiteId: parseInt(id),
      entiteNom: interlocuteur?.nom ?? null,
      utilisateurId: getUid(req),
    });
    return res.json({ message: "Interlocuteur supprimé" });
  } catch (error) {
    console.error("Erreur DELETE interlocuteur:", error);
    return res.status(500).json({ message: "Erreur lors de la suppression de l'interlocuteur", error: error instanceof Error ? error.message : error });
  }
});

export default router;
