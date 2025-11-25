import { WinerimWineWithMatch } from '@/services/winerimApi';

export interface GrapeRecommendation {
  name: string;
  count: number;
  wines: WinerimWineWithMatch[];
}

export interface RegionRecommendation {
  region: string;
  country: string;
  count: number;
  wines: WinerimWineWithMatch[];
  avgMatchPercentage: number;
}

/**
 * Aggregates grapes from winerim wines and returns top 6 most frequent
 */
export const aggregateGrapes = (wines: WinerimWineWithMatch[]): GrapeRecommendation[] => {
  const grapeMap = new Map<string, WinerimWineWithMatch[]>();

  wines.forEach(wine => {
    if (wine.grapes && wine.grapes.length > 0) {
      wine.grapes.forEach(grape => {
        const grapeName = grape.trim();
        if (!grapeMap.has(grapeName)) {
          grapeMap.set(grapeName, []);
        }
        grapeMap.get(grapeName)!.push(wine);
      });
    }
  });

  const recommendations = Array.from(grapeMap.entries()).map(([name, wines]) => ({
    name,
    count: wines.length,
    wines
  }));

  return recommendations
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};

/**
 * Aggregates regions from winerim wines and returns top 6 most frequent
 */
export const aggregateRegions = (wines: WinerimWineWithMatch[]): RegionRecommendation[] => {
  const regionMap = new Map<string, WinerimWineWithMatch[]>();

  wines.forEach(wine => {
    if (wine.region && wine.country) {
      const key = `${wine.region}|${wine.country}`;
      if (!regionMap.has(key)) {
        regionMap.set(key, []);
      }
      regionMap.get(key)!.push(wine);
    }
  });

  const recommendations = Array.from(regionMap.entries()).map(([key, wines]) => {
    const [region, country] = key.split('|');
    const avgMatch = wines.reduce((sum, w) => sum + w.matchPercentage, 0) / wines.length;

    return {
      region,
      country,
      count: wines.length,
      wines,
      avgMatchPercentage: Math.round(avgMatch)
    };
  });

  return recommendations
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.avgMatchPercentage - a.avgMatchPercentage;
    })
    .slice(0, 6);
};

/**
 * Filters wines by grape name
 */
export const filterWinesByGrape = (wines: WinerimWineWithMatch[], grapeName: string): WinerimWineWithMatch[] => {
  return wines.filter(wine =>
    wine.grapes?.some(g => g.trim() === grapeName)
  );
};

/**
 * Filters wines by region and country
 */
export const filterWinesByRegion = (wines: WinerimWineWithMatch[], region: string, country: string): WinerimWineWithMatch[] => {
  return wines.filter(wine =>
    wine.region === region && wine.country === country
  );
};
