const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    // Vérifier si l'admin existe
    const admin = await prisma.user.findUnique({
      where: { email: "admin@julee.local" },
    });

    console.log("Recherche de l'admin:", admin);

    if (!admin) {
      console.log("L'admin n'existe pas, création...");
      const newAdmin = await prisma.user.create({
        data: {
          nom: "Admin",
          prenom: "System",
          email: "admin@julee.local",
          motDePasse: "JuleeAdmin@2024!",
          profilId: 1, // Profil admin
        },
      });
      console.log("Admin créé:", newAdmin);
    } else {
      console.log("Admin trouvé, mot de passe:", admin.motDePasse);
      console.log(
        "Mot de passe correspond?",
        admin.motDePasse === "JuleeAdmin@2024!",
      );
    }

    // Lister tous les utilisateurs
    const allUsers = await prisma.user.findMany();
    console.log(
      "Tous les utilisateurs:",
      allUsers.map((u) => ({
        email: u.email,
        nom: u.nom,
        profilId: u.profilId,
      })),
    );
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
