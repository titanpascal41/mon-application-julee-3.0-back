import { prisma } from '../db';

const MODULES_STRUCTURE = {
  administration: {
    label: "Administration",
    submodules: { profils: "Profils", utilisateurs: "Utilisateurs" },
  },
  parametrage: {
    label: "Paramétrage",
    submodules: { uo: "Unités Organisationnelles", societes: "Sociétés" },
  },
  planification: {
    label: "Planification",
    submodules: { taches: "Tâches", delais: "Délais" },
  },
  demandes: {
    label: "Gestion des Demandes",
    submodules: { creation: "Création", suivi: "Suivi", validation: "Validation" },
  },
};

// GET /api/user-permissions/user/:userId
export const chargerPermissionsUtilisateurIndividuelles = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil: true }
    });

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    // Vérifier permissions individuelles (user_permissions)
    const userPermissions = await prisma.userPermission.findMany({ where: { userId } });

    let permissions: any[];
    if (userPermissions.length > 0) {
      permissions = userPermissions.map((perm: any) => ({
        module: perm.module,
        submodule: perm.submodule,
        access: perm.access,
        create: perm.create,
        read: perm.read,
        update: perm.update,
        delete: perm.delete,
        moduleLabel: (MODULES_STRUCTURE as any)[perm.module]?.label || perm.module,
        submoduleLabel: (MODULES_STRUCTURE as any)[perm.module]?.submodules[perm.submodule] || perm.submodule,
      }));
    } else {
      // Hériter du JSON permissions du profil
      const profilPerms = (user.profil.permissions as any[]) || [];
      permissions = profilPerms.map((perm: any) => ({
        module: perm.module,
        submodule: perm.submodule,
        access: perm.access,
        create: perm.create,
        read: perm.read,
        update: perm.update,
        delete: perm.delete,
        moduleLabel: (MODULES_STRUCTURE as any)[perm.module]?.label || perm.module,
        submoduleLabel: (MODULES_STRUCTURE as any)[perm.module]?.submodules[perm.submodule] || perm.submodule,
      }));
    }

    res.json(permissions);
  } catch (error) {
    console.error('Erreur chargement permissions utilisateur:', error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /api/user-permissions/:userId
export const mettreAJourPermissionsUtilisateur = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    const { permissions } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    await prisma.userPermission.deleteMany({ where: { userId } });

    await prisma.userPermission.createMany({
      data: permissions.map((perm: any) => ({
        userId,
        module: perm.module,
        submodule: perm.submodule,
        access: perm.access || false,
        create: perm.create || false,
        read: perm.read !== undefined ? perm.read : true,
        update: perm.update || false,
        delete: perm.delete || false,
      }))
    });

    res.json({ succes: true, message: `Permissions de ${user.prenom} ${user.nom} mises à jour` });
  } catch (error) {
    console.error('Erreur MAJ permissions utilisateur:', error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /api/user-permissions/:userId/reset
export const reinitialiserPermissionsUtilisateur = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil: true }
    });

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    await prisma.userPermission.deleteMany({ where: { userId } });

    res.json({ succes: true, message: `Permissions de ${user.prenom} ${user.nom} réinitialisées aux permissions du profil ${user.profil.nom}` });
  } catch (error) {
    console.error('Erreur réinitialisation permissions:', error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /api/user-permissions/:userId/has-custom
export const verifierPermissionsPersonnalisees = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await prisma.userPermission.count({ where: { userId } });
    res.json({ hasCustomPermissions: count > 0, count });
  } catch (error) {
    console.error('Erreur vérification permissions personnalisées:', error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
