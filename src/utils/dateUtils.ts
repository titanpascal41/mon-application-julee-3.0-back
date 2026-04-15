// Utilitaires pour la gestion des dates

export const formatDateForDB = (date?: Date): string => {
  const d = date || new Date();
  return d.toISOString().split('T')[0]; // Format: yyyy-MM-dd
};

export const formatDateTimeForDB = (date?: Date): string => {
  const d = date || new Date();
  return d.toISOString(); // Format complet ISO
};
