import { Router } from "express";

const router = Router();

// Route de test simple
router.get("/", async (_req, res) => {
  try {
    res.json({ 
      message: "API fonctionne!",
      timestamp: new Date().toISOString(),
      status: "OK"
    });
  } catch (error) {
    console.error("Erreur test:", error);
    res.status(500).json({ error: "Erreur serveur test" });
  }
});

export default router;
