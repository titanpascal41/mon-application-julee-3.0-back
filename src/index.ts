import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "dotenv";
import { ensureAdminExists } from "./seedAdmin";
import { prisma } from "./db";
import profilsRoutes from "./routes/profils";
import societesRoutes from "./routes/societes";
import interlocuteursRoutes from "./routes/interlocuteurs";
import usersRoutes from "./routes/users";
import statutsRoutes from "./routes/statuts";
import demandesRoutes from "./routes/demandes";
import uoRoutes from "./routes/uo";
import permissionsRoutes from "./routes/permissions";
import auditRoutes from "./routes/audit";
import departementsRoutes from "./routes/departements";
import { requireAuth } from "./middleware/auth";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(morgan("combined"));

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3002', 'http://10.109.69.4:3002', 'http://10.10.179.32:3002'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman in dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Serveur Node.js + TypeScript opérationnel !");
});

// Route publique : login uniquement
app.use("/users", usersRoutes);

// Routes protégées : JWT requis
app.use("/profils", requireAuth, profilsRoutes);
app.use("/societes", requireAuth, societesRoutes);
app.use("/interlocuteurs", requireAuth, interlocuteursRoutes);
app.use("/statuts", requireAuth, statutsRoutes);
app.use("/demandes", requireAuth, demandesRoutes);
app.use("/uo", requireAuth, uoRoutes);
app.use("/permissions", requireAuth, permissionsRoutes);
app.use("/audit", requireAuth, auditRoutes);
app.use("/departements", requireAuth, departementsRoutes);

// Fonction de démarrage du serveur avec création de l'admin
async function createVueProfilsPermissions() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW vue_profils_permissions AS
      SELECT
        p.id         AS profil_id,
        p.code       AS profil_code,
        p.nom        AS profil_nom,
        perm.module,
        perm.submodule,
        perm.access,
        perm.\`create\`,
        perm.\`read\`,
        perm.\`update\`,
        perm.\`delete\`
      FROM profils p
      JOIN JSON_TABLE(
        p.permissions,
        '$[*]' COLUMNS (
          module     VARCHAR(100) PATH '$.module',
          submodule  VARCHAR(100) PATH '$.submodule',
          access     TINYINT(1)   PATH '$.access',
          \`create\` TINYINT(1)   PATH '$.create',
          \`read\`   TINYINT(1)   PATH '$.read',
          \`update\` TINYINT(1)   PATH '$.update',
          \`delete\` TINYINT(1)   PATH '$.delete'
        )
      ) perm ON TRUE
      WHERE p.permissions IS NOT NULL
    `);
    console.log(" Vue vue_profils_permissions créée/mise à jour");
  } catch (e) {
    console.error("Erreur création vue permissions:", e);
  }
}

const UOS_GS2E_DEFAUT = [
  "Service Intégration Fonctionnelle et QSE",
  "Service Cohérence SAPHIR V3",
  "Service Développement Support V3",
  "Service Gestion Clientele CIE",
  "Service Développement OPEN SOURCE",
  "Service STAFF DDI",
  "Service Développement SAPHIR V3",
  "Service Interface",
  "Service Cohérence Caisse Comptabilité",
  "Service Développement et Support Technologies Microsoft",
  "Service Développement Caisse/Comptabilité",
  "Service Développement Editiques",
  "SERVICE SUPPORT",
  "Service Développement Processus Transverses",
  "Service Testing Factory",
  "Service Coherence Demande",
  "Service TNR",
  "Service Développement Demandes",
  "Service PIC et Migration",
  "Service Gestion De Projets",
  "SERVICE DEVELOPPEMENT WEB MOBILE ET LOT",
  "Service Développement Facturation et Recouvrement",
  "Service De Gestion Clientele SODECI",
  "Service Cohérence Facturation",
];

async function ensureDefaultUOs() {
  try {
    // Créer GS2E si elle n'existe pas
    let gs2e = await (prisma as any).societe.findFirst({ where: { code: "GS2E" } });
    if (!gs2e) {
      gs2e = await (prisma as any).societe.create({
        data: { code: "GS2E", nom: "GS2E", actif: true }
      });
      console.log("✅ Société GS2E créée par défaut");
    } else if (!gs2e.actif) {
      await (prisma as any).societe.update({ where: { id: gs2e.id }, data: { actif: true } });
      console.log("✅ Société GS2E réactivée");
    }
    for (const nom of UOS_GS2E_DEFAUT) {
      const existing = await (prisma as any).uniteOrganisationnelle.findFirst({ where: { nom, societeId: gs2e.id } });
      if (!existing) {
        await (prisma as any).uniteOrganisationnelle.create({
          data: { nom, chefUO: "-", societeId: gs2e.id, departement: gs2e.departement || null, actif: true }
        });
      }
    }
    console.log("✅ UOs GS2E par défaut vérifiées");
  } catch (e) {
    console.error("❌ Erreur UOs par défaut:", e);
  }
}

const STATUTS_DEFAUT = [
  { nom: "En attente",   description: "Demande en attente de traitement" },
  { nom: "En cours",     description: "Demande en cours de traitement" },
  { nom: "Suspendu",     description: "Demande temporairement suspendue" },
  { nom: "Annulé",       description: "Demande annulée" },
  { nom: "Terminé",      description: "Demande terminée avec succès" },
];

async function ensureDefaultStatuts() {
  try {
    const count = await (prisma as any).statut.count();
    if (count > 0) return; // Statuts déjà présents
    for (let i = 0; i < STATUTS_DEFAUT.length; i++) {
      await (prisma as any).statut.create({
        data: { ...STATUTS_DEFAUT[i], actif: true, ordre: i }
      });
    }
    console.log("✅ Statuts par défaut créés");
  } catch (e) {
    console.error("❌ Erreur statuts par défaut:", e);
  }
}

async function activerSocietesParDefaut() {
  try {
    const result = await (prisma as any).societe.updateMany({
      where: { actif: false },
      data: { actif: true }
    });
    if (result.count > 0) console.log(`✅ ${result.count} société(s) réactivée(s) par défaut`);
  } catch (e) {
    console.error("❌ Erreur réactivation sociétés:", e);
  }
}

async function startServer() {
  try {
    // Attendre un peu pour que la connexion à la base de données s'établisse
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Créer la vue lisible des permissions par profil
    await createVueProfilsPermissions();

    // Créer l'utilisateur admin s'il n'existe pas
    await ensureAdminExists();

    // Réactiver toutes les sociétés par défaut (demande PMO)
    await activerSocietesParDefaut();

    // Créer les statuts par défaut s'il n'y en a aucun
    await ensureDefaultStatuts();

    // Créer les UOs GS2E par défaut si elles n'existent pas
    await ensureDefaultUOs();
    
    // Démarrer le serveur
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[server]: Serveur démarré sur http://0.0.0.0:${PORT}`);
      console.log(`[server]: Accès local: http://localhost:${PORT}`);
      console.log(`[server]: Accès réseau: http://10.109.69.4:${PORT}`);
      console.log(`[server]: Compte admin: admin@julee.local`);
    });
  } catch (error) {
    console.error(' Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();
