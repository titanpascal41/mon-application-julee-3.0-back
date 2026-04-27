import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET toutes les sociétés (actif=true par défaut, ?all=true pour toutes)
router.get("/", async (req, res) => {
  try {
    const all = req.query.all === "true";
    const societes = await prisma.societe.findMany({
      where: all ? undefined : { actif: true },
      orderBy: { id: "asc" }
    });
    return res.json(societes);
  } catch (error) {
    console.error("Erreur SELECT societes:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des sociétés", details: error instanceof Error ? error.message : String(error) });
  }
});

// PATCH société (archivage soft + mise à jour partielle)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actif, departement, nom } = req.body;

    // Bloquer la désactivation si la société est liée à une UO
    if (actif === false) {
      const uoCount = await prisma.uniteOrganisationnelle.count({
        where: { societeId: parseInt(id) }
      });
      if (uoCount > 0) {
        return res.status(409).json({
          message: `Impossible de désactiver cette société : elle est attribuée à ${uoCount} unité(s) organisationnelle(s).`
        });
      }
    }

    const data: any = {};
    if (actif !== undefined) data.actif = actif;
    if (departement !== undefined) data.departement = departement;
    if (nom !== undefined) data.nom = nom;
    const societe = await prisma.societe.update({
      where: { id: parseInt(id) },
      data
    });
    await logAudit({
      action: "MODIFICATION",
      entite: "Société",
      entiteId: societe.id,
      entiteNom: societe.nom,
      details: data,
      utilisateurId: getUid(req),
    });
    return res.json(societe);
  } catch (error) {
    console.error("Erreur PATCH societe:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de la société", details: error instanceof Error ? error.message : String(error) });
  }
});

// GET une société par id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const societe = await prisma.societe.findUnique({
      where: { id: parseInt(id) }
    });
    if (!societe) {
      return res.status(404).json({ error: "Société non trouvée" });
    }
    return res.json(societe);
  } catch (error) {
    console.error("Erreur SELECT societe:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération de la société", details: error instanceof Error ? error.message : String(error) });
  }
});

// CREATE société
router.post("/", async (req, res) => {
  try {
    const { code, nom, departement, source } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé de la société est requis" });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Le code de la société est requis" });
    }

    const codeUp = code.trim().toUpperCase();
    const dept = departement || null;
    const doublon = await prisma.societe.findFirst({
      where: { code: codeUp, departement: dept }
    });
    if (doublon) {
      return res.status(409).json({ error: `La société "${codeUp}"${dept ? ` (${dept})` : ""} existe déjà.` });
    }

    const societe = await prisma.societe.create({
      data: {
        code: codeUp,
        nom: nom.trim(),
        departement: dept,
        source: source === "ajoutee" ? "ajoutee" : "creee",
        actif: false
      }
    });

    await logAudit({
      action: "CREATION",
      entite: "Société",
      entiteId: societe.id,
      entiteNom: societe.nom,
      details: { code: societe.code, source: societe.source },
      utilisateurId: getUid(req),
    });

    return res.status(201).json(societe);
  } catch (error) {
    console.error("Erreur INSERT societe:", error);
    return res.status(500).json({ error: "Erreur lors de la création de la société", details: error instanceof Error ? error.message : String(error) });
  }
});

// UPDATE société
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, nom, departement } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le libellé de la société est requis" });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Le code de la société est requis" });
    }

    const societe = await prisma.societe.update({
      where: { id: parseInt(id) },
      data: {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        departement: departement || null
      }
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Société",
      entiteId: societe.id,
      entiteNom: societe.nom,
      utilisateurId: getUid(req),
    });

    return res.json(societe);
  } catch (error) {
    console.error("Erreur UPDATE societe:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de la société", details: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE société
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const societe = await prisma.societe.findUnique({ where: { id: parseInt(id) } });
    await prisma.societe.delete({ where: { id: parseInt(id) } });
    await logAudit({
      action: "SUPPRESSION",
      entite: "Société",
      entiteId: parseInt(id),
      entiteNom: societe?.nom ?? null,
      utilisateurId: getUid(req),
    });
    return res.json({ message: "Société supprimée" });
  } catch (error) {
    console.error("Erreur DELETE societe:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression de la société", details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
