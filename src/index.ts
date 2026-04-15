import express from "express";
import cors from "cors";
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
// import recettesRoutes from "./routes/recettes";
// import livraisonsRoutes from "./routes/livraisons";
// import uatRoutes from "./routes/uat";
// import roadmapRoutes from "./routes/roadmap";
// import cadreTemporelRoutes from "./routes/cadreTemporel";
// import sprintsRoutes from "./routes/sprints";
// import ressourcesRoutes from "./routes/ressources";
// import delaisRoutes from "./routes/delais";
// import coutsRoutes from "./routes/couts";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  // origin: ['http://localhost:3000', 'http://10.109.69.4:3002', 'http://localhost:3002', 'http://10.10.179.32:3000', 'http://10.10.179.32:3002'],
  origin: true,
  credentials: true
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Serveur Node.js + TypeScript opérationnel !");
});

app.use("/profils", profilsRoutes);
app.use("/societes", societesRoutes);
app.use("/interlocuteurs", interlocuteursRoutes);
app.use("/users", usersRoutes);
app.use("/statuts", statutsRoutes);
app.use("/demandes", demandesRoutes);
app.use("/uo", uoRoutes);
app.use("/permissions", permissionsRoutes);
app.use("/audit", auditRoutes);
// app.use("/recettes", recettesRoutes);
// app.use("/livraisons", livraisonsRoutes);
// app.use("/uat", uatRoutes);
// app.use("/roadmap", roadmapRoutes);
// app.use("/cadre-temporel", cadreTemporelRoutes);
// app.use("/sprints", sprintsRoutes);
// app.use("/ressources", ressourcesRoutes);
// app.use("/delais", delaisRoutes);
// app.use("/couts", coutsRoutes);

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
    console.log("✅ Vue vue_profils_permissions créée/mise à jour");
  } catch (e) {
    console.error("❌ Erreur création vue permissions:", e);
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
    
    // Démarrer le serveur
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[server]: Serveur démarré sur http://0.0.0.0:${PORT}`);
      console.log(`[server]: Accès local: http://localhost:${PORT}`);
      console.log(`[server]: Accès réseau: http://10.109.69.4:${PORT}`);
      console.log(`[server]: Utilisateur admin: admin@julee.local / JuleeAdmin@2024!`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();
