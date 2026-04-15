import express from "express";
import cors from "cors";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Route de test
app.get("/", (_req, res) => {
  res.json({ message: "Backend simplifié opérationnel !" });
});

// Route statuts simple
app.get("/statuts", (_req, res) => {
  res.json([
    { id: 1, nom: "En attente", description: "Demande en attente de validation" },
    { id: 2, nom: "Validée", description: "Demande validée" },
    { id: 3, nom: "En cours", description: "Demande en cours de traitement" },
    { id: 4, nom: "Terminée", description: "Demande terminée" }
  ]);
});

// Route societes simple
app.get("/societes", (_req, res) => {
  res.json([
    { id: 1, nom: "Société A", adresse: "Adresse A", email: "a@societe.com" },
    { id: 2, nom: "Société B", adresse: "Adresse B", email: "b@societe.com" }
  ]);
});

// POST créer une société simple
app.post("/societes", (req, res) => {
  const { nom, adresse, email, telephone, responsable } = req.body;
  
  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: "Le nom de la société est obligatoire" });
  }
  
  const nouvelleSociete = {
    id: Date.now(),
    nom: nom.trim(),
    adresse: adresse?.trim() || null,
    email: email?.trim() || null,
    telephone: telephone?.trim() || null,
    responsable: responsable?.trim() || null,
    dateCreation: new Date().toISOString()
  };
  
  res.status(201).json(nouvelleSociete);
});

app.listen(PORT, () => {
  console.log(`[server]: Backend simplifié démarré sur http://localhost:${PORT}`);
});
