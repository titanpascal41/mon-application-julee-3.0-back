const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function giveAllPermissions() {
  try {
    console.log(
      "🔐 Attribution de toutes les permissions au profil kouakou (ID: 1)...",
    );

    const modules = [
      "administration",
      "parametrage",
      "demandes",
      "ressources",
      "reporting",
    ];

    for (const module of modules) {
      // Vérifier si la permission existe déjà
      const existingPermission = await prisma.permission.findFirst({
        where: {
          profilId: 1, // Profil kouakou
          m: module,
        },
      });

      if (existingPermission) {
        // Mettre à jour avec tous les droits
        await prisma.permission.update({
          where: { id: existingPermission.id },
          data: {
            access: true,
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        });
        console.log(`✅ Permission mise à jour pour ${module}`);
      } else {
        // Créer la permission avec tous les droits
        await prisma.permission.create({
          data: {
            profilId: 1, // Profil kouakou
            m: module,
            access: true,
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        });
        console.log(`✅ Permission créée pour ${module}`);
      }
    }

    console.log(
      "\n🎉 Le profil 'kouakou' (ID: 1) a maintenant toutes les permissions !",
    );
    console.log(
      "📝 Les utilisateurs créés avec profilId: 1 auront tous les accès.",
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

giveAllPermissions();
