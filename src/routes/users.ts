import { Router } from "express";
import { prisma } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { requireAuth, JWT_SECRET } from "../middleware/auth";
import { logAudit } from "../utils/auditHelper";

const SALT_ROUNDS = 10;

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

    // Vérifier le mot de passe avec bcrypt
    const passwordMatch = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    if (utilisateur.actif === false) {
      return res.status(403).json({ error: "Votre compte est désactivé. Contactez l'administrateur." });
    }

    // Vérifier que le profil est actif
    if (utilisateur.profil && utilisateur.profil.actif === false) {
      return res.status(403).json({ error: "Votre profil est désactivé. Contactez l'administrateur." });
    }

    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    const token = jwt.sign(
      { userId: utilisateur.id, email: utilisateur.email, profilNom: utilisateur.profil?.nom },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({ token, utilisateur: utilisateurSansPassword });
  } catch (error) {
    console.error("Erreur de connexion:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer un utilisateur avec son profil (pour la session)
router.get("/:id/profile", requireAuth, async (req, res) => {
  try {
    const utilisateur = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { profil: true },
    });
    if (!utilisateur) return res.status(404).json({ error: "Utilisateur non trouvé" });
    if (utilisateur.profil && utilisateur.profil.actif === false) {
      return res.status(403).json({ error: "Votre profil est désactivé. Contactez l'administrateur." });
    }
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;
    res.status(200).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur récupération profil utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer tous les utilisateurs (sauf admin)
router.get("/", requireAuth, async (_req, res) => {
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
        actif: true,
      },
    });
    res.status(200).json(utilisateurs);
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Créer un nouvel utilisateur
router.post("/", requireAuth, async (req, res) => {
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

    const hashedPassword = await bcrypt.hash(motDePasse, SALT_ROUNDS);
    const utilisateur = await prisma.user.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.toLowerCase().trim(),
        motDePasse: hashedPassword,
        profilId: parseInt(profilId),
      },
    });

    // Retourner l'utilisateur créé sans le mot de passe
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    await logAudit({
      action: "CREATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      entiteNom: `${prenom} ${nom}`,
      details: { email: utilisateur.email, profilId: utilisateur.profilId },
      utilisateurId: (req as any).user?.id ?? null,
    });

    res.status(201).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Mettre à jour un utilisateur
router.put("/:id", requireAuth, async (req, res) => {
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
    const { avatar } = req.body;
    const updateData: any = {
      nom: nom?.trim() || existingUser.nom,
      prenom: prenom?.trim() || existingUser.prenom,
      email: email?.toLowerCase().trim() || existingUser.email,
      profilId: profilId ? parseInt(profilId) : existingUser.profilId,
    };

    if (avatar !== undefined) updateData.avatar = avatar;

    // Hasher le mot de passe seulement s'il est fourni
    if (motDePasse) {
      updateData.motDePasse = await bcrypt.hash(motDePasse, SALT_ROUNDS);
    }

    const utilisateur = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Retourner l'utilisateur mis à jour sans le mot de passe
    const { motDePasse: _, ...utilisateurSansPassword } = utilisateur;

    await logAudit({
      action: "MODIFICATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      entiteNom: `${utilisateur.prenom} ${utilisateur.nom}`,
      details: { email: utilisateur.email, profilId: utilisateur.profilId, motDePasseModifie: !!motDePasse },
      utilisateurId: (req as any).user?.id ?? null,
    });

    res.status(200).json(utilisateurSansPassword);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Activer / désactiver un utilisateur
router.patch("/:id/activation", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;
    const utilisateur = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { actif },
      select: { id: true, nom: true, prenom: true, email: true, profilId: true, actif: true },
    });
    await logAudit({
      action: actif ? "REACTIVATION" : "DESACTIVATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      entiteNom: `${utilisateur.prenom} ${utilisateur.nom}`,
      utilisateurId: (req as any).user?.id ?? null,
    });
    res.status(200).json(utilisateur);
  } catch (error) {
    console.error("Erreur activation utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un utilisateur
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    if (!utilisateur) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const demandesLiees = await prisma.demande.count({ where: { utilisateurId: parseInt(id) } });
    if (demandesLiees > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${demandesLiees} demande(s) ont été créées par cet utilisateur.` });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });

    await logAudit({
      action: "SUPPRESSION",
      entite: "Utilisateur",
      entiteId: parseInt(id),
      entiteNom: `${utilisateur.prenom} ${utilisateur.nom}`,
      details: { email: utilisateur.email, profilId: utilisateur.profilId },
      utilisateurId: (req as any).user?.id ?? null,
    });

    res.status(204).send(); // No Content
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
