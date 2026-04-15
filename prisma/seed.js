const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const load = (file) =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "..", "src", "data", file),
      "utf-8",
    ),
  );

async function main() {
  const societesData = load("societes.json").societes || [];
  const demandesData = load("demandes.json").demandes || [];
  const uoData =
    load("unitesOrganisationnelles.json").unitesOrganisationnelles || [];
  const roadmapData = load("roadmap.json").phases || [];
  const cadreData = load("cadreTemporel.json").cadreTemporel || [];
  const recettesData = load("recettes.json").recettes || [];
  const uatData = load("uat.json").uat || [];
  const livraisonsData = load("livraisons.json").livraisons || [];
  const profilsData = load("profils.json").profils || [];
  const utilisateursData = load("utilisateurs.json").utilisateurs || [];
  const statutsData = load("statuts.json").statuts || [];

  // Réinitialiser dans un ordre sûr (FK)
  await prisma.livraison.deleteMany();
  await prisma.recette.deleteMany();
  await prisma.uat.deleteMany();
  await prisma.coutProduit.deleteMany();
  await prisma.delaiPlanCharge.deleteMany();
  await prisma.demande.deleteMany();
  await prisma.collaborateur.deleteMany();
  await prisma.utilisateur.deleteMany();
  await prisma.profil.deleteMany();
  await prisma.statut.deleteMany();
  await prisma.uniteOrganisationnelle.deleteMany();
  await prisma.societe.deleteMany();
  await prisma.roadmapPhase.deleteMany();
  await prisma.cadreTemporel.deleteMany();
  await prisma.sprint.deleteMany();

  // Societes
  for (const s of societesData) {
    await prisma.societe.create({
      data: {
        id: s.id,
        nom: s.nom,
        description: s.description || null,
        adresse: s.adresse || null,
        telephone: s.telephone || null,
        email: s.email || null,
        dateCreation: s.dateCreation ? new Date(s.dateCreation) : null,
      },
    });
  }

  // UO
  for (const u of uoData) {
    await prisma.uniteOrganisationnelle.create({
      data: {
        id: u.id,
        nom: u.nom,
        description: u.description || null,
        responsable: u.responsable || null,
        parentId: u.parentId || null,
        societeId: u.parentId ? null : null, // pas de lien direct dans les données JSON
        dateCreation: u.dateCreation ? new Date(u.dateCreation) : null,
      },
    });
  }

  // Statuts
  for (const s of statutsData) {
    await prisma.statut.create({
      data: {
        id: s.id,
        nom: s.nom,
        description: s.description || null,
        couleur: s.couleur || null,
        ordre: s.ordre || null,
        actif: true,
      },
    });
  }

  // Profils
  for (const p of profilsData) {
    await prisma.profil.create({
      data: {
        id: p.id,
        nom: p.nom,
      },
    });
  }

  // Utilisateurs
  for (const u of utilisateursData) {
    await prisma.utilisateur.create({
      data: {
        id: u.id,
        prenom: u.prenom,
        nom: u.nom,
        email: u.email,
        motDePasse: u.motDePasse,
        description: u.description || null,
        actif: true,
        profilId: u.profilId,
        uoId: null,
      },
    });
  }

  // Interlocuteurs : none in JSON, skip (user will create)

  // Demandes
  for (const d of demandesData) {
    const societeId =
      Array.isArray(d.societesDemandeurs) && d.societesDemandeurs.length > 0
        ? d.societesDemandeurs[0]
        : null;
    await prisma.demande.create({
      data: {
        id: d.id,
        dateReception: new Date(d.dateReception),
        dateEnregistrement: d.dateEnregistrement
          ? new Date(d.dateEnregistrement)
          : new Date(),
        description: d.description || null,
        priorite: d.priorite || null,
        statut: d.statut || null,
        dateCreation: d.dateCreation ? new Date(d.dateCreation) : null,
        dateModification: d.dateModification
          ? new Date(d.dateModification)
          : null,
        societeId: societeId || 1,
        interlocuteurNom: d.interlocuteur || null,
      },
    });
  }

  // Roadmap
  for (const r of roadmapData) {
    await prisma.roadmapPhase.create({
      data: {
        id: r.id,
        nom: r.nom,
        description: r.description || null,
        dateDebut: r.dateDebut ? new Date(r.dateDebut) : null,
        dateFin: r.dateFin ? new Date(r.dateFin) : null,
        statut: r.statut || null,
        objectifs: r.objectifs || [],
        dateCreation: r.dateCreation ? new Date(r.dateCreation) : null,
        dateModification: r.dateModification
          ? new Date(r.dateModification)
          : null,
      },
    });
  }

  // Cadre temporel
  for (const c of cadreData) {
    await prisma.cadreTemporel.create({
      data: {
        id: c.id,
        nom: c.nom,
        description: c.description || null,
        type: c.type || null,
        dateDebut: c.dateDebut ? new Date(c.dateDebut) : null,
        dateFin: c.dateFin ? new Date(c.dateFin) : null,
        dateCreation: c.dateCreation ? new Date(c.dateCreation) : null,
        dateModification: c.dateModification
          ? new Date(c.dateModification)
          : null,
      },
    });
  }

  // Sprints (vide dans le JSON actuel) -> rien à insérer

  // Recettes
  for (const r of recettesData) {
    await prisma.recette.create({
      data: {
        id: r.id,
        dateDebut: r.dateDebut ? new Date(r.dateDebut) : null,
        dateFin: r.dateFin ? new Date(r.dateFin) : null,
        anomaliesBloquantes: r.anomaliesBloquantes ?? 0,
        anomaliesMajeures: r.anomaliesMajeures ?? 0,
        anomaliesMineures: r.anomaliesMineures ?? 0,
        statut: r.statut || null,
        commentaires: r.commentaires || null,
        gp: r.gp || null,
        dateCreation: r.dateCreation ? new Date(r.dateCreation) : null,
        dateModification: r.dateModification
          ? new Date(r.dateModification)
          : null,
      },
    });
  }

  // UAT
  for (const u of uatData) {
    await prisma.uAT.create({
      data: {
        id: u.id,
        nom: u.nom,
        description: u.description || null,
        dateDebut: u.dateDebut ? new Date(u.dateDebut) : null,
        dateFin: u.dateFin ? new Date(u.dateFin) : null,
        statut: u.statut || null,
        resultat: u.resultat || null,
        testeur: u.testeur || null,
        version: u.version || null,
        dateCreation: u.dateCreation ? new Date(u.dateCreation) : null,
        dateModification: u.dateModification
          ? new Date(u.dateModification)
          : null,
      },
    });
  }

  // Livraisons
  for (const l of livraisonsData) {
    await prisma.livraison.create({
      data: {
        id: l.id,
        numeroVersion: l.numeroVersion,
        dateLivraison: l.dateLivraison ? new Date(l.dateLivraison) : null,
        statut: l.statut || null,
        environnement: l.environnement || null,
        commentaires: l.commentaires || null,
        recetteId: l.recetteId || null,
        dateCreation: l.dateCreation ? new Date(l.dateCreation) : null,
        dateModification: l.dateModification
          ? new Date(l.dateModification)
          : null,
      },
    });
  }
}

main()
  .then(async () => {
    console.log("Seed terminé.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
