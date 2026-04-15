import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed Prisma...');

  // Créer le profil admin s'il n'existe pas
  const adminProfil = await prisma.profil.upsert({
    where: { nom: 'Administrateur' },
    update: {},
    create: {
      nom: 'Administrateur',
    },
  });

  console.log('✅ Profil administrateur créé/trouvé:', adminProfil);

  // Créer l'utilisateur admin s'il n'existe pas
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@julee.local' },
    update: {
      motDePasse: 'JuleeAdmin@2024!',
      profilId: adminProfil.id, // Force le bon profilId
    },
    create: {
      prenom: 'System',
      nom: 'Admin',
      email: 'admin@julee.local',
      motDePasse: 'JuleeAdmin@2024!',
      profilId: adminProfil.id,
    },
  });

  console.log('✅ Utilisateur admin créé/trouvé:', adminUser);

  // Créer les permissions pour le profil admin
  const modules = [
    'administration',
    'parametrage', 
    'demandes',
    'ressources',
    'reporting'
  ];

  for (const module of modules) {
    const existingPermission = await prisma.permission.findFirst({
      where: {
        profilId: adminProfil.id,
        m: module,
      },
    });

    if (existingPermission) {
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
    } else {
      await prisma.permission.create({
        data: {
          profilId: adminProfil.id,
          m: module,
          access: true,
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      });
    }
  }

  console.log('✅ Permissions administrateur créées/mises à jour');

  // Créer quelques données de base si nécessaire
  const statuts = await prisma.statut.count();
  if (statuts === 0) {
    await prisma.statut.createMany({
      data: [
        { nom: 'Nouveau', description: 'Demande nouvellement créée' },
        { nom: 'En cours', description: 'Demande en cours de traitement' },
        { nom: 'Terminé', description: 'Demande terminée' },
        { nom: 'Annulé', description: 'Demande annulée' },
      ],
    });
    console.log('✅ Statuts de base créés');
  }

  console.log('🎉 Seed terminé avec succès !');
  console.log('📝 Identifiants admin:');
  console.log('   Email: admin@julee.local');
  console.log('   Mot de passe: JuleeAdmin@2024!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
