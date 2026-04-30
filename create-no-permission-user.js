const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function createNoPermissionUser() {
  try {
    console.log(" Création d'un utilisateur sans permissions...");

    // Créer un profil sans permissions
    const noPermProfil = await prisma.profil.create({
      data: {
        nom: "SansPermissions",
      },
    });

    console.log(" Profil sans permissions créé:", noPermProfil);

    // Créer l'utilisateur avec ce profil
    const noPermUser = await prisma.user.create({
      data: {
        prenom: "No",
        nom: "Permission",
        email: "noperm@julee.local",
        motDePasse: "NoPerm@2024!",
        profilId: noPermProfil.id,
      },
    });

    console.log("Utilisateur sans permissions créé:", noPermUser);
    console.log("\n Identifiants de test:");
    console.log("   Email: noperm@julee.local");
    console.log("   Mot de passe: NoPerm@2024!");
    console.log("   Profil: SansPermissions (aucune permission)");
  } catch (error) {
    console.error(" Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createNoPermissionUser();
