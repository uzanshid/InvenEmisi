import { create, all } from 'mathjs';
import { deriveUnitFromFormula } from './unitAlgebra';

const math = create(all);

export interface ScalarInput {
    value: number;
    unit: string;
}

export interface CalculationResult {
    success: boolean;
    data?: any[];
    error?: {
        rowIndex: number;
        message: string;
    };
    newColumn?: string;
    derivedUnit?: string;
    unitWarning?: string;
}

// Sanitize column name to be a valid JavaScript variable name
const sanitizeVarName = (name: string): string => {
    let safe = name.replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^[0-9]/.test(safe)) {
        safe = '_' + safe;
    }
    return safe;
};

export const executeBatchFormula = (
    rows: any[],
    newColumnName: string,
    formula: string,
    existingSchema: string[],
    columnUnits: Record<string, string> = {},
    scalarInputs: Record<string, ScalarInput> = {}
): CalculationResult => {
    const updatedRows = [...rows];

    // Validate formula
    if (!formula || formula.trim() === '') {
        return { success: false, error: { rowIndex: -1, message: "Formula is empty" } };
    }

    // Validate that all word references are in brackets
    // This regex finds word characters not inside brackets and not part of operators/numbers
    const cleanedFormula = formula
        .replace(/\[[^\]]+\]/g, '') // Remove all [bracketed] terms
        .replace(/[0-9.]+/g, '')    // Remove all numbers
        .replace(/[+\-*/^()]/g, '') // Remove all operators
        .replace(/\s+/g, '');       // Remove whitespace

    if (cleanedFormula.length > 0) {
        // There are unbracketed words - find what they are
        const unbracketedMatch = formula.match(/(?<!\[)\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\])/);
        const unbracketedTerm = unbracketedMatch ? unbracketedMatch[1] : cleanedFormula;
        return {
            success: false,
            error: {
                rowIndex: -1,
                message: `Invalid term "${unbracketedTerm}" - all column and scalar references must be in brackets like [${unbracketedTerm}]`
            }
        };
    }

    // Build column name mapping
    const columnMapping: Record<string, string> = {};
    existingSchema.forEach(colName => {
        columnMapping[colName] = sanitizeVarName(colName);
    });

    // Build scalar name mapping
    const scalarMapping: Record<string, string> = {};
    Object.keys(scalarInputs).forEach(name => {
        scalarMapping[name] = sanitizeVarName(name);
    });

    // Derive unit from formula
    const unitResult = deriveUnitFromFormula(formula, columnUnits, scalarInputs);

    for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];

        // Build scope with column values
        const cleanScope: any = {};
        let cleanFormula = formula;

        // Add column values to scope
        existingSchema.forEach(colName => {
            const val = Number(row[colName]);
            const safeVarName = columnMapping[colName];
            cleanScope[safeVarName] = isNaN(val) ? row[colName] : val;

            const escapedColName = colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanFormula = cleanFormula.replace(new RegExp(`\\[${escapedColName}\\]`, 'g'), safeVarName);
        });

        // Add scalar values to scope
        Object.entries(scalarInputs).forEach(([name, input]) => {
            const safeVarName = scalarMapping[name];
            cleanScope[safeVarName] = input.value;

            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanFormula = cleanFormula.replace(new RegExp(`\\[${escapedName}\\]`, 'g'), safeVarName);
        });

        try {
            const result = math.evaluate(cleanFormula, cleanScope);

            // Fail-Fast: Result must be valid
            if (result === undefined || result === null || (typeof result === 'number' && isNaN(result))) {
                return {
                    success: false,
                    error: {
                        rowIndex: i + 1,
                        message: `Calculation resulted in invalid value at row ${i + 1}`
                    }
                };
            }

            updatedRows[i] = { ...row, [newColumnName]: result };
        } catch (error: any) {
            return {
                success: false,
                error: {
                    rowIndex: i + 1,
                    message: `Error at row ${i + 1}: ${error.message}`
                }
            };
        }
    }

    return {
        success: true,
        data: updatedRows,
        newColumn: newColumnName,
        derivedUnit: unitResult.unit,
        unitWarning: unitResult.warning
    };
};
