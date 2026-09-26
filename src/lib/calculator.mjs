export const regions = {
  inland: { label: 'Kontinentalna Hrvatska', yield: 1100 },
  istria: { label: 'Istra i Kvarner', yield: 1250 },
  dalmatia: { label: 'Dalmacija', yield: 1400 },
  mountains: { label: 'Gorska Hrvatska i Lika', yield: 1050 },
};
export const orientations = { south: 1, southeast: 0.95, southwest: 0.95, east: 0.82, west: 0.82, north: 0.6 };
export function calculateSolar(input) {
  const { region, orientation, consumption, area, tariff, selfUse, unitCost, subsidy, exportPrice, shade } = input;
  const numbers = [consumption, area, tariff, selfUse, unitCost, subsidy, exportPrice, shade];
  if (numbers.some(n => !Number.isFinite(n)) || !Object.hasOwn(regions, region) || !Object.hasOwn(orientations, orientation)) throw new Error('Provjerite unesene podatke.');
  if (consumption < 500 || consumption > 50000 || area < 5 || area > 500 || tariff < 0.01 || tariff > 1 || selfUse < 10 || selfUse > 100 || unitCost < 500 || unitCost > 3000 || subsidy < 0 || subsidy > 80 || exportPrice < 0 || exportPrice > 1 || shade < 0 || shade > 50) throw new Error('Unesite vrijednosti unutar navedenih raspona.');
  const annualYield = regions[region].yield * orientations[orientation] * (1 - shade / 100);
  const targetPanels = Math.max(1, Math.ceil(consumption / annualYield / 0.45));
  const maxPanels = Math.floor(area / 2.2);
  const panelCount = Math.min(targetPanels, maxPanels);
  const power = panelCount * 0.45;
  const production = power * annualYield;
  const used = Math.min(production * selfUse / 100, consumption);
  const exported = Math.max(0, production - used);
  const savings = used * tariff + exported * exportPrice;
  const investment = power * unitCost * (1 - subsidy / 100);
  const payback = savings > 0 ? investment / savings : null;
  const monthlyShares = [0.035,0.05,0.08,0.105,0.125,0.135,0.14,0.12,0.09,0.06,0.035,0.025];
  return { power, panelCount, production, used, exported, savings, investment, payback, roofLimited: maxPanels < targetPanels, area: panelCount * 2.2, monthly: monthlyShares.map(share => production * share) };
}
