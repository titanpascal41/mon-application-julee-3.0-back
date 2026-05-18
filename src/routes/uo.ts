import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET toutes les UO
router.get("/", async (_req, res) => {
  try {
    const uos = await prisma.uniteOrganisationnelle.findMany({
      orderBy: { nom: "asc" },
    });
    res.json(uos);
  } catch (error) {
    console.error("Erreur lors de la récupération des UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET une UO par ID
router.get("/:id", async (req, res) => {
  try {
    const uo = await prisma.uniteOrganisationnelle.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!uo) {
      return res.status(404).json({ error: "UO introuvable" });
    }
    res.json(uo);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST créer une UO
router.post("/", async (req, res) => {
  try {
    const { code, nom, departement, chefUO, actif, societeId, projetSoumis } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé du service est requis" });
    }

    // Vérifier unicité code + societeId (si code fourni)
    if (code && code.trim() && societeId) {
      const doublon = await prisma.uniteOrganisationnelle.findFirst({
        where: { code: code.trim().toUpperCase(), societeId: parseInt(societeId) }
      });
      if (doublon) {
        return res.status(409).json({ error: `Une UO avec le code "${code.trim().toUpperCase()}" existe déjà pour cette société.` });
      }
    }

    const uo = await prisma.uniteOrganisationnelle.create({
      data: {
        code: code ? code.trim().toUpperCase() : null,
        nom: nom.trim(),
        departement: departement || null,
        chefUO: chefUO?.trim() || "",
        actif: actif === true || actif === "true",
        ...(societeId && { societeId: parseInt(societeId) }),
        ...(projetSoumis !== undefined && { projetSoumis }),
      },
    });

    await logAudit({
      action: "CREATION",
      entite: "Unité Organisationnelle",
      entiteId: uo.id,
      entiteNom: uo.nom,
      utilisateurId: getUid(req),
    });

    res.status(201).json(uo);
  } catch (error) {
    console.error("Erreur lors de la création de l'UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mettre à jour une UO
router.put("/:id", async (req, res) => {
  try {
    const { code, nom, departement, chefUO, actif, societeId, projetSoumis } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé du service est requis" });
    }

    const currentId = parseInt(req.params.id);

    // Vérifier unicité code + societeId (exclure l'UO elle-même)
    if (code && code.trim() && societeId) {
      const doublon = await prisma.uniteOrganisationnelle.findFirst({
        where: { code: code.trim().toUpperCase(), societeId: parseInt(societeId), NOT: { id: currentId } }
      });
      if (doublon) {
        return res.status(409).json({ error: `Une UO avec le code "${code.trim().toUpperCase()}" existe déjà pour cette société.` });
      }
    }

    const uo = await prisma.uniteOrganisationnelle.update({
      where: { id: currentId },
      data: {
        code: code ? code.trim().toUpperCase() : null,
        nom: nom.trim(),
        departement: departement || null,
        ...(chefUO !== undefined && { chefUO: chefUO.trim() }),
        ...(actif !== undefined && { actif: actif === true || actif === "true" }),
        ...(societeId && { societeId: parseInt(societeId) }),
        ...(projetSoumis !== undefined && { projetSoumis }),
      },
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Unité Organisationnelle",
      entiteId: uo.id,
      entiteNom: uo.nom,
      utilisateurId: getUid(req),
    });

    res.json(uo);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH activer/désactiver une UO
router.patch("/:id/activation", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actif, utilisateurId } = req.body;
    const uo = await prisma.uniteOrganisationnelle.update({
      where: { id },
      data: { actif }
    });
    await logAudit({
      action: actif ? "REACTIVATION" : "DESACTIVATION",
      entite: "Unité Organisationnelle",
      entiteId: id,
      entiteNom: uo.nom,
      utilisateurId: utilisateurId || null,
    });
    res.json(uo);
  } catch (error) {
    console.error("Erreur activation UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE supprimer une UO
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const uo = await prisma.uniteOrganisationnelle.findUnique({ where: { id } });

    // Vérifier les demandes liées
    const demandesLiees = await prisma.demande.count({ where: { uniteOrganisationnelleId: id } });
    if (demandesLiees > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${demandesLiees} demande(s) sont liées à cette UO.` });
    }

    // Vérifier les interlocuteurs liés
    const interlocuteursLies = await (prisma as any).interlocuteur.count({ where: { uoId: id } });
    if (interlocuteursLies > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${interlocuteursLies} interlocuteur(s) sont liés à cette UO.` });
    }

    await prisma.uniteOrganisationnelle.delete({ where: { id } });
    await logAudit({
      action: "SUPPRESSION",
      entite: "Unité Organisationnelle",
      entiteId: id,
      entiteNom: uo?.nom ?? null,
      utilisateurId: getUid(req),
    });
    res.json({ message: "UO supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'UO:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
