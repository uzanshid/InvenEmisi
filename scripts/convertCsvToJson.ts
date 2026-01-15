/**
 * Script to convert EMEP/EEA CSV to JSON
 * Run with: npx tsx scripts/convertCsvToJson.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmissionFactor {
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

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function main() {
    const csvPath = path.join(__dirname, '..', 'CORINAIR Emission Factor.csv');
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'emissionFactors.json');

    console.log('Reading CSV from:', csvPath);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');

    // Skip header
    const header = lines[0];
    console.log('Header:', header);

    const factors: EmissionFactor[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        // Parse value
        const valueStr = cols[9]?.trim();
        const value = parseFloat(valueStr);

        if (isNaN(value) || !cols[10]) {
            skipped++;
            continue;
        }

        const factor: EmissionFactor = {
            id: `EF-${String(factors.length + 1).padStart(5, '0')}`,
            nfr: cols[0] || '',
            sector: cols[1] || '',
            table: cols[2] || '',
            type: cols[3] || '',
            technology: cols[4] || '',
            fuel: cols[5] || '',
            abatement: cols[6] || '',
            region: cols[7] || '',
            pollutant: cols[8] || '',
            value: value,
            unit: cols[10] || '',
            ciLower: cols[11] ? parseFloat(cols[11]) || null : null,
            ciUpper: cols[12] ? parseFloat(cols[12]) || null : null,
            reference: cols[13] || '',
        };

        factors.push(factor);
    }

    console.log(`Processed ${factors.length} emission factors (skipped ${skipped} invalid rows)`);

    // Write JSON
    fs.writeFileSync(outputPath, JSON.stringify(factors, null, 2), 'utf-8');
    console.log('Written to:', outputPath);

    // Print some stats
    const sectors = new Set(factors.map(f => f.sector));
    const pollutants = new Set(factors.map(f => f.pollutant));
    const fuels = new Set(factors.map(f => f.fuel));

    console.log(`\nStats:`);
    console.log(`  Sectors: ${sectors.size}`);
    console.log(`  Pollutants: ${pollutants.size}`);
    console.log(`  Fuels: ${fuels.size}`);
}

main();
