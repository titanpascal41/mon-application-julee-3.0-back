import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET all ressources
router.get("/", async (_req, res) => {
  try {
    const ressources = await prisma.ressource.findMany({
      orderBy: { dateCreation: 'desc' }
    });
    return res.json(ressources);
  } catch (error) {
    console.error("Erreur SELECT ressources:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des ressources", error: error instanceof Error ? error.message : error });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ressource = await prisma.ressource.findUnique({
      where: { id: parseInt(id) }
    });
    if (!ressource) return res.status(404).json({ message: "Ressource non trouvée" });
    return res.json(ressource);
  } catch (error) {
    console.error("Erreur SELECT ressource:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération", error: error instanceof Error ? error.message : error });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { nom, type, disponibiliteHJ, tauxJournalier } = req.body;

    if (!nom || !type || disponibiliteHJ === undefined || tauxJournalier === undefined) {
      return res.status(400).json({ message: "Les champs nom, type, disponibiliteHJ et tauxJournalier sont requis" });
    }

    const ressource = await prisma.ressource.create({
      data: {
        nom,
        type,
        disponibiliteHJ: parseFloat(disponibiliteHJ),
        tauxJournalier: parseFloat(tauxJournalier)
      }
    });
    return res.status(201).json(ressource);
  } catch (error) {
    console.error("Erreur INSERT ressource:", error);
    return res.status(500).json({ message: "Erreur lors de la création", error: error instanceof Error ? error.message : error });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, disponibiliteHJ, tauxJournalier } = req.body;

    const updateData: any = {};
    if (nom !== undefined) updateData.nom = nom;
    if (type !== undefined) updateData.type = type;
    if (disponibiliteHJ !== undefined) updateData.disponibiliteHJ = parseFloat(disponibiliteHJ);
    if (tauxJournalier !== undefined) updateData.tauxJournalier = parseFloat(tauxJournalier);

    const ressource = await prisma.ressource.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    return res.json(ressource);
  } catch (error) {
    console.error("Erreur UPDATE ressource:", error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error: error instanceof Error ? error.message : error });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ressource.delete({
      where: { id: parseInt(id) }
    });
    return res.json({ message: "Ressource supprimée" });
  } catch (error) {
    console.error("Erreur DELETE ressource:", error);
    return res.status(500).json({ message: "Erreur lors de la suppression", error: error instanceof Error ? error.message : error });
  }
});

export default router;
