const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  console.log('Correction des dates invalides...');
  
  try {
    // Mettre à jour les profils avec des dates valides
    const result = await prisma.profil.updateMany({
      where: {},
      data: {
        dateModification: new Date()
      }
    });
    
    console.log(`Profils mis à jour: ${result.count}`);
    
    // Le modèle User n'a pas de dateModification, on saute cette étape
    
    console.log('Dates corrigées avec succès!');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDates();
