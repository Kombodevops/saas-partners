const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const buildPrefixes = (value: string) => {
  const result: string[] = [];
  let current = '';
  for (const char of value) {
    current += char;
    result.push(current);
  }
  return result;
};

export const buildSearchQueries = (inputs: Array<string | null | undefined>) => {
  const set = new Set<string>();
  const addValue = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    buildPrefixes(value).forEach((item) => set.add(item));
    value
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => {
        buildPrefixes(token).forEach((item) => set.add(item));
      });
    const normalized = normalizeText(value);
    if (normalized !== value) {
      buildPrefixes(normalized).forEach((item) => set.add(item));
      normalized
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => {
          buildPrefixes(token).forEach((item) => set.add(item));
        });
    }
  };
  inputs.forEach((input) => {
    if (typeof input === 'string') addValue(input);
  });
  return Array.from(set);
};
