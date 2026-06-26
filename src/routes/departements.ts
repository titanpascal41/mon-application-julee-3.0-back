import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET tous les départements (optionnellement filtrés par société)
router.get("/", async (req, res) => {
  try {
    const { societeId } = req.query;
    const departements = await prisma.departement.findMany({
      where: societeId ? { societeId: parseInt(societeId as string) } : undefined,
      include: { societe: { select: { id: true, code: true, nom: true } } },
      orderBy: { id: "desc" },
    });
    res.json(departements);
  } catch (error) {
    console.error("Erreur lors de la récupération des départements:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET un département par ID
router.get("/:id", async (req, res) => {
  try {
    const departement = await prisma.departement.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { societe: { select: { id: true, code: true, nom: true } } },
    });
    if (!departement) {
      return res.status(404).json({ error: "Département introuvable" });
    }
    res.json(departement);
  } catch (error) {
    console.error("Erreur lors de la récupération du département:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST créer un département
router.post("/", async (req, res) => {
  try {
    const { code, nom, societeId, actif } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Le code du département est requis" });
    }
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé du département est requis" });
    }
    if (!societeId) {
      return res.status(400).json({ error: "La société est requise" });
    }

    const societe = await prisma.societe.findUnique({ where: { id: parseInt(societeId) } });
    if (!societe) {
      return res.status(400).json({ error: "La société sélectionnée n'existe pas" });
    }

    const doublonNom = await prisma.departement.findFirst({
      where: { nom: nom.trim(), societeId: parseInt(societeId) },
    });
    if (doublonNom) {
      return res.status(409).json({ error: `Le département "${nom.trim()}" existe déjà pour cette société.` });
    }

    const doublonCode = await prisma.departement.findFirst({
      where: { code: code.trim().toUpperCase(), societeId: parseInt(societeId) },
    });
    if (doublonCode) {
      return res.status(409).json({ error: `Le code "${code.trim().toUpperCase()}" existe déjà pour cette société.` });
    }

    const departement = await prisma.departement.create({
      data: {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        societeId: parseInt(societeId),
        actif: actif === undefined ? true : actif === true || actif === "true",
      },
    });

    await logAudit({
      action: "CREATION",
      entite: "Département",
      entiteId: departement.id,
      entiteNom: departement.nom,
      utilisateurId: getUid(req),
    });

    res.status(201).json(departement);
  } catch (error) {
    console.error("Erreur lors de la création du département:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mettre à jour un département
router.put("/:id", async (req, res) => {
  try {
    const { code, nom, societeId, actif } = req.body;
    const currentId = parseInt(req.params.id);

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Le code du département est requis" });
    }
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé du département est requis" });
    }
    if (!societeId) {
      return res.status(400).json({ error: "La société est requise" });
    }

    const societe = await prisma.societe.findUnique({ where: { id: parseInt(societeId) } });
    if (!societe) {
      return res.status(400).json({ error: "La société sélectionnée n'existe pas" });
    }

    const doublonNom = await prisma.departement.findFirst({
      where: { nom: nom.trim(), societeId: parseInt(societeId), NOT: { id: currentId } },
    });
    if (doublonNom) {
      return res.status(409).json({ error: `Le département "${nom.trim()}" existe déjà pour cette société.` });
    }

    const doublonCode = await prisma.departement.findFirst({
      where: { code: code.trim().toUpperCase(), societeId: parseInt(societeId), NOT: { id: currentId } },
    });
    if (doublonCode) {
      return res.status(409).json({ error: `Le code "${code.trim().toUpperCase()}" existe déjà pour cette société.` });
    }

    const departement = await prisma.departement.update({
      where: { id: currentId },
      data: {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        societeId: parseInt(societeId),
        ...(actif !== undefined && { actif: actif === true || actif === "true" }),
      },
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Département",
      entiteId: departement.id,
      entiteNom: departement.nom,
      utilisateurId: getUid(req),
    });

    res.json(departement);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du département:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH activer/désactiver un département
router.patch("/:id/activation", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actif, utilisateurId } = req.body;

    const departement = await prisma.departement.update({
      where: { id },
      data: { actif: actif === true || actif === "true" },
    });

    await logAudit({
      action: actif ? "REACTIVATION" : "DESACTIVATION",
      entite: "Département",
      entiteId: id,
      entiteNom: departement.nom,
      utilisateurId: utilisateurId || null,
    });

    res.json(departement);
  } catch (error) {
    console.error("Erreur activation département:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE supprimer un département
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const departement = await prisma.departement.findUnique({ where: { id } });

    if (!departement) {
      return res.status(404).json({ error: "Département introuvable" });
    }

    await prisma.departement.delete({ where: { id } });

    await logAudit({
      action: "SUPPRESSION",
      entite: "Département",
      entiteId: id,
      entiteNom: departement.nom,
      utilisateurId: getUid(req),
    });

    res.json({ message: "Département supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du département:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;