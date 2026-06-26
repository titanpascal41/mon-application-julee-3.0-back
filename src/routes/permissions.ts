import { Router } from "express";
import { prisma } from "../db";

const router = Router();

const DEFAULT_PERMISSIONS = [
  { module: "tableau",        submodule: null,              access: true,  create: false, read: true, update: false, delete: false },
  { module: "administration", submodule: "profils",         access: false, create: false, read: true, update: false, delete: false },
  { module: "administration", submodule: "utilisateurs",    access: false, create: false, read: true, update: false, delete: false },
  { module: "parametrage",    submodule: "societes",        access: false, create: false, read: true, update: false, delete: false },
  { module: "parametrage",    submodule: "uo",              access: false, create: false, read: true, update: false, delete: false },
  { module: "parametrage",    submodule: "statuts",         access: false, create: false, read: true, update: false, delete: false },
  { module: "parametrage",    submodule: "interlocuteurs",  access: false, create: false, read: true, update: false, delete: false },
  { module: "parametrage",    submodule: "departements",    access: false, create: false, read: true, update: false, delete: false },
  { module: "demandes",       submodule: "gestion",         access: false, create: false, read: true, update: false, delete: false },
];

// GET toutes les permissions d'un profil
router.get("/profil/:profilId", async (req, res) => {
  try {
    const profil = await prisma.profil.findUnique({
      where: { id: parseInt(req.params.profilId) }
    });
    if (!profil) return res.status(404).json({ error: "Profil introuvable" });
    res.json((profil.permissions as any[]) || []);
  } catch (error) {
    console.error("Erreur GET permissions profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST créer les permissions par défaut pour un profil
router.post("/profil/:profilId/defaults", async (req, res) => {
  try {
    const profil = await prisma.profil.update({
      where: { id: parseInt(req.params.profilId) },
      data: { permissions: DEFAULT_PERMISSIONS }
    });
    res.json(profil.permissions);
  } catch (error) {
    console.error("Erreur création permissions par défaut:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mettre à jour les permissions d'un profil
router.put("/profil/:profilId", async (req, res) => {
  try {
    const { permissions } = req.body;
    const profil = await prisma.profil.update({
      where: { id: parseInt(req.params.profilId) },
      data: { permissions }
    });
    res.json(profil.permissions);
  } catch (error) {
    console.error("Erreur MAJ permissions:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET toutes les permissions d'un utilisateur (via son profil)
router.get("/user/:userId", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.userId) },
      include: { profil: true }
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json((user.profil.permissions as any[]) || []);
  } catch (error) {
    console.error("Erreur GET permissions utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET vérifier si un utilisateur a une permission spécifique
router.get("/user/:userId/check", async (req, res) => {
  try {
    const { module, submodule, action } = req.query;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.userId) },
      include: { profil: true }
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const perms = (user.profil.permissions as any[]) || [];
    const perm = perms.find((p: any) => p.module === module && p.submodule === submodule);
    if (!perm || !perm.access) return res.json({ authorized: false });

    const hasAction = action ? perm[action as string] : true;
    res.json({ authorized: !!hasAction });
  } catch (error) {
    console.error("Erreur vérification permission:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST synchroniser — s'assure que chaque profil a ses permissions
router.post("/synchronize", async (req, res) => {
  try {
    const profils = await prisma.profil.findMany();
    let count = 0;
    for (const profil of profils) {
      if (!profil.permissions) {
        await prisma.profil.update({
          where: { id: profil.id },
          data: { permissions: DEFAULT_PERMISSIONS }
        });
        count++;
      }
    }
    res.json({ success: true, message: `${count} profils mis à jour`, count });
  } catch (error) {
    console.error("Erreur synchronisation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
