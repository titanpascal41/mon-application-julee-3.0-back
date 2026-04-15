import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import {
  chargerPermissionsUtilisateurIndividuelles,
  mettreAJourPermissionsUtilisateur,
  reinitialiserPermissionsUtilisateur,
  verifierPermissionsPersonnalisees
} from './routes/userPermissions.js';

const app = express();

// Middleware
app.use(cors({
  origin: 'http://10.10.179.32:3000',
  credentials: true,
}));
app.use(express.json());

// Routes pour les permissions utilisateur
app.get('/api/user-permissions/user/:userId', chargerPermissionsUtilisateurIndividuelles);
app.put('/api/user-permissions/:userId', mettreAJourPermissionsUtilisateur);
app.post('/api/user-permissions/:userId/reset', reinitialiserPermissionsUtilisateur);
app.get('/api/user-permissions/:userId/has-custom', verifierPermissionsPersonnalisees);

// Route de test pour vérifier si la table existe
app.get('/api/test-tables', async (req, res) => {
  try {
    // Test si la table user_permissions existe
    const tables = await prisma.$queryRaw`SHOW TABLES LIKE 'user_permissions'`;
    
    // Test si on peut insérer une permission utilisateur
    try {
      await prisma.$queryRaw`
        INSERT INTO user_permissions (userId, module, submodule, access, create, read, update, delete)
        VALUES (999, 'test', 'test', false, false, true, false, false)
      `;
      await prisma.$queryRaw`DELETE FROM user_permissions WHERE userId = 999`;
      
      res.json({ 
        message: "Table user_permissions existe et est fonctionnelle",
        tables: tables
      });
    } catch (error) {
      res.json({ 
        message: "Table user_permissions n'existe pas encore",
        error: (error as Error).message,
        tables: tables
      });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Serveur de permissions utilisateur démarré sur le port ${PORT}`);
});
