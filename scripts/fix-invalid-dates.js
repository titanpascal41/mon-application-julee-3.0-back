const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixInvalidDates() {
  try {
    console.log("Recherche des profils avec des dates invalides...");

    // Récupérer tous les profils
    const profils = await prisma.profil.findMany();

    let fixedCount = 0;

    for (const profil of profils) {
      let needsUpdate = false;
      const updateData = {};

      // Vérifier dateCreation
      if (profil.dateCreation) {
        const dateCreation = new Date(profil.dateCreation);
        if (
          isNaN(dateCreation.getTime()) ||
          dateCreation.getDate() === 0 ||
          (dateCreation.getMonth() === 0 && dateCreation.getDate() === 0)
        ) {
          console.log(
            `DateCreation invalide trouvée pour le profil ${profil.id}: ${profil.dateCreation}`,
          );
          updateData.dateCreation = new Date();
          needsUpdate = true;
        }
      }

      // Vérifier dateModification
      if (profil.dateModification) {
        const dateModification = new Date(profil.dateModification);
        if (
          isNaN(dateModification.getTime()) ||
          dateModification.getDate() === 0 ||
          (dateModification.getMonth() === 0 &&
            dateModification.getDate() === 0)
        ) {
          console.log(
            `DateModification invalide trouvée pour le profil ${profil.id}: ${profil.dateModification}`,
          );
          updateData.dateModification = new Date();
          needsUpdate = true;
        }
      }

      // Mettre à jour si nécessaire
      if (needsUpdate) {
        await prisma.profil.update({
          where: { id: profil.id },
          data: updateData,
        });
        console.log(`Profil ${profil.id} corrigé`);
        fixedCount++;
      }
    }

    console.log(
      `Correction terminée. ${fixedCount} profils ont été mis à jour.`,
    );
  } catch (error) {
    console.error("Erreur lors de la correction des dates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvalidDates();
