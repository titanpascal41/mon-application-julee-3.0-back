import { Router } from "express";
import { prisma } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth, JWT_SECRET } from "../middleware/auth";
import { logAudit } from "../utils/auditHelper";

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
// Verrouillage progressif : 5 min au 1er cycle de 5 échecs, 15 min au 2e, 30 min au 3e et suivants
const LOCKOUT_DURATIONS_MIN = [5, 15, 30];

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.email("Email invalide"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
});

const createUserSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.email("Email invalide"),
  motDePasse: z.string().min(6, "Mot de passe trop court (6 caractères minimum)"),
  profilId: z.coerce.number().int().positive(),
});

// Endpoint de connexion
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, motDePasse } = parsed.data;

    const utilisateur = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profil: true },
    });

    if (!utilisateur) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Vérifier si le compte est temporairement bloqué
    if (utilisateur.loginBloqueJusqu && utilisateur.loginBloqueJusqu > new Date()) {
      const restant = Math.ceil((utilisateur.loginBloqueJusqu.getTime() - Date.now()) / 60000);
      return res.status(423).json({ error: `Compte bloqué. Réessayez dans ${restant} minute(s).` });
    }

    if (utilisateur.actif === false) {
      return res.status(403).json({ error: "Votre compte est désactivé. Contactez l'administrateur." });
    }

    if (utilisateur.profil && utilisateur.profil.actif === false) {
      return res.status(403).json({ error: "Votre profil est désactivé. Contactez l'administrateur." });
    }

    const passwordMatch = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!passwordMatch) {
      const tentatives = utilisateur.loginTentatives + 1;

      if (tentatives >= MAX_LOGIN_ATTEMPTS) {
        const niveau = utilisateur.loginLockoutLevel;
        const dureeMin = LOCKOUT_DURATIONS_MIN[Math.min(niveau, LOCKOUT_DURATIONS_MIN.length - 1)];
        await prisma.user.update({
          where: { id: utilisateur.id },
          data: {
            loginTentatives: 0, // repart à zéro pour le prochain cycle de 5 tentatives
            loginBloqueJusqu: new Date(Date.now() + dureeMin * 60 * 1000),
            loginLockoutLevel: niveau + 1,
          },
        });
        return res.status(423).json({ error: `Compte bloqué ${dureeMin} minutes suite à trop d'échecs.` });
      }

      await prisma.user.update({
        where: { id: utilisateur.id },
        data: { loginTentatives: tentatives },
      });
      const restantes = MAX_LOGIN_ATTEMPTS - tentatives;
      return res.status(401).json({ error: `Email ou mot de passe incorrect. ${restantes} tentative(s) restante(s).` });
    }

    // Succès — réinitialiser le compteur et l'escalade de verrouillage
    await prisma.user.update({
      where: { id: utilisateur.id },
      data: { loginTentatives: 0, loginBloqueJusqu: null, loginLockoutLevel: 0 },
    });

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
      orderBy: { id: "desc" },
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
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { nom, prenom, email, motDePasse, profilId } = parsed.data;

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
        profilId,
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
