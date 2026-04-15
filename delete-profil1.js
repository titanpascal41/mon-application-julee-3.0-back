const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function deleteProfil1() {
  try {
    console.log("🗑️  Suppression du profil ID 1 (kouakou)...");

    // D'abord supprimer les permissions liées au profil 1
    const deletedPermissions = await prisma.permission.deleteMany({
      where: { profilId: 1 },
    });
    console.log(`✅ ${deletedPermissions.count} permissions supprimées`);

    // Ensuite supprimer le profil
    const deletedProfil = await prisma.profil.delete({
      where: { id: 1 },
    });
    console.log(
      `✅ Profil "${deletedProfil.nom}" (ID: ${deletedProfil.id}) supprimé`,
    );

    console.log("\n🎉 Profil ID 1 supprimé avec succès !");

    // Vérifier les profils restants
    const remainingProfils = await prisma.profil.findMany();
    console.log("\n📋 Profils restants:");
    remainingProfils.forEach((profil) => {
      console.log(`   ID: ${profil.id} - Nom: "${profil.nom}"`);
    });
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteProfil1();
