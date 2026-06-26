import { Router } from "express";
import { prisma } from "../db";
import { logAudit } from "../utils/auditHelper";

const router = Router();

// GET tous les demandes (filtrées par utilisateur si spécifié)
router.get("/", async (req, res) => {
  try {
    const utilisateurId = req.query.utilisateurId
      ? parseInt(req.query.utilisateurId as string)
      : null;

    let whereClause: any = {};

    if (utilisateurId) {
      const utilisateur = await prisma.user.findUnique({
        where: { id: utilisateurId },
        select: { profilId: true }
      });

      if (!utilisateur || utilisateur.profilId !== 1) {
        whereClause.utilisateurId = utilisateurId;
      }
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
      observations,
      statutDemandes,
      // Champs Evolution
      dateDemandeMiseAJourDATFL,
      dateReponseMiseAJourDATFL,
      planningDateDebut,
      planningDateFin,
      dateDemandeDevolution,
      dateReponseDevolution,
      slt,
      aleasNormeParJour,
      charge,
      // Étape 3: Planification
      dateDemandePlanificationDev,
      dateDemandePlanificationTif,
      dateRetourEquipesDev,
      dateRetourEquipesTif,
      dateCommunicationPlanningClient,
      nombreSprint,
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
      motifSuspension,
      dateSuspension,
      // Demande Prospecte - étape 2
      dateLimiteReponseDev,
      dateLimiteReponseTif,
      chargeDeveloppement,
      chargeTIF,
      motifEcartChargeTIF,
      chargeSupportRecette,
      chargeGlobale,
      tarifHommeJour,
      budgetAlloue,
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

    // Associer le statut s'il existe
    let statutDemandeId = null;
    if (statutDemande) {
      const statut = await prisma.statut.findFirst({ where: { nom: statutDemande } });
      if (statut) statutDemandeId = statut.id;
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
        ...(observations !== undefined && observations !== null && { observations }),
        ...(dateTransmissionBacklog !== undefined && dateTransmissionBacklog !== null && {
          dateTransmissionBacklog: new Date(dateTransmissionBacklog),
        }),
        ...(dateConfirmationValidation !== undefined && dateConfirmationValidation !== null && {
          dateConfirmationValidation: new Date(dateConfirmationValidation),
        }),
        // Champs Évolution
        ...(dateDemandeMiseAJourDATFL !== undefined && dateDemandeMiseAJourDATFL !== null && { dateDemandeMiseAJourDATFL: new Date(dateDemandeMiseAJourDATFL) }),
        ...(dateReponseMiseAJourDATFL !== undefined && dateReponseMiseAJourDATFL !== null && { dateReponseMiseAJourDATFL: new Date(dateReponseMiseAJourDATFL) }),
        ...(planningDateDebut !== undefined && planningDateDebut !== null && { planningDateDebut: new Date(planningDateDebut) }),
        ...(planningDateFin !== undefined && planningDateFin !== null && { planningDateFin: new Date(planningDateFin) }),
        ...(dateDemandeDevolution !== undefined && dateDemandeDevolution !== null && { dateDemandeDevolution: new Date(dateDemandeDevolution) }),
        ...(dateReponseDevolution !== undefined && dateReponseDevolution !== null && { dateReponseDevolution: new Date(dateReponseDevolution) }),
        ...(slt !== undefined && slt !== null && { slt }),
        ...(aleasNormeParJour !== undefined && aleasNormeParJour !== null && { aleasNormeParJour }),
        ...(charge !== undefined && charge !== null && { charge: parseFloat(charge) }),
        ...(motifSuspension !== undefined && motifSuspension !== null && { motifSuspension }),
        ...(dateSuspension !== undefined && dateSuspension !== null && { dateSuspension: new Date(dateSuspension) }),
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
        // Demande Prospecte - étape 2
        ...(dateLimiteReponseDev !== undefined && dateLimiteReponseDev !== null && { dateLimiteReponseDev: new Date(dateLimiteReponseDev) }),
        ...(dateLimiteReponseTif !== undefined && dateLimiteReponseTif !== null && { dateLimiteReponseTif: new Date(dateLimiteReponseTif) }),
        ...(chargeDeveloppement !== undefined && chargeDeveloppement !== null && { chargeDeveloppement: parseFloat(chargeDeveloppement) }),
        ...(chargeTIF !== undefined && chargeTIF !== null && { chargeTIF: parseFloat(chargeTIF) }),
        ...(motifEcartChargeTIF !== undefined && motifEcartChargeTIF !== null && { motifEcartChargeTIF }),
        ...(chargeSupportRecette !== undefined && chargeSupportRecette !== null && { chargeSupportRecette: parseFloat(chargeSupportRecette) }),
        ...(chargeGlobale !== undefined && chargeGlobale !== null && { chargeGlobale: parseFloat(chargeGlobale) }),
        ...(tarifHommeJour !== undefined && tarifHommeJour !== null && { tarifHommeJour: parseFloat(tarifHommeJour) }),
        ...(budgetAlloue !== undefined && budgetAlloue !== null && { budgetAlloue: parseFloat(budgetAlloue) }),
      },
    });

    console.log("✅ Demande créée avec dateReception:", demande.dateReception);

    await logAudit({
      action: "CREATION",
      entite: "Demande",
      entiteId: demande.id,
      entiteNom: demande.nomProjet,
      details: {
        typeProjet: demande.typeProjet,
        brouillon: demande.isDraft ? "Oui" : "Non",
        etape: demande.draftStepLabel || "Étape 1",
      },
      utilisateurId: finalUtilisateurId || null,
    });

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
      observations,
      // Champs Évolution
      dateDemandeMiseAJourDATFL,
      dateReponseMiseAJourDATFL,
      planningDateDebut,
      planningDateFin,
      dateDemandeDevolution,
      dateReponseDevolution,
      slt,
      aleasNormeParJour,
      charge,
      // Étape 3: Planification
      dateDemandePlanificationDev,
      dateDemandePlanificationTif,
      dateRetourEquipesDev,
      dateRetourEquipesTif,
      dateCommunicationPlanningClient,
      nombreSprint,
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
      motifSuspension,
      dateSuspension,
      // Demande Prospecte - étape 2
      dateLimiteReponseDev,
      dateLimiteReponseTif,
      chargeDeveloppement,
      chargeTIF,
      motifEcartChargeTIF,
      chargeSupportRecette,
      chargeGlobale,
      tarifHommeJour,
      budgetAlloue,
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

    // Associer le statut s'il existe
    let statutDemandeId = statutId;
    if (statutDemande && !statutId) {
      const statut = await prisma.statut.findFirst({ where: { nom: statutDemande } });
      if (statut) statutDemandeId = statut.id;
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
        ...(observations !== undefined && observations !== null && { observations }),
        // Champs Évolution
        ...(dateDemandeMiseAJourDATFL !== undefined && dateDemandeMiseAJourDATFL !== null && { dateDemandeMiseAJourDATFL: new Date(dateDemandeMiseAJourDATFL) }),
        ...(dateReponseMiseAJourDATFL !== undefined && dateReponseMiseAJourDATFL !== null && { dateReponseMiseAJourDATFL: new Date(dateReponseMiseAJourDATFL) }),
        ...(planningDateDebut !== undefined && planningDateDebut !== null && { planningDateDebut: new Date(planningDateDebut) }),
        ...(planningDateFin !== undefined && planningDateFin !== null && { planningDateFin: new Date(planningDateFin) }),
        ...(dateDemandeDevolution !== undefined && dateDemandeDevolution !== null && { dateDemandeDevolution: new Date(dateDemandeDevolution) }),
        ...(dateReponseDevolution !== undefined && dateReponseDevolution !== null && { dateReponseDevolution: new Date(dateReponseDevolution) }),
        ...(slt !== undefined && slt !== null && { slt }),
        ...(aleasNormeParJour !== undefined && aleasNormeParJour !== null && { aleasNormeParJour }),
        ...(charge !== undefined && charge !== null && { charge: parseFloat(charge) }),
        ...(motifSuspension !== undefined && motifSuspension !== null && { motifSuspension }),
        ...(dateSuspension !== undefined && dateSuspension !== null && { dateSuspension: new Date(dateSuspension) }),
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
        // Demande Prospecte - étape 2
        ...(dateLimiteReponseDev !== undefined && dateLimiteReponseDev !== null && { dateLimiteReponseDev: new Date(dateLimiteReponseDev) }),
        ...(dateLimiteReponseTif !== undefined && dateLimiteReponseTif !== null && { dateLimiteReponseTif: new Date(dateLimiteReponseTif) }),
        ...(chargeDeveloppement !== undefined && chargeDeveloppement !== null && { chargeDeveloppement: parseFloat(chargeDeveloppement) }),
        ...(chargeTIF !== undefined && chargeTIF !== null && { chargeTIF: parseFloat(chargeTIF) }),
        ...(motifEcartChargeTIF !== undefined && { motifEcartChargeTIF: motifEcartChargeTIF || null }),
        ...(chargeSupportRecette !== undefined && chargeSupportRecette !== null && { chargeSupportRecette: parseFloat(chargeSupportRecette) }),
        ...(chargeGlobale !== undefined && chargeGlobale !== null && { chargeGlobale: parseFloat(chargeGlobale) }),
        ...(tarifHommeJour !== undefined && tarifHommeJour !== null && { tarifHommeJour: parseFloat(tarifHommeJour) }),
        ...(budgetAlloue !== undefined && budgetAlloue !== null && { budgetAlloue: parseFloat(budgetAlloue) }),
        dateModification: new Date(),
      },
    });
    await logAudit({
      action: "MODIFICATION",
      entite: "Demande",
      entiteId: demande.id,
      entiteNom: demande.nomProjet,
      details: {
        typeProjet: demande.typeProjet,
        brouillon: demande.isDraft ? "Oui" : "Non",
        etape: demande.draftStepLabel || null,
        statut: demande.statutDemande || null,
      },
      utilisateurId: demande.utilisateurId || null,
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
    const utilisateurId = req.body?.utilisateurId ?? (req as any).user?.id ?? null;

    const demande = await prisma.demande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    // Supprimer les audits liés avant (contrainte FK)
    await (prisma.auditSuppression as any).deleteMany({ where: { demandeId } });

    await (prisma.demande as any).delete({ where: { id: demandeId } });

    await logAudit({
      action: "SUPPRESSION",
      entite: "Demande",
      entiteId: demandeId,
      entiteNom: (demande as any).nomProjet || `Demande #${demandeId}`,
      details: { typeProjet: (demande as any).typeProjet, statut: (demande as any).statutLivraison },
      utilisateurId: utilisateurId ? parseInt(utilisateurId) : null,
    });

    res.json({ message: "Demande supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
