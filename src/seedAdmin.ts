import { prisma } from './db';
import bcrypt from 'bcrypt';

export async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ ERREUR : ADMIN_EMAIL et ADMIN_PASSWORD sont requis dans le fichier .env');
    process.exit(1);
  }

  try {
    console.log('🔍 Vérification de l\'utilisateur admin au démarrage...');

    // Vérifier si le profil admin existe
    let adminProfil = await prisma.profil.findUnique({
      where: { nom: 'admin' }
    });

    // Créer le profil admin s'il n'existe pas
    if (!adminProfil) {
      console.log('➕ Création du profil admin...');
      adminProfil = await prisma.profil.create({
        data: {
          nom: 'admin'
        }
      });
      console.log('✅ Profil admin créé avec ID:', adminProfil.id);
    }

    // Vérifier si l'utilisateur admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Utilisateur admin déjà existant');
      return;
    }

    // Créer l'utilisateur admin
    console.log('➕ Création de l\'utilisateur admin...');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        prenom: 'Admin',
        nom: 'Julee',
        email: adminEmail,
        motDePasse: hashedPassword,
        profilId: adminProfil.id
      }
    });

    console.log('✅ Utilisateur admin créé avec ID:', adminUser.id);
    console.log('✅ Utilisateur admin prêt à l\'emploi !');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  }
}

// Seed des sociétés de référence
const SOCIETES_REF = [
  "AWALE", "CIE", "CIPREL", "ERANOVE", "GS2E", "GS2E/CIE/SODECI",
  "MA2E", "OMILAYE", "SB2E", "SDER", "SGA2E", "SIVE", "SMART ENERGY", "SODECI",
];

const DEPARTEMENTS_GS2E = [
  "DDI SAPHIR V3",
  "Département Audit Interne",
  "Département Budget Contrôle de Gestion",
  "Département de Développements Informatiques",
  "Département des Ressources Humaines",
  "Département Etudes Economiques",
  "Département Qualité Sécurité Environnement",
  "SMART ENERGY",
  "Système Management Environnemental et Social",
];

export async function seedSocietes() {
  try {
    console.log('🏢 Vérification des sociétés de référence...');

    // Ne seeder que si la table est vide (premier démarrage uniquement)
    const count = await prisma.societe.count();
    if (count > 0) {
      console.log('✅ Sociétés déjà initialisées, seed ignoré.');
      return;
    }

    for (const nom of SOCIETES_REF) {
      const code = nom.replace(/\s+/g, '_').toUpperCase();
      await prisma.societe.create({
        data: { code, nom, source: 'ajoutee', actif: false }
      });
      console.log(`  ✅ Société créée : ${nom}`);
    }
    // GS2E avec départements
    for (const dept of DEPARTEMENTS_GS2E) {
      await prisma.societe.create({
        data: { code: 'GS2E', nom: 'GS2E', departement: dept, source: 'ajoutee', actif: false }
      });
      console.log(`  ✅ GS2E/${dept} créée`);
    }
    console.log('✅ Sociétés de référence créées et désactivées par défaut.');
  } catch (error) {
    console.error('❌ Erreur seed sociétés:', error);
  }
}

// Fonction pour s'assurer que l'admin est créé avant de continuer
export async function ensureAdminExists() {
  await seedAdminUser();
  await seedSocietes();
}
