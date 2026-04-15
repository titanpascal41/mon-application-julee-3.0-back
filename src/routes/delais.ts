// import { Router } from "express";
// import { prisma } from "../db";

// const router = Router();

// // GET all delais
// router.get("/", async (_req, res) => {
//   try {
//     const delais = await prisma.delai.findMany({
//       orderBy: { dateCreation: 'desc' }
//     });
//     return res.json(delais);
//   } catch (error) {
//     console.error("Erreur SELECT delais:", error);
//     return res.status(500).json({ message: "Erreur lors de la récupération des délais", error: error instanceof Error ? error.message : error });
//   }
// });

// // GET by id
// router.get("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const delai = await prisma.delai.findUnique({
//       where: { id: parseInt(id) }
//     });
//     if (!delai) return res.status(404).json({ message: "Délai non trouvé" });
//     return res.json(delai);
//   } catch (error) {
//     console.error("Erreur SELECT delai:", error);
//     return res.status(500).json({ message: "Erreur lors de la récupération", error: error instanceof Error ? error.message : error });
//   }
// });

// // CREATE
// router.post("/", async (req, res) => {
//   try {
//     const { dateValidationSI, dateReponseDEV, dateReponseTIV } = req.body;

//     const delai = await prisma.delai.create({
//       data: {
//         dateValidationSI: dateValidationSI ? new Date(dateValidationSI) : null,
//         dateReponseDEV: dateReponseDEV ? new Date(dateReponseDEV) : null,
//         dateReponseTIV: dateReponseTIV ? new Date(dateReponseTIV) : null
//       }
//     });
//     return res.status(201).json(delai);
//   } catch (error) {
//     console.error("Erreur INSERT delai:", error);
//     return res.status(500).json({ message: "Erreur lors de la création", error: error instanceof Error ? error.message : error });
//   }
// });

// // UPDATE
// router.put("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { dateValidationSI, dateReponseDEV, dateReponseTIV } = req.body;

//     const updateData: any = {};
//     if (dateValidationSI !== undefined) updateData.dateValidationSI = dateValidationSI ? new Date(dateValidationSI) : null;
//     if (dateReponseDEV !== undefined) updateData.dateReponseDEV = dateReponseDEV ? new Date(dateReponseDEV) : null;
//     if (dateReponseTIV !== undefined) updateData.dateReponseTIV = dateReponseTIV ? new Date(dateReponseTIV) : null;

//     const delai = await prisma.delai.update({
//       where: { id: parseInt(id) },
//       data: updateData
//     });
//     return res.json(delai);
//   } catch (error) {
//     console.error("Erreur UPDATE delai:", error);
//     return res.status(500).json({ message: "Erreur lors de la mise à jour", error: error instanceof Error ? error.message : error });
//   }
// });

// // DELETE
// router.delete("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     await prisma.delai.delete({
//       where: { id: parseInt(id) }
//     });
//     return res.json({ message: "Délai supprimé" });
//   } catch (error) {
//     console.error("Erreur DELETE delai:", error);
//     return res.status(500).json({ message: "Erreur lors de la suppression", error: error instanceof Error ? error.message : error });
//   }
// });

// export default router;
