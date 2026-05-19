import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const MODULES = ['administration', 'parametrage', 'demandes', 'ressources', 'reporting'];

const PERMISSIONS_ADMIN = MODULES.map(module => ({
  module,
  submodule: null,
  access: true, create: true, read: true, update: true, delete: true,
}));

async function main() {
  console.log('🌱 Démarrage du seed Prisma...');

  // Profil admin — permissions stockées en JSON dans Profil.permissions
  const adminProfil = await prisma.profil.upsert({
    where: { nom: 'Administrateur' },
    update: { permissions: PERMISSIONS_ADMIN },
    create: { nom: 'Administrateur', permissions: PERMISSIONS_ADMIN },
  });

  console.log('✅ Profil administrateur créé/trouvé');

  const hashedPassword = await bcrypt.hash('JuleeAdmin@2024!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@julee.local' },
    update: { motDePasse: hashedPassword, profilId: adminProfil.id },
    create: {
      prenom: 'System',
      nom: 'Admin',
      email: 'admin@julee.local',
      motDePasse: hashedPassword,
      profilId: adminProfil.id,
      actif: true,
    },
  });

  console.log('✅ Utilisateur admin créé/trouvé:', adminUser.email);

  const statuts = await prisma.statut.count();
  if (statuts === 0) {
    await prisma.statut.createMany({
      data: [
        { nom: 'Nouveau', description: 'Demande nouvellement créée', ordre: 0 },
        { nom: 'En cours', description: 'Demande en cours de traitement', ordre: 1 },
        { nom: 'Terminé', description: 'Demande terminée', ordre: 2 },
        { nom: 'Annulé', description: 'Demande annulée', ordre: 3 },
      ],
    });
    console.log('✅ Statuts de base créés');
  }

  console.log('🎉 Seed terminé avec succès !');
  console.log('   Email: admin@julee.local');
  console.log('   Mot de passe: JuleeAdmin@2024!');
}

main()
  .catch((e) => { console.error('❌ Erreur lors du seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
