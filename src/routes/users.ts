import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

// Endpoint de connexion
router.post("/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    // Chercher l'utilisateur par email (avec le profil)
    const utilisateur = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profil: true },
    });

    if (!utilisateur) {
      console.log("Utilisateur non trouvé");
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe (simple pour l'instant)
    if (utilisateur.motDePasse !== motDePasse) {
      console.log("Mot de passe incorrect");
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Retourner l'utilisateur sans le mot de passe (avec le profil)
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    res.status(200).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur de connexion:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer un utilisateur avec son profil (pour la session)
router.get("/:id/profile", async (req, res) => {
  try {
    const utilisateur = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { profil: true },
    });
    if (!utilisateur) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;
    res.status(200).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur récupération profil utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer tous les utilisateurs (sauf admin)
router.get("/", async (req, res) => {
  try {
    const utilisateurs = await prisma.user.findMany({
      where: {
        // Masquer l'utilisateur admin (profilId: 1 pour le profil "Administrateur")
        profilId: { not: 1 }
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        profilId: true,
        // Ne PAS inclure le mot de passe dans la liste
      },
    });
    res.status(200).json(utilisateurs);
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un nouvel utilisateur
router.post("/", async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, profilId } =
      req.body;

    // Validation
    if (!nom || !prenom || !email || !motDePasse || !profilId) {
      return res
        .status(400)
        .json({ error: "Tous les champs sont obligatoires" });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    // Créer l'utilisateur (mot de passe stocké en clair pour l'instant)
    const utilisateur = await prisma.user.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.toLowerCase().trim(),
        motDePasse: motDePasse, // Stocké en clair
        profilId: parseInt(profilId),
      },
    });

    // Retourner l'utilisateur créé sans le mot de passe
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    res.status(201).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour un utilisateur
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, motDePasse, profilId } =
      req.body;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Si l'email change, vérifier qu'il n'est pas déjà utilisé
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (emailExists) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }
    }

    // Mettre à jour l'utilisateur
    const updateData: any = {
      nom: nom?.trim() || existingUser.nom,
      prenom: prenom?.trim() || existingUser.prenom,
      email: email?.toLowerCase().trim() || existingUser.email,
      profilId: profilId ? parseInt(profilId) : existingUser.profilId,
    };

    // Ajouter le mot de passe seulement s'il est fourni
    if (motDePasse) {
      updateData.motDePasse = motDePasse;
    }

    const utilisateur = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Retourner l'utilisateur mis à jour sans le mot de passe
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    res.status(200).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un utilisateur
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'utilisateur existe
    const utilisateur = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!utilisateur) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send(); // No Content
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
