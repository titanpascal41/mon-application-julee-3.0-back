import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET tous les demandes (filtrées par utilisateur si spécifié)
router.get("/", async (req, res) => {
  try {
    const utilisateurId = req.query.utilisateurId
      ? parseInt(req.query.utilisateurId as string)
      : null;

    // Si utilisateurId est spécifié, vérifier si c'est un admin
    let whereClause = {};
    
    if (utilisateurId) {
      // Vérifier si l'utilisateur est admin (profilId: 1)
      const utilisateur = await prisma.user.findUnique({
        where: { id: utilisateurId },
        select: { profilId: true }
      });
      
      if (utilisateur && utilisateur.profilId === 1) {
        // Admin : voir toutes les demandes
        whereClause = {};
      } else {
        // Non-admin : voir seulement ses demandes
        whereClause = { utilisateurId };
      }
    } else {
      // Pas de filtre : retourner toutes les demandes
      whereClause = {};
    }

    const demandes = await prisma.demande.findMany({
      where: whereClause,
      orderBy: { dateCreation: "desc" },
      include: {
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        statut: {
          select: {
            id: true,
            nom: true,
            description: true,
          },
        },
      },
    });

    // Formatter les demandes pour inclure les noms des sociétés et les étapes
    const demandesFormatees = demandes.map((demande: any) => {
      let societesNames: string[] = [];

      // societesDemandeurs est maintenant stocké comme texte direct
      if (demande.societesDemandeurs) {
        // Si c'est une chaîne avec des virgules, la diviser
        if (typeof demande.societesDemandeurs === "string") {
          societesNames = demande.societesDemandeurs
            .split(", ")
            .filter((n: string) => n.trim());
        }
      }

      return {
        ...demande,
        societesDemandeursNames: societesNames,
        // S'assurer que draftStepLabel est présent
        draftStepLabel: demande.draftStepLabel || null,
        // Ajouter le nom de l'utilisateur qui a créé la demande
        nomCreateur: demande.utilisateur 
          ? `${demande.utilisateur.prenom} ${demande.utilisateur.nom}`
          : "Utilisateur inconnu",
        emailCreateur: demande.utilisateur?.email || null,
      };
    });

    res.json(demandesFormatees);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET une demande par ID
router.get("/:id", async (req, res) => {
  try {
    const demande = await prisma.demande.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!demande) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    res.json(demande);
  } catch (error) {
    console.error("Erreur lors de la récupération de la demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST créer une demande
router.post("/", async (req, res) => {
  try {
    const {
      nomProjet,
      descriptionProjet,
      descriptionPerimetre,
      typeProjet,
      dateReception,
      statutDemande,
      statutId,
      isDraft,
      draftStep,
      draftStepLabel,
      societesDemandeurs,
      societeDemandeur,
      interlocuteurClient,
      interlocuteur,
      utilisateurId,
      // Étape 2: Clarification
      dateTransmissionBacklog,
      dateConfirmationValidation,
      lienIngridCDC,
      statutDemandes, // Nouveau champ pour le statut de la demande
      // Étape 3: Planification
      dateDemandePlanificationDev,
      dateDemandePlanificationTif,
      dateRetourEquipesDev,
      dateRetourEquipesTif,
      dateCommunicationPlanningClient,
      nombreSprint,
      chargePrevisionnelleParSprint,
      dateLivraisonPrevisionnelleTIFParSprint,
      dateLivraisonPrevisionnelleClientParSprint,
      roadmap,
      dateEffectiveLivraisonTIF,
      motifsRetardTIF,
      dateEffectiveLivraisonClient,
      motifsRetardClient,
      sprintsData,
      // Étape 4-7: Statuts
      statutCodage,
      statutPresentationDocs,
      statutRecette,
      statutLivraison,
      // Étape 5: Documents
      lienIngridKickoff,
      lienIngridPointsControleTIF,
      lienIngridSignoff,
      statutTIF,
    } = req.body;

    console.log("🔍 Backend POST - Données reçues:", {
      draftStep,
      draftStepLabel,
      societesDemandeurs,
      societeDemandeur,
      interlocuteurClient,
      interlocuteur,
      nomProjet,
      typeProjet,
      dateReception,
      isDraft,
      utilisateurId,
    });

    console.log("🔍 Création de la demande avec:", {
      finalNomProjet: nomProjet || "Brouillon sans nom",
      finalTypeProjet: typeProjet || "Brouillon",
      dateReception: dateReception,
      finalUtilisateurId: utilisateurId || 1
    });

    // Vérifier les champs obligatoires (assoupli pour les brouillons)
    if (!isDraft && (!nomProjet || !typeProjet)) {
      console.error("❌ Champs obligatoires manquants pour une demande finale:", { nomProjet, typeProjet });
      return res.status(400).json({ error: "Champs obligatoires manquants: nomProjet, typeProjet" });
    }
    
    // Pour les brouillons, utiliser des valeurs par défaut si les champs sont vides
    const finalNomProjet = nomProjet || "Brouillon sans nom";
    const finalTypeProjet = typeProjet || "Brouillon";
    // Associer automatiquement l'utilisateur connecté (envoyé par le frontend)
    // Si pas d'utilisateurID, utiliser l'admin (ID 1) par défaut
    const finalUtilisateurId = utilisateurId || 1;

    // Créer automatiquement le statut s'il est fourni et s'il n'existe pas
    let statutDemandeId = null;
    if (statutDemande) {
      console.log("🔍 Vérification/Création du statut:", statutDemande);
      
      // Vérifier si le statut existe déjà
      let statut = await prisma.statut.findFirst({
        where: { nom: statutDemande }
      });

      // Si le statut n'existe pas, le créer
      if (!statut) {
        console.log("✅ Création automatique du statut:", statutDemande);
        statut = await prisma.statut.create({
          data: {
            nom: statutDemande,
            description: `Statut créé automatiquement lors de la création de la demande: ${finalNomProjet}`,
            actif: true,
            estAutomatique: true
          }
        });
      } else {
        console.log("📋 Statut existant trouvé:", statutDemande);
      }
      
      statutDemandeId = statut.id;
    }

    const demande = await prisma.demande.create({
      data: {
        nomProjet: finalNomProjet,
        typeProjet: finalTypeProjet,
        descriptionProjet: descriptionProjet || null,
        descriptionPerimetre: descriptionPerimetre || null,
        dateReception: dateReception ? new Date(dateReception) : null,
        isDraft: isDraft ?? false,
        draftStep: draftStep ? parseInt(draftStep) : null,
        draftStepLabel: draftStepLabel || null,
        utilisateurId: finalUtilisateurId ? parseInt(finalUtilisateurId.toString()) : null,
        statutId: statutDemandeId,
        societesDemandeurs: societesDemandeurs || null,
        societeDemandeur: societeDemandeur || null,
        interlocuteurClient: interlocuteurClient || null,
        interlocuteur: interlocuteur || null,
        // Étape 2: Clarification
        ...(lienIngridCDC !== undefined && lienIngridCDC !== null && { lienIngridCDC }),
        ...(dateTransmissionBacklog !== undefined && dateTransmissionBacklog !== null && {
          dateTransmissionBacklog: new Date(dateTransmissionBacklog),
        }),
        ...(dateConfirmationValidation !== undefined && dateConfirmationValidation !== null && {
          dateConfirmationValidation: new Date(dateConfirmationValidation),
        }),
        // Étape 3: Planification
        ...(dateDemandePlanificationDev !== undefined && dateDemandePlanificationDev !== null && {
          dateDemandePlanificationDev: new Date(dateDemandePlanificationDev),
        }),
        ...(dateDemandePlanificationTif !== undefined && dateDemandePlanificationTif !== null && {
          dateDemandePlanificationTif: new Date(dateDemandePlanificationTif),
        }),
        ...(dateRetourEquipesDev !== undefined && dateRetourEquipesDev !== null && {
          dateRetourEquipesDev: new Date(dateRetourEquipesDev),
        }),
        ...(dateRetourEquipesTif !== undefined && dateRetourEquipesTif !== null && {
          dateRetourEquipesTif: new Date(dateRetourEquipesTif),
        }),
        ...(dateCommunicationPlanningClient !== undefined && dateCommunicationPlanningClient !== null && {
          dateCommunicationPlanningClient: new Date(dateCommunicationPlanningClient),
        }),
        ...(nombreSprint !== undefined && nombreSprint !== null && {
          nombreSprint: nombreSprint ? parseInt(nombreSprint) : null,
        }),
        ...(roadmap !== undefined && roadmap !== null && { roadmap }),
        ...(sprintsData !== undefined && sprintsData !== null && { sprintsData }),
        // Étape 4-7: Statuts et documents
        ...(statutCodage !== undefined && statutCodage !== null && { statutCodage }),
        ...(statutPresentationDocs !== undefined && statutPresentationDocs !== null && { statutPresentationDocs }),
        ...(statutRecette !== undefined && statutRecette !== null && { statutRecette }),
        ...(statutLivraison !== undefined && statutLivraison !== null && { statutLivraison }),
        ...(statutTIF !== undefined && statutTIF !== null && { statutTIF }),
        ...(lienIngridKickoff !== undefined && lienIngridKickoff !== null && { lienIngridKickoff }),
        ...(lienIngridPointsControleTIF !== undefined && lienIngridPointsControleTIF !== null && { lienIngridPointsControleTIF }),
        ...(lienIngridSignoff !== undefined && lienIngridSignoff !== null && { lienIngridSignoff }),
        ...(dateEffectiveLivraisonTIF !== undefined && dateEffectiveLivraisonTIF !== null && {
          dateEffectiveLivraisonTIF: new Date(dateEffectiveLivraisonTIF),
        }),
        ...(dateEffectiveLivraisonClient !== undefined && dateEffectiveLivraisonClient !== null && {
          dateEffectiveLivraisonClient: new Date(dateEffectiveLivraisonClient),
        }),
        ...(motifsRetardTIF !== undefined && motifsRetardTIF !== null && { motifsRetardTIF }),
        ...(motifsRetardClient !== undefined && motifsRetardClient !== null && { motifsRetardClient }),
      },
    });

    console.log("✅ Demande créée avec dateReception:", demande.dateReception);
    res.status(201).json(demande);
  } catch (error) {
    console.error("Erreur lors de la création de la demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT mettre à jour une demande
router.put("/:id", async (req, res) => {
  try {
    const {
      nomProjet,
      descriptionProjet,
      descriptionPerimetre,
      typeProjet,
      dateReception,
      statutDemande,
      statutId,
      isDraft,
      draftStep,
      draftStepLabel,
      societesDemandeurs,
      societeDemandeur,
      interlocuteurClient,
      interlocuteur,
      // Étape 2: Clarification
      dateTransmissionBacklog,
      dateConfirmationValidation,
      lienIngridCDC,
      // Étape 3: Planification
      dateDemandePlanificationDev,
      dateDemandePlanificationTif,
      dateRetourEquipesDev,
      dateRetourEquipesTif,
      dateCommunicationPlanningClient,
      nombreSprint,
      chargePrevisionnelleParSprint,
      dateLivraisonPrevisionnelleTIFParSprint,
      dateLivraisonPrevisionnelleClientParSprint,
      roadmap,
      dateEffectiveLivraisonTIF,
      motifsRetardTIF,
      dateEffectiveLivraisonClient,
      motifsRetardClient,
      sprintsData,
      // Étape 4-7: Statuts
      statutCodage,
      statutPresentationDocs,
      statutRecette,
      statutLivraison,
      // Étape 5: Documents
      lienIngridKickoff,
      lienIngridPointsControleTIF,
      lienIngridSignoff,
      statutTIF,
    } = req.body;

    console.log("🔍 Backend PUT - Données reçues:", {
      id: req.params.id,
      draftStep,
      draftStepLabel,
      societesDemandeurs,
      societeDemandeur,
      interlocuteurClient,
      interlocuteur,
      dateTransmissionBacklog,
      dateConfirmationValidation,
      lienIngridCDC,
      nombreSprint,
      statutCodage,
      statutPresentationDocs,
      statutRecette,
      statutLivraison,
      lienIngridKickoff,
      lienIngridPointsControleTIF,
      lienIngridSignoff,
      statutTIF,
    });

    // Vérifier si la demande existe
    const existingDemande = await prisma.demande.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existingDemande) {
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    // Créer automatiquement le statut s'il est fourni et s'il n'existe pas
    let statutDemandeId = statutId;
    if (statutDemande && !statutId) {
      console.log("🔍 Vérification/Création du statut lors de la mise à jour:", statutDemande);
      
      // Vérifier si le statut existe déjà
      let statut = await prisma.statut.findFirst({
        where: { nom: statutDemande }
      });

      // Si le statut n'existe pas, le créer
      if (!statut) {
        console.log("✅ Création automatique du statut lors de la mise à jour:", statutDemande);
        statut = await prisma.statut.create({
          data: {
            nom: statutDemande,
            description: `Statut créé automatiquement lors de la mise à jour de la demande: ${nomProjet || 'Demande #' + req.params.id}`,
            actif: true,
            estAutomatique: true
          }
        });
      } else {
        console.log("📋 Statut existant trouvé lors de la mise à jour:", statutDemande);
      }
      
      statutDemandeId = statut.id;
    }

    const demande = await prisma.demande.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(nomProjet !== undefined && nomProjet !== null && { nomProjet }),
        ...(descriptionProjet !== undefined && descriptionProjet !== null && { descriptionProjet }),
        ...(descriptionPerimetre !== undefined && descriptionPerimetre !== null && { descriptionPerimetre }),
        ...(typeProjet !== undefined && typeProjet !== null && { typeProjet }),
        ...(dateReception !== undefined && dateReception !== null && {
          dateReception: new Date(dateReception),
        }),
        ...(statutDemande !== undefined && statutDemande !== null && { statutDemande }),
        ...(statutDemandeId !== undefined && statutDemandeId !== null && {
          statutId: statutDemandeId ? parseInt(statutDemandeId) : null,
        }),
        ...(isDraft !== undefined && { isDraft }),
        ...(draftStep !== undefined && { draftStep }),
        ...(draftStepLabel !== undefined && { draftStepLabel }),
        // Sociétés et interlocuteurs
        ...(societesDemandeurs !== undefined && societesDemandeurs !== null && { societesDemandeurs }),
        ...(societeDemandeur !== undefined && societeDemandeur !== null && { societeDemandeur }),
        ...(interlocuteurClient !== undefined && interlocuteurClient !== null && { interlocuteurClient }),
        ...(interlocuteur !== undefined && interlocuteur !== null && { interlocuteur }),
        // Étape 2: Clarification
        ...(dateTransmissionBacklog !== undefined && dateTransmissionBacklog !== null && {
          dateTransmissionBacklog: new Date(dateTransmissionBacklog),
        }),
        ...(dateConfirmationValidation !== undefined && dateConfirmationValidation !== null && {
          dateConfirmationValidation: new Date(dateConfirmationValidation),
        }),
        ...(lienIngridCDC !== undefined && lienIngridCDC !== null && { lienIngridCDC }),
        // Étape 3: Planification
        ...(dateDemandePlanificationDev !== undefined && dateDemandePlanificationDev !== null && {
          dateDemandePlanificationDev: new Date(dateDemandePlanificationDev),
        }),
        ...(dateDemandePlanificationTif !== undefined && dateDemandePlanificationTif !== null && {
          dateDemandePlanificationTif: new Date(dateDemandePlanificationTif),
        }),
        ...(dateRetourEquipesDev !== undefined && dateRetourEquipesDev !== null && {
          dateRetourEquipesDev: new Date(dateRetourEquipesDev),
        }),
        ...(dateRetourEquipesTif !== undefined && dateRetourEquipesTif !== null && {
          dateRetourEquipesTif: new Date(dateRetourEquipesTif),
        }),
        ...(dateCommunicationPlanningClient !== undefined && dateCommunicationPlanningClient !== null && {
          dateCommunicationPlanningClient: new Date(dateCommunicationPlanningClient),
        }),
        ...(nombreSprint !== undefined && nombreSprint !== null && {
          nombreSprint: nombreSprint ? parseInt(nombreSprint) : null,
        }),
        ...(chargePrevisionnelleParSprint !== undefined && chargePrevisionnelleParSprint !== null && { chargePrevisionnelleParSprint }),
        ...(dateLivraisonPrevisionnelleTIFParSprint !== undefined && dateLivraisonPrevisionnelleTIFParSprint !== null && { dateLivraisonPrevisionnelleTIFParSprint }),
        ...(dateLivraisonPrevisionnelleClientParSprint !== undefined && dateLivraisonPrevisionnelleClientParSprint !== null && { dateLivraisonPrevisionnelleClientParSprint }),
        ...(roadmap !== undefined && roadmap !== null && { roadmap }),
        ...(dateEffectiveLivraisonTIF !== undefined && dateEffectiveLivraisonTIF !== null && {
          dateEffectiveLivraisonTIF: new Date(dateEffectiveLivraisonTIF),
        }),
        ...(motifsRetardTIF !== undefined && motifsRetardTIF !== null && { motifsRetardTIF }),
        ...(dateEffectiveLivraisonClient !== undefined && dateEffectiveLivraisonClient !== null && {
          dateEffectiveLivraisonClient: new Date(dateEffectiveLivraisonClient),
        }),
        ...(motifsRetardClient !== undefined && motifsRetardClient !== null && { motifsRetardClient }),
        ...(sprintsData !== undefined && sprintsData !== null && { sprintsData }),
        // Étape 4-7: Statuts
        ...(statutCodage !== undefined && statutCodage !== null && { statutCodage }),
        ...(statutPresentationDocs !== undefined && statutPresentationDocs !== null && { statutPresentationDocs }),
        ...(statutRecette !== undefined && statutRecette !== null && { statutRecette }),
        ...(statutLivraison !== undefined && statutLivraison !== null && { statutLivraison }),
        // Étape 5: Documents
        ...(lienIngridKickoff !== undefined && lienIngridKickoff !== null && { lienIngridKickoff }),
        ...(lienIngridPointsControleTIF !== undefined && lienIngridPointsControleTIF !== null && { lienIngridPointsControleTIF }),
        ...(lienIngridSignoff !== undefined && lienIngridSignoff !== null && { lienIngridSignoff }),
        ...(statutTIF !== undefined && statutTIF !== null && { statutTIF }),
        dateModification: new Date(),
      },
    });
    res.json(demande);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE supprimer une demande
router.delete("/:id", async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id);
    const supprimePar = req.query.utilisateurId ? parseInt(req.query.utilisateurId as string) : null;

    // Récupérer la demande avant de la supprimer pour piste d'audit
    const demande = await prisma.demande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    // Sauvegarder la piste d'audit AVANT suppression
    await prisma.auditSuppression.upsert({
      where: { demandeId },
      update: {
        nomProjet: demande.nomProjet,
        typeProjet: demande.typeProjet,
        societesDemandeurs: demande.societesDemandeurs,
        interlocuteurClient: demande.interlocuteurClient,
        dateEnregistrement: demande.dateEnregistrement,
        statutDemande: demande.statutDemande,
        draftStep: demande.draftStep,
        draftStepLabel: demande.draftStepLabel,
        donneesCompletes: demande as any,
        supprimePar,
        suppressionDate: new Date(),
      },
      create: {
        demandeId,
        nomProjet: demande.nomProjet,
        typeProjet: demande.typeProjet,
        societesDemandeurs: demande.societesDemandeurs,
        interlocuteurClient: demande.interlocuteurClient,
        dateEnregistrement: demande.dateEnregistrement,
        statutDemande: demande.statutDemande,
        draftStep: demande.draftStep,
        draftStepLabel: demande.draftStepLabel,
        donneesCompletes: demande as any,
        supprimePar,
      },
    });

    // Supprimer la demande
    await prisma.demande.delete({
      where: { id: demandeId },
    });

    // Vérifier si le statut peut être supprimé (s'il n'est utilisé par aucune autre demande)
    if (demande.statutId) {
      const autresDemandesAvecStatut = await prisma.demande.count({
        where: { statutId: demande.statutId }
      });

      if (autresDemandesAvecStatut === 0) {
        // Le statut n'est utilisé par aucune autre demande, on peut le supprimer
        try {
          await prisma.statut.delete({
            where: { id: demande.statutId }
          });
          console.log(`✅ Statut ${demande.statutId} supprimé automatiquement (plus utilisé)`);
        } catch (statutError) {
          console.warn(`⚠️ Impossible de supprimer le statut ${demande.statutId}:`, statutError);
          // Ne pas échouer la suppression de la demande si le statut ne peut pas être supprimé
        }
      } else {
        console.log(`📋 Statut ${demande.statutId} conservé (utilisé par ${autresDemandesAvecStatut} autre(s) demande(s))`);
      }
    }

    res.json({
      message: "Demande supprimée avec succès",
      auditEnregistre: true,
      statutNettoyage: demande.statutId ? "Vérification du statut effectuée" : null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
