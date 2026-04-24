import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const statutTIF      = await prisma.statut.findFirst({ where: { nom: "TIF" } });
  const statutEPLA     = await prisma.statut.findFirst({ where: { nom: "EPLA" } });
  const statutLIV      = await prisma.statut.findFirst({ where: { nom: "LIV Recette" } });
  const statutSUSP     = await prisma.statut.findFirst({ where: { nom: "SUSPENDU" } });
  const statutND       = await prisma.statut.findFirst({ where: { nom: "ND - non démarré" } });
  const gs2e           = await prisma.societe.findFirst({ where: { code: "GS2E", actif: true } });
  const awale          = await prisma.societe.findFirst({ where: { code: "AWALE", actif: true } });
  const uo             = await prisma.uniteOrganisationnelle.findFirst({ where: { actif: true } });

  const results: any[] = [];

  // ═══════════════════════════════════════════════════════════════════
  // 1. Demande TERMINÉE — livrée au client, toutes étapes complètes
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Migration base de données SODECI vers MySQL 8",
      typeProjet: "nouvelle",
      descriptionProjet: "Migration complète de l'ancienne base Oracle vers MySQL 8 pour réduire les coûts de licence et améliorer les performances.",
      descriptionPerimetre: "Base de données, scripts de migration, tests de non-régression",
      dateReception: new Date("2025-01-10"),
      societesDemandeurs: "GS2E",
      interlocuteurClient: "Jean-Baptiste Yao",
      statutDemande: "LIV Recette",
      ...(statutLIV && { statut: { connect: { id: statutLIV.id } } }),
      ...(gs2e && { societe: { connect: { id: gs2e.id } } }),
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/migration-mysql8",
      dateTransmissionBacklog: new Date("2025-01-15"),
      dateConfirmationValidation: new Date("2025-01-20"),
      nombreSprint: 2,
      dateDemandePlanificationDev: new Date("2025-01-25"),
      dateDemandePlanificationTif: new Date("2025-01-27"),
      dateRetourEquipesDev: new Date("2025-02-01"),
      dateRetourEquipesTif: new Date("2025-02-03"),
      dateCommunicationPlanningClient: new Date("2025-03-28"),
      roadmap: "Sprint 1 : Migration schéma (fév) — Sprint 2 : Tests et bascule (mars)",
      sprintsData: [
        { chantier: "Migration schéma et données", datePrevTIF: "2025-02-20", dateEffTIF: "2025-02-19", motifRetardTIF: null, datePrevClient: "2025-02-28", dateEffClient: "2025-02-27", motifRetardClient: null, charges: "18", nbFonctionnalites: "6", statutSprint: "terminé", avancement: "100" },
        { chantier: "Tests non-régression et bascule", datePrevTIF: "2025-03-20", dateEffTIF: "2025-03-18", motifRetardTIF: null, datePrevClient: "2025-03-28", dateEffClient: "2025-03-26", motifRetardClient: null, charges: "12", nbFonctionnalites: "4", statutSprint: "terminé", avancement: "100" },
      ],
      statutCodage: "terminé",
      statutTIF: "terminé",
      lienIngridKickoff: "https://ingrid.gs2e.ci/kickoff/migration-mysql8",
      lienIngridPointsControleTIF: "https://ingrid.gs2e.ci/tif/migration-mysql8",
      lienIngridSignoff: "https://ingrid.gs2e.ci/signoff/migration-mysql8",
      statutPresentationDocs: "terminé",
      dateEffectiveLivraisonTIF: new Date("2025-03-18"),
      dateEffectiveLivraisonClient: new Date("2025-03-26"),
      statutLivraison: "livré au client",
      isDraft: false,
      draftStep: 6,
      draftStepLabel: "Livraison",
    },
  }));
  console.log(`✅ #1 Demande TERMINÉE créée — ID: ${results[0].id}`);

  // ═══════════════════════════════════════════════════════════════════
  // 2. Demande SUSPENDUE — bloquée à l'étape 3
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Développement portail RH self-service",
      typeProjet: "nouvelle",
      descriptionProjet: "Portail web permettant aux employés de gérer leurs congés, fiches de paie et informations personnelles en autonomie.",
      descriptionPerimetre: "Module congés, fiches de paie, profil employé, notifications email",
      dateReception: new Date("2025-02-05"),
      societesDemandeurs: "GS2E",
      interlocuteurClient: "Fatou Diallo",
      statutDemande: "SUSPENDU",
      ...(statutSUSP && { statut: { connect: { id: statutSUSP.id } } }),
      ...(gs2e && { societe: { connect: { id: gs2e.id } } }),
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/portail-rh",
      dateTransmissionBacklog: new Date("2025-02-10"),
      dateConfirmationValidation: new Date("2025-02-15"),
      nombreSprint: 4,
      dateDemandePlanificationDev: new Date("2025-02-20"),
      dateDemandePlanificationTif: new Date("2025-02-22"),
      dateRetourEquipesDev: new Date("2025-03-01"),
      dateRetourEquipesTif: new Date("2025-03-03"),
      dateCommunicationPlanningClient: new Date("2025-06-30"),
      roadmap: "Sprint 1-2 : Module congés — Sprint 3 : Fiches de paie — Sprint 4 : Notifications",
      sprintsData: [
        { chantier: "Module gestion congés", datePrevTIF: "2025-03-25", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-04-05", dateEffClient: null, motifRetardClient: null, charges: "22", nbFonctionnalites: "7", statutSprint: "en attente", avancement: "0" },
        { chantier: "Fiches de paie", datePrevTIF: "2025-04-20", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-05-01", dateEffClient: null, motifRetardClient: null, charges: "18", nbFonctionnalites: "5", statutSprint: "en attente", avancement: "0" },
        { chantier: "Profil employé", datePrevTIF: "2025-05-15", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-05-25", dateEffClient: null, motifRetardClient: null, charges: "14", nbFonctionnalites: "4", statutSprint: "en attente", avancement: "0" },
        { chantier: "Notifications et intégrations", datePrevTIF: "2025-06-15", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-06-28", dateEffClient: null, motifRetardClient: null, charges: "10", nbFonctionnalites: "3", statutSprint: "en attente", avancement: "0" },
      ],
      statutCodage: "en attente",
      statutTIF: "en attente",
      statutPresentationDocs: "en attente",
      statutLivraison: "en attente",
      motifSuspension: "Budget 2025 non validé — en attente de décision direction financière",
      dateSuspension: new Date("2025-03-10"),
      isDraft: true,
      draftStep: 3,
      draftStepLabel: "Planification",
    },
  }));
  console.log(`✅ #2 Demande SUSPENDUE créée — ID: ${results[1].id}`);

  // ═══════════════════════════════════════════════════════════════════
  // 3. Demande EN RETARD — dates dépassées, sprint en cours
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Refonte interface facturation CIE",
      typeProjet: "evolution",
      descriptionProjet: "Modernisation de l'interface de facturation pour les clients CIE avec nouvelle UX et intégration des nouveaux tarifs.",
      descriptionPerimetre: "Interface facturation, calcul tarifs, export PDF, historique clients",
      dateReception: new Date("2025-01-20"),
      societesDemandeurs: "GS2E",
      interlocuteurClient: "Kouamé Assi",
      statutDemande: "TIF",
      ...(statutTIF && { statut: { connect: { id: statutTIF.id } } }),
      ...(gs2e && { societe: { connect: { id: gs2e.id } } }),
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/facturation-cie",
      dateTransmissionBacklog: new Date("2025-01-25"),
      dateConfirmationValidation: new Date("2025-01-30"),
      nombreSprint: 3,
      dateDemandePlanificationDev: new Date("2025-02-05"),
      dateDemandePlanificationTif: new Date("2025-02-07"),
      dateRetourEquipesDev: new Date("2025-02-10"),
      dateRetourEquipesTif: new Date("2025-02-12"),
      dateCommunicationPlanningClient: new Date("2025-04-15"),
      roadmap: "Sprint 1 : Interface (fév) — Sprint 2 : Tarifs (mars) — Sprint 3 : PDF/historique (avril)",
      sprintsData: [
        { chantier: "Nouvelle interface facturation", datePrevTIF: "2025-02-25", dateEffTIF: "2025-03-05", motifRetardTIF: "Complexité intégration plus élevée que prévue", datePrevClient: "2025-03-05", dateEffClient: "2025-03-10", motifRetardClient: "Retard TIF répercuté", charges: "20", nbFonctionnalites: "9", statutSprint: "terminé", avancement: "100" },
        { chantier: "Calcul nouveaux tarifs 2025", datePrevTIF: "2025-03-20", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-03-30", dateEffClient: null, motifRetardClient: null, charges: "16", nbFonctionnalites: "6", statutSprint: "en cours", avancement: "45" },
        { chantier: "Export PDF et historique", datePrevTIF: "2025-04-08", dateEffTIF: null, motifRetardTIF: null, datePrevClient: "2025-04-15", dateEffClient: null, motifRetardClient: null, charges: "12", nbFonctionnalites: "4", statutSprint: "en attente", avancement: "0" },
      ],
      statutCodage: "en cours",
      statutTIF: "en cours",
      lienIngridKickoff: "https://ingrid.gs2e.ci/kickoff/facturation-cie",
      lienIngridPointsControleTIF: "https://ingrid.gs2e.ci/tif/facturation-cie",
      lienIngridSignoff: "",
      statutPresentationDocs: "en cours",
      statutLivraison: "en attente",
      isDraft: true,
      draftStep: 4,
      draftStepLabel: "Réalisation",
    },
  }));
  console.log(`✅ #3 Demande EN RETARD créée — ID: ${results[2].id}`);

  // ═══════════════════════════════════════════════════════════════════
  // 4. Demande EN DÉBUT DE PROCESSUS — étape 1 seulement
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Application mobile suivi consommation eau SODECI",
      typeProjet: "nouvelle",
      descriptionProjet: "Application mobile iOS/Android permettant aux abonnés SODECI de suivre leur consommation d'eau en temps réel, recevoir des alertes de dépassement et payer leurs factures.",
      descriptionPerimetre: "App mobile, API REST, tableau de bord consommation, paiement mobile money",
      dateReception: new Date("2025-04-20"),
      societesDemandeurs: "GS2E",
      interlocuteurClient: "Awa Touré",
      statutDemande: "ND - non démarré",
      ...(statutND && { statut: { connect: { id: statutND.id } } }),
      ...(gs2e && { societe: { connect: { id: gs2e.id } } }),
      utilisateur: { connect: { id: 1 } },
      statutCodage: "en attente",
      statutTIF: "en attente",
      statutPresentationDocs: "en attente",
      statutLivraison: "en attente",
      isDraft: true,
      draftStep: 1,
      draftStepLabel: "Enregistrement",
    },
  }));
  console.log(`✅ #4 Demande DÉBUT DE PROCESSUS créée — ID: ${results[3].id}`);

  // ═══════════════════════════════════════════════════════════════════
  // 5. Demande PROSPECTE — type prospecte, à l'étape 2
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Plateforme analytics énergie CIPREL",
      typeProjet: "prospecte",
      descriptionProjet: "Plateforme de visualisation et d'analyse des données de production et consommation d'énergie pour optimiser les coûts d'exploitation de CIPREL.",
      descriptionPerimetre: "Dashboard BI, connecteurs capteurs IoT, alertes automatiques, rapports PDF",
      dateReception: new Date("2025-03-15"),
      societesDemandeurs: "AWALE",
      interlocuteurClient: "Serge Amoikon",
      statutDemande: "EPLA",
      ...(statutEPLA && { statut: { connect: { id: statutEPLA.id } } }),
      ...(awale && { societe: { connect: { id: awale.id } } }),
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/analytics-ciprel",
      dateTransmissionBacklog: new Date("2025-03-20"),
      dateConfirmationValidation: new Date("2025-03-25"),
      statutCodage: "en attente",
      statutTIF: "en attente",
      statutPresentationDocs: "en attente",
      statutLivraison: "en attente",
      isDraft: true,
      draftStep: 2,
      draftStepLabel: "Clarification",
    },
  }));
  console.log(`✅ #5 Demande PROSPECTE créée — ID: ${results[4].id}`);

  // ═══════════════════════════════════════════════════════════════════
  // 6. Demande ÉVOLUTION — sprint terminé, en livraison imminente
  // ═══════════════════════════════════════════════════════════════════
  results.push(await (prisma.demande as any).create({
    data: {
      nomProjet: "Évolution module paiement AWALE — intégration Wave",
      typeProjet: "evolution",
      descriptionProjet: "Intégration du système de paiement Wave dans le module existant pour permettre les paiements mobile money sur la plateforme AWALE.",
      descriptionPerimetre: "API Wave, module paiement, notifications SMS, réconciliation bancaire",
      dateReception: new Date("2025-02-28"),
      societesDemandeurs: "AWALE",
      interlocuteurClient: "Inza Coulibaly",
      statutDemande: "LIV Recette",
      ...(statutLIV && { statut: { connect: { id: statutLIV.id } } }),
      ...(awale && { societe: { connect: { id: awale.id } } }),
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/paiement-wave",
      dateTransmissionBacklog: new Date("2025-03-05"),
      dateConfirmationValidation: new Date("2025-03-10"),
      nombreSprint: 2,
      dateDemandePlanificationDev: new Date("2025-03-12"),
      dateDemandePlanificationTif: new Date("2025-03-14"),
      dateRetourEquipesDev: new Date("2025-03-18"),
      dateRetourEquipesTif: new Date("2025-03-20"),
      dateCommunicationPlanningClient: new Date("2025-05-05"),
      roadmap: "Sprint 1 : Intégration API Wave — Sprint 2 : Tests et réconciliation",
      sprintsData: [
        { chantier: "Intégration API Wave", datePrevTIF: "2025-04-05", dateEffTIF: "2025-04-04", motifRetardTIF: null, datePrevClient: "2025-04-15", dateEffClient: "2025-04-14", motifRetardClient: null, charges: "14", nbFonctionnalites: "5", statutSprint: "terminé", avancement: "100" },
        { chantier: "Tests réconciliation bancaire", datePrevTIF: "2025-04-28", dateEffTIF: "2025-04-27", motifRetardTIF: null, datePrevClient: "2025-05-05", dateEffClient: null, motifRetardClient: null, charges: "10", nbFonctionnalites: "3", statutSprint: "en cours", avancement: "85" },
      ],
      statutCodage: "terminé",
      statutTIF: "en cours",
      lienIngridKickoff: "https://ingrid.gs2e.ci/kickoff/paiement-wave",
      lienIngridPointsControleTIF: "https://ingrid.gs2e.ci/tif/paiement-wave",
      lienIngridSignoff: "https://ingrid.gs2e.ci/signoff/paiement-wave",
      statutPresentationDocs: "terminé",
      dateEffectiveLivraisonTIF: new Date("2025-04-27"),
      statutLivraison: "en attente",
      isDraft: true,
      draftStep: 6,
      draftStepLabel: "Livraison",
    },
  }));
  console.log(`✅ #6 Demande ÉVOLUTION LIVRAISON IMMINENTE créée — ID: ${results[5].id}`);

  console.log("\n📊 Résumé :");
  console.log(`   #1 Terminée       → ID ${results[0].id}`);
  console.log(`   #2 Suspendue      → ID ${results[1].id}`);
  console.log(`   #3 En retard      → ID ${results[2].id}`);
  console.log(`   #4 Début process  → ID ${results[3].id}`);
  console.log(`   #5 Prospecte      → ID ${results[4].id}`);
  console.log(`   #6 Livraison imm. → ID ${results[5].id}`);
}

main()
  .catch((e) => { console.error("❌ Erreur:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
