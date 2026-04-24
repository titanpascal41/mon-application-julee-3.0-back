import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Récupérer les références existantes
  const statut = await prisma.statut.findFirst({ where: { nom: "TIF" } });
  const societe = await prisma.societe.findFirst({ where: { code: "GS2E", actif: true } });
  const uo = await prisma.uniteOrganisationnelle.findFirst({ where: { actif: true } });

  if (!societe) {
    console.error("❌ Aucune société GS2E active trouvée");
    return;
  }

  const sprintsData = [
    {
      chantier: "Développement module facturation",
      datePrevTIF: "2025-05-10",
      dateEffTIF: "2025-05-09",
      motifRetardTIF: null,
      datePrevClient: "2025-05-20",
      dateEffClient: "2025-05-20",
      motifRetardClient: null,
      charges: "15",
      nbFonctionnalites: "8",
      statutSprint: "terminé",
      avancement: "100",
    },
    {
      chantier: "Intégration API paiement",
      datePrevTIF: "2025-06-05",
      dateEffTIF: null,
      motifRetardTIF: null,
      datePrevClient: "2025-06-15",
      dateEffClient: null,
      motifRetardClient: null,
      charges: "20",
      nbFonctionnalites: "5",
      statutSprint: "en cours",
      avancement: "65",
    },
    {
      chantier: "Tests de recette et validation",
      datePrevTIF: "2025-07-01",
      dateEffTIF: null,
      motifRetardTIF: null,
      datePrevClient: "2025-07-10",
      dateEffClient: null,
      motifRetardClient: null,
      charges: "10",
      nbFonctionnalites: "3",
      statutSprint: "en attente",
      avancement: "0",
    },
  ];

  const demande = await (prisma.demande as any).create({
    data: {
      // ── Étape 1 : Enregistrement ──────────────────────────────────
      nomProjet: "Refonte du système de facturation SAPHIR V3",
      typeProjet: "nouvelle",
      descriptionProjet:
        "Refonte complète du module de facturation pour intégrer les nouvelles règles tarifaires et améliorer les performances de traitement des factures clients.",
      descriptionPerimetre:
        "Module facturation, API paiement, interface client, reporting financier",
      dateReception: new Date("2025-04-01"),
      societesDemandeurs: "GS2E",
      interlocuteurClient: "Marie Koné",
      statutDemande: statut?.nom || "TIF",
      ...(statut && { statut: { connect: { id: statut.id } } }),
      societe: { connect: { id: societe.id } },
      ...(uo && { uniteOrganisationnelle: { connect: { id: uo.id } } }),
      utilisateur: { connect: { id: 1 } },

      // ── Étape 2 : Clarification ───────────────────────────────────
      lienIngridCDC: "https://ingrid.gs2e.ci/cdc/facturation-v3-2025",
      dateTransmissionBacklog: new Date("2025-04-05"),
      dateConfirmationValidation: new Date("2025-04-10"),

      // ── Étape 3 : Planification ───────────────────────────────────
      nombreSprint: 3,
      dateDemandePlanificationDev: new Date("2025-04-15"),
      dateDemandePlanificationTif: new Date("2025-04-18"),
      dateRetourEquipesDev: new Date("2025-04-20"),
      dateRetourEquipesTif: new Date("2025-04-22"),
      dateCommunicationPlanningClient: new Date("2025-07-15"),
      roadmap: "Sprint 1 : Facturation (mai) — Sprint 2 : API Paiement (juin) — Sprint 3 : Recette (juillet)",
      sprintsData: sprintsData,

      // ── Étape 4 : Réalisation ─────────────────────────────────────
      statutCodage: "en cours",
      statutTIF: "en cours",

      // ── Étape 5 : Documents ───────────────────────────────────────
      lienIngridKickoff: "https://ingrid.gs2e.ci/kickoff/facturation-v3",
      lienIngridPointsControleTIF: "https://ingrid.gs2e.ci/tif/facturation-v3",
      lienIngridSignoff: "https://ingrid.gs2e.ci/signoff/facturation-v3",
      statutPresentationDocs: "en cours",

      // ── Étape 6 : Livraison ───────────────────────────────────────
      statutLivraison: "en attente",

      // ── Métadonnées ───────────────────────────────────────────────
      isDraft: true,
      draftStep: 4,
      draftStepLabel: "Réalisation",
    },
  });

  console.log(`✅ Demande créée avec succès — ID: ${demande.id}`);
  console.log(`   Projet : ${demande.nomProjet}`);
  console.log(`   Société : ${societe.nom}`);
  console.log(`   Sprints : ${sprintsData.length}`);
  console.log(`   Étape en cours : ${demande.draftStepLabel}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
