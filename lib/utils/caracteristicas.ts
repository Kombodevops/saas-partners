export const buildCaracteristicasDerived = (caracteristicas: Record<string, string>) => {
  const entries = Object.entries(caracteristicas ?? {}).filter(
    ([key, value]) => key && typeof value === 'string' && value.trim().length > 0
  );
  const caracteristicasBool = Object.fromEntries(entries.map(([key]) => [key, true]));
  const caracteristicasList = entries.map(([key]) => key);
  return { caracteristicasBool, caracteristicasList };
};
