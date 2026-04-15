const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Début du seed de données de base...");

  // Créer les profils de base
  const adminProfil = await prisma.profil.upsert({
    where: { nom: "Administrateur" },
    update: {},
    create: {
      nom: "Administrateur",
    },
  });

  const managerProfil = await prisma.profil.upsert({
    where: { nom: "Manager" },
    update: {},
    create: {
      nom: "Manager",
    },
  });

  const userProfil = await prisma.profil.upsert({
    where: { nom: "Utilisateur" },
    update: {},
    create: {
      nom: "Utilisateur",
    },
  });

  console.log("Profils créés:", { adminProfil, managerProfil, userProfil });

  // Créer l'utilisateur admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@julee.local" },
    update: {},
    create: {
      prenom: "Admin",
      nom: "Julee",
      email: "admin@julee.local",
      motDePasse: "JuleeAdmin@2024!", // En production, hasher ce mot de passe
      profilId: adminProfil.id,
    },
  });

  console.log("Utilisateur admin créé:", adminUser);

  // Créer les permissions pour le profil admin
  const permissions = [
    { module: "administration", access: true, create: true, read: true, update: true, delete: true },
    { module: "parametrage", access: true, create: true, read: true, update: true, delete: true },
    { module: "demandes", access: true, create: true, read: true, update: true, delete: true },
    { module: "profils", access: true, create: true, read: true, update: true, delete: true },
    { module: "utilisateurs", access: true, create: true, read: true, update: true, delete: true },
    { module: "societes", access: true, create: true, read: true, update: true, delete: true },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        profilId_module: {
          profilId: adminProfil.id,
          module: perm.module,
        },
      },
      update: perm,
      create: {
        ...perm,
        profilId: adminProfil.id,
      },
    });
  }

  console.log("Permissions créées pour l'administrateur");

  // Créer quelques statuts de base
  const statuts = [
    { nom: "En attente", description: "Demande en attente de validation" },
    { nom: "Validée", description: "Demande validée" },
    { nom: "En cours", description: "Demande en cours de traitement" },
    { nom: "Terminée", description: "Demande terminée" },
    { nom: "Annulée", description: "Demande annulée" },
  ];

  for (const statut of statuts) {
    await prisma.statut.upsert({
      where: { nom: statut.nom },
      update: {},
      create: statut,
    });
  }

  console.log("Statuts créés");

  console.log("Seed terminé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
