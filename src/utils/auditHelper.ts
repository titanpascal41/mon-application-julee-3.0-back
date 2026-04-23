import { prisma } from "../db";

type Action = "CREATION" | "MODIFICATION" | "SUPPRESSION" | "DESACTIVATION" | "REACTIVATION" | "CLOTURE";

export async function logAudit(params: {
  action: Action;
  entite: string;
  entiteId?: number | null;
  entiteNom?: string | null;
  details?: Record<string, any> | null;
  utilisateurId?: number | null;
}) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        action: params.action,
        entite: params.entite,
        entiteId: params.entiteId ?? null,
        entiteNom: params.entiteNom ?? null,
        details: params.details ?? undefined,
        utilisateurId: params.utilisateurId ?? null,
      },
    });
  } catch (error) {
    // Ne pas bloquer l'opération principale si le log échoue
    console.error("Erreur log audit:", error);
  }
}
