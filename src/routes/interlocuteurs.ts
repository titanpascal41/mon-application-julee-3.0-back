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
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET vérifier si un interlocuteur est lié à des demandes
router.get("/:id/demandes-count", async (req, res) => {
  try {
    const itl = await prisma.interlocuteur.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!itl) return res.json({ count: 0, noms: [] });
    const rows = await prisma.$queryRawUnsafe<{ nomProjet: string }[]>(
      `SELECT nomProjet FROM demandes WHERE interlocuteurClient = ? OR interlocuteur = ?`,
      itl.nom, itl.nom
    );
    const noms = rows.map((r: any) => r.nomProjet).filter(Boolean);
    return res.json({ count: noms.length, noms });
  } catch (error) {
    return res.json({ count: 0, noms: [] });
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
      return res.status(404).json({ error: "Interlocuteur non trouvé" });
    }
    return res.json(interlocuteur);
  } catch (error) {
    console.error("Erreur SELECT interlocuteur:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// CREATE interlocuteur
router.post("/", async (req, res) => {
  try {
    const { nom, email, telephone, actif, structureUO, uoId } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom de l'interlocuteur est requis" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "L'email de l'interlocuteur est requis" });
    }

    const doublon = await prisma.interlocuteur.findUnique({ where: { email: email.trim() } });
    if (doublon) {
      return res.status(409).json({ error: `Un interlocuteur avec l'email "${email.trim()}" existe déjà.` });
    }

    const interlocuteur = await prisma.interlocuteur.create({
      data: {
        nom: nom.trim(),
        email: email.trim(),
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
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// UPDATE interlocuteur
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, telephone, actif, structureUO, uoId } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le nom de l'interlocuteur est requis" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "L'email de l'interlocuteur est requis" });
    }

    const doublon = await prisma.interlocuteur.findFirst({
      where: { email: email.trim(), NOT: { id: parseInt(id) } }
    });
    if (doublon) {
      return res.status(409).json({ error: `Un interlocuteur avec l'email "${email.trim()}" existe déjà.` });
    }

    const interlocuteur = await prisma.interlocuteur.update({
      where: { id: parseInt(id) },
      data: {
        nom: nom.trim(),
        email: email.trim(),
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
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH activer/désactiver un interlocuteur
router.patch("/:id/activation", async (req, res) => {
  try {
    const { id } = req.params;
    const { actif, utilisateurId } = req.body;

    if (actif === false) {
      const itl = await prisma.interlocuteur.findUnique({ where: { id: parseInt(id) } });
      if (itl) {
        const liees = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
          `SELECT COUNT(*) as cnt FROM demandes WHERE interlocuteurClient = ? OR interlocuteur = ?`,
          itl.nom, itl.nom
        );
        const nbLiees = Number(liees[0]?.cnt ?? 0);
        if (nbLiees > 0) {
          return res.status(409).json({ error: `Impossible de désactiver : ${nbLiees} demande(s) sont liées à cet interlocuteur.` });
        }
      }
    }

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
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE interlocuteur
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const interlocuteur = await prisma.interlocuteur.findUnique({ where: { id: parseInt(id) } });

    if (interlocuteur) {
      const liees = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
        `SELECT COUNT(*) as cnt FROM demandes WHERE interlocuteurClient = ? OR interlocuteur = ?`,
        interlocuteur.nom, interlocuteur.nom
      );
      const nbLiees = Number(liees[0]?.cnt ?? 0);
      if (nbLiees > 0) {
        return res.status(409).json({ error: `Impossible de supprimer : ${nbLiees} demande(s) sont liées à cet interlocuteur.` });
      }
    }

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
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
