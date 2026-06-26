import express from "express";
import cors from "cors";
import { config } from "dotenv";
import profilsRoutes from "./routes/profils";
import societesRoutes from "./routes/societes";
import interlocuteursRoutes from "./routes/interlocuteurs";
import usersRoutes from "./routes/users";
import statutsRoutes from "./routes/statuts";
import demandesRoutes from "./routes/demandes";
import uoRoutes from "./routes/uo";
// import permissionsRoutes from "./routes/permissions";
import testRoutes from "./routes/test";
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

app.use(cors());
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
app.use("/test", testRoutes);
// app.use("/permissions", permissionsRoutes);
// app.use("/recettes", recettesRoutes);
// app.use("/livraisons", livraisonsRoutes);
// app.use("/uat", uatRoutes);
// app.use("/roadmap", roadmapRoutes);
// app.use("/cadre-temporel", cadreTemporelRoutes);
// app.use("/sprints", sprintsRoutes);
// app.use("/ressources", ressourcesRoutes);
// app.use("/delais", delaisRoutes);
// app.use("/couts", coutsRoutes);

app.listen(PORT, () => {
  console.log(`[server]: Serveur démarré sur http://localhost:${PORT}`);
});
