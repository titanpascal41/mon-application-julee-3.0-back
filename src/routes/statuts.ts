import { Router } from "express";
import { prisma } from "../prisma";
import { logAudit } from "../utils/auditHelper";

const router = Router();

const getUid = (req: any): number | null => {
  const v = req.body?.utilisateurId ?? req.query?.utilisateurId;
  return v ? parseInt(v) : null;
};

// GET tous les statuts
router.get("/", async (_req, res) => {
  try {
    const statuts = await prisma.statut.findMany({
      orderBy: [{ ordre: 'asc' }, { id: 'asc' }]
    });
    return res.json(statuts);
  } catch (error) {
    console.error("Erreur SELECT statuts:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des statuts", details: error instanceof Error ? error.message : String(error) });
  }
});

// PUT réordonner les statuts
router.put("/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body; // [id1, id2, id3, ...]
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds doit être un tableau" });
    }
    await Promise.all(
      orderedIds.map((id: number, index: number) =>
        prisma.statut.update({ where: { id }, data: { ordre: index } })
      )
    );
    await logAudit({
      action: "MODIFICATION",
      entite: "Statut",
      entiteNom: "Réordonnancement",
      details: { orderedIds },
      utilisateurId: getUid(req),
    });
    return res.json({ message: "Ordre mis à jour" });
  } catch (error) {
    console.error("Erreur reorder statuts:", error);
    return res.status(500).json({ error: "Erreur lors du réordonnancement", details: error instanceof Error ? error.message : String(error) });
  }
});

// GET un statut par id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const statut = await prisma.statut.findUnique({
      where: { id: parseInt(id) }
    });
    if (!statut) {
      return res.status(404).json({ error: "Statut non trouvé" });
    }
    return res.json(statut);
  } catch (error) {
    console.error("Erreur SELECT statut:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération du statut", details: error instanceof Error ? error.message : String(error) });
  }
});

// CREATE statut
router.post("/", async (req, res) => {
  try {
    const { nom, description, actif } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom du statut est requis" });
    }

    const doublon = await prisma.statut.findFirst({ where: { nom: nom.trim() } });
    if (doublon) {
      return res.status(409).json({ error: `Un statut nommé "${nom.trim()}" existe déjà.` });
    }

    const statut = await prisma.statut.create({
      data: { nom: nom.trim(), description, actif: actif ?? true }
    });

    await logAudit({
      action: "CREATION",
      entite: "Statut",
      entiteId: statut.id,
      entiteNom: statut.nom,
      utilisateurId: getUid(req),
    });

    return res.status(201).json(statut);
  } catch (error) {
    console.error("Erreur INSERT statut:", error);
    return res.status(500).json({ error: "Erreur lors de la création du statut", details: error instanceof Error ? error.message : String(error) });
  }
});

// UPDATE statut
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, actif } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom du statut est requis" });
    }

    const doublon = await prisma.statut.findFirst({
      where: { nom: nom.trim(), NOT: { id: parseInt(id) } }
    });
    if (doublon) {
      return res.status(409).json({ error: `Un statut nommé "${nom.trim()}" existe déjà.` });
    }

    if (actif === false || actif === "false") {
      const demandesCount = await prisma.demande.count({ where: { statutId: parseInt(id) } });
      if (demandesCount > 0) {
        return res.status(409).json({ error: `Impossible de désactiver : ${demandesCount} demande(s) utilisent ce statut.` });
      }
    }

    const statut = await prisma.statut.update({
      where: { id: parseInt(id) },
      data: { nom: nom.trim(), description, actif: actif ?? true }
    });

    await logAudit({
      action: "MODIFICATION",
      entite: "Statut",
      entiteId: statut.id,
      entiteNom: statut.nom,
      utilisateurId: getUid(req),
    });

    return res.json(statut);
  } catch (error) {
    console.error("Erreur UPDATE statut:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour du statut", details: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE statut
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const statut = await prisma.statut.findUnique({ where: { id: parseInt(id) } });

    const demandesLiees = await prisma.demande.count({ where: { statutId: parseInt(id) } });
    if (demandesLiees > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${demandesLiees} demande(s) utilisent ce statut.` });
    }

    await prisma.statut.delete({ where: { id: parseInt(id) } });
    await logAudit({
      action: "SUPPRESSION",
      entite: "Statut",
      entiteId: parseInt(id),
      entiteNom: statut?.nom ?? null,
      utilisateurId: getUid(req),
    });
    return res.json({ message: "Statut supprimé" });
  } catch (error) {
    console.error("Erreur DELETE statut:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression du statut", details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
