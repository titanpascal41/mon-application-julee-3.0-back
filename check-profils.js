const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function checkProfils() {
  try {
    console.log("📋 Vérification des profils et utilisateurs...");

    // Voir tous les profils
    const profils = await prisma.profil.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
          },
        },
      },
    });

    console.log("\n🏷️  Profils disponibles:");
    profils.forEach((profil) => {
      console.log(
        `   ID: ${profil.id} - Nom: "${profil.nom}" (${profil.users.length} utilisateurs)`,
      );
      profil.users.forEach((user) => {
        console.log(`      └─ ${user.email} (${user.prenom} ${user.nom})`);
      });
    });

    // Voir tous les utilisateurs
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        profilId: true,
      },
    });

    console.log("\n👥 Tous les utilisateurs:");
    allUsers.forEach((user) => {
      console.log(
        `   ID: ${user.id} - ${user.email} - ProfilID: ${user.profilId}`,
      );
    });
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfils();
