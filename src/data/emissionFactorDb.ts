/**
 * EMEP/EEA Emission Factor Database
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
 * Filter options interface
 */
export interface FilterOptions {
    query?: string;
    nfr?: string;
    sector?: string;
    table?: string;
    type?: string;
    technology?: string;
    fuel?: string;
    abatement?: string;
    region?: string;
    pollutant?: string;
    limit?: number;
}

/**
 * Search emission factors with multi-column filtering
 */
export function searchFactors(
    query: string,
    sector?: string,
    pollutant?: string,
    limit: number = 1000
): EmissionFactor[] {
    // Backward compatibility wrapper
    return searchFactorsWithFilters({
        query,
        sector,
        pollutant,
        limit
    });
}

/**
 * Search emission factors with comprehensive filters
 */
export function searchFactorsWithFilters(filters: FilterOptions): EmissionFactor[] {
    let results = [...EMISSION_FACTORS];
    const limit = filters.limit || 1000;

    // Filter by NFR
    if (filters.nfr && filters.nfr !== 'All NFR') {
        results = results.filter(ef => ef.nfr === filters.nfr);
    }

    // Filter by sector
    if (filters.sector && filters.sector !== 'All Sectors') {
        results = results.filter(ef => ef.sector === filters.sector);
    }

    // Filter by table
    if (filters.table && filters.table !== 'All Tables') {
        results = results.filter(ef => ef.table === filters.table);
    }

    // Filter by type
    if (filters.type && filters.type !== 'All Types') {
        results = results.filter(ef => ef.type === filters.type);
    }

    // Filter by technology
    if (filters.technology && filters.technology !== 'All Technologies') {
        results = results.filter(ef => ef.technology === filters.technology);
    }

    // Filter by fuel
    if (filters.fuel && filters.fuel !== 'All Fuels') {
        results = results.filter(ef => ef.fuel === filters.fuel);
    }

    // Filter by abatement
    if (filters.abatement && filters.abatement !== 'All Abatements') {
        results = results.filter(ef => ef.abatement === filters.abatement);
    }

    // Filter by region
    if (filters.region && filters.region !== 'All Regions') {
        results = results.filter(ef => ef.region === filters.region);
    }

    // Filter by pollutant
    if (filters.pollutant && filters.pollutant !== 'All Pollutants') {
        results = results.filter(ef => ef.pollutant === filters.pollutant);
    }

    // Search by query
    if (filters.query && filters.query.trim()) {
        const q = filters.query.toLowerCase();
        results = results.filter(ef =>
            ef.fuel.toLowerCase().includes(q) ||
            ef.sector.toLowerCase().includes(q) ||
            ef.pollutant.toLowerCase().includes(q) ||
            ef.technology.toLowerCase().includes(q) ||
            ef.reference.toLowerCase().includes(q) ||
            ef.nfr.toLowerCase().includes(q) ||
            ef.table.toLowerCase().includes(q) ||
            ef.type.toLowerCase().includes(q) ||
            ef.abatement.toLowerCase().includes(q) ||
            ef.region.toLowerCase().includes(q)
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
 * Get unique NFR codes
 */
export function getUniqueNfr(): string[] {
    const nfrs = new Set(EMISSION_FACTORS.map(ef => ef.nfr));
    return ['All NFR', ...Array.from(nfrs).sort()];
}

/**
 * Get unique sectors
 */
export function getUniqueSectors(): string[] {
    const sectors = new Set(EMISSION_FACTORS.map(ef => ef.sector));
    return ['All Sectors', ...Array.from(sectors).sort()];
}

/**
 * Get unique tables
 */
export function getUniqueTables(): string[] {
    const tables = new Set(EMISSION_FACTORS.map(ef => ef.table));
    return ['All Tables', ...Array.from(tables).sort()];
}

/**
 * Get unique types
 */
export function getUniqueTypes(): string[] {
    const types = new Set(EMISSION_FACTORS.map(ef => ef.type));
    return ['All Types', ...Array.from(types).sort()];
}

/**
 * Get unique technologies
 */
export function getUniqueTechnologies(): string[] {
    const technologies = new Set(EMISSION_FACTORS.map(ef => ef.technology));
    return ['All Technologies', ...Array.from(technologies).sort()];
}

/**
 * Get unique fuels
 */
export function getUniqueFuels(): string[] {
    const fuels = new Set(EMISSION_FACTORS.map(ef => ef.fuel));
    return ['All Fuels', ...Array.from(fuels).sort()];
}

/**
 * Get unique abatements
 */
export function getUniqueAbatements(): string[] {
    const abatements = new Set(EMISSION_FACTORS.map(ef => ef.abatement));
    return ['All Abatements', ...Array.from(abatements).sort()];
}

/**
 * Get unique regions
 */
export function getUniqueRegions(): string[] {
    const regions = new Set(EMISSION_FACTORS.map(ef => ef.region));
    return ['All Regions', ...Array.from(regions).sort()];
}

/**
 * Get unique pollutants
 */
export function getUniquePollutants(): string[] {
    const pollutants = new Set(EMISSION_FACTORS.map(ef => ef.pollutant));
    return ['All Pollutants', ...Array.from(pollutants).sort()];
}
