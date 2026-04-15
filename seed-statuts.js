const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const STATUTS_OFFICIELS = [
  { nom: "Enregistré",                        description: "Demande enregistrée" },
  { nom: "ND - Non démarré",                  description: "Demande non démarrée" },
  { nom: "Evaluation et planification en cours", description: "Evaluation et planification en cours" },
  { nom: "Dev en cours",                      description: "Développement en cours" },
  { nom: "TIF en cours",                      description: "TIF en cours" },
  { nom: "LIV Recette",                       description: "Livraison recette" },
  { nom: "SUSPENDU",                          description: "Demande suspendue" },
];

async function main() {
  console.log("🧹 Suppression des statuts automatiques...");
  await prisma.statut.deleteMany({ where: { estAutomatique: true } });

  console.log("✅ Insertion des 7 statuts officiels...");
  for (const statut of STATUTS_OFFICIELS) {
    await prisma.statut.upsert({
      where: { nom: statut.nom },
      update: { description: statut.description, actif: true, estAutomatique: false },
      create: { nom: statut.nom, description: statut.description, actif: true, estAutomatique: false },
    });
    console.log(`  ✔ ${statut.nom}`);
  }

  console.log("\n🎉 Statuts mis à jour avec succès !");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
