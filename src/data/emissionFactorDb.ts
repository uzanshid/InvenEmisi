/**
 * CORINAIR Emission Factor Database
 * Full database with 12,542 emission factors
 */

import emissionFactorsData from './emissionFactors.json';

export interface EmissionFactor {
    id: string;
    nfr: string;
    sector: string;
    table: string;
    type: string;
    technology: string;
    fuel: string;
    abatement: string;
    region: string;
    pollutant: string;
    value: number;
    unit: string;
    ciLower: number | null;
    ciUpper: number | null;
    reference: string;
}

// Full emission factors database
export const EMISSION_FACTORS: EmissionFactor[] = emissionFactorsData as EmissionFactor[];

/**
 * Search emission factors
 */
export function searchFactors(
    query: string,
    sector?: string,
    pollutant?: string,
    limit: number = 1000
): EmissionFactor[] {
    let results = [...EMISSION_FACTORS];

    // Filter by sector
    if (sector && sector !== 'All Sectors') {
        results = results.filter(ef => ef.sector === sector);
    }

    // Filter by pollutant
    if (pollutant && pollutant !== 'All Pollutants') {
        results = results.filter(ef => ef.pollutant === pollutant);
    }

    // Search by query
    if (query.trim()) {
        const q = query.toLowerCase();
        results = results.filter(ef =>
            ef.fuel.toLowerCase().includes(q) ||
            ef.sector.toLowerCase().includes(q) ||
            ef.pollutant.toLowerCase().includes(q) ||
            ef.technology.toLowerCase().includes(q) ||
            ef.reference.toLowerCase().includes(q) ||
            ef.nfr.toLowerCase().includes(q)
        );
    }

    return results.slice(0, limit);
}

/**
 * Get factor by ID
 */
export function getFactorById(id: string): EmissionFactor | undefined {
    return EMISSION_FACTORS.find(ef => ef.id === id);
}

/**
 * Get unique sectors
 */
export function getUniqueSectors(): string[] {
    const sectors = new Set(EMISSION_FACTORS.map(ef => ef.sector));
    return ['All Sectors', ...Array.from(sectors).sort()];
}

/**
 * Get unique pollutants
 */
export function getUniquePollutants(): string[] {
    const pollutants = new Set(EMISSION_FACTORS.map(ef => ef.pollutant));
    return ['All Pollutants', ...Array.from(pollutants).sort()];
}

/**
 * Get unique fuels
 */
export function getUniqueFuels(): string[] {
    const fuels = new Set(EMISSION_FACTORS.map(ef => ef.fuel));
    return ['All Fuels', ...Array.from(fuels).sort()];
}
