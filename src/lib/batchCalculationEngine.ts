import { create, all } from 'mathjs';
import { deriveUnitFromFormula } from './unitAlgebra';

const math = create(all);

// ── Override comparison operators for string support ────────────
// math.js's built-in equal/unequal don't support strings — override them
const _originalEqual = math.equal;
const _originalUnequal = math.unequal;
const _originalSmaller = math.smaller;
const _originalSmallerEq = math.smallerEq;
const _originalLarger = math.larger;
const _originalLargerEq = math.largerEq;

math.import({
    equal: function (a: any, b: any) {
        if (typeof a === 'string' || typeof b === 'string') return String(a) === String(b);
        return _originalEqual(a, b);
    },
    unequal: function (a: any, b: any) {
        if (typeof a === 'string' || typeof b === 'string') return String(a) !== String(b);
        return _originalUnequal(a, b);
    },
    smaller: function (a: any, b: any) {
        if (typeof a === 'string' && typeof b === 'string') return a < b;
        return _originalSmaller(a, b);
    },
    smallerEq: function (a: any, b: any) {
        if (typeof a === 'string' && typeof b === 'string') return a <= b;
        return _originalSmallerEq(a, b);
    },
    larger: function (a: any, b: any) {
        if (typeof a === 'string' && typeof b === 'string') return a > b;
        return _originalLarger(a, b);
    },
    largerEq: function (a: any, b: any) {
        if (typeof a === 'string' && typeof b === 'string') return a >= b;
        return _originalLargerEq(a, b);
    },
}, { override: true });

// ── Custom Functions Registration ──────────────────────────────────
// Whitelist of known function names that are allowed without brackets
const KNOWN_FUNCTIONS = new Set([
    // Custom functions
    'IF', 'IFS', 'SWITCH', 'XLOOKUP',
    // Common math.js functions
    'sqrt', 'abs', 'pow', 'round', 'ceil', 'floor', 'log', 'log2', 'log10', 'exp',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'min', 'max', 'mod', 'sign', 'trunc', 'cbrt',
    'pi', 'e', 'true', 'false', 'null',
    // math.js comparison keywords
    'and', 'or', 'not', 'xor',
]);

// IF(condition, trueValue, falseValue)
math.import({
    IF: function (condition: any, trueValue: any, falseValue: any) {
        return condition ? trueValue : falseValue;
    }
}, { override: true });

// IFS(cond1, val1, cond2, val2, ...)
// Uses rawArgs for variadic support in math.js
const ifsImpl = function (...args: any[]) {
    if (args.length % 2 !== 0) {
        throw new Error('IFS requires pairs of (condition, value)');
    }
    for (let i = 0; i < args.length; i += 2) {
        if (args[i]) return args[i + 1];
    }
    throw new Error('IFS: No condition matched');
};
(ifsImpl as any).rawArgs = false; // math.js evaluates args before passing
math.import({ IFS: ifsImpl }, { override: true });

// SWITCH(value, case1, result1, case2, result2, ..., default)
const switchImpl = function (...args: any[]) {
    if (args.length < 3) {
        throw new Error('SWITCH requires at least (value, case, result)');
    }
    const testValue = args[0];
    // Process pairs from index 1
    for (let i = 1; i < args.length - 1; i += 2) {
        if (testValue === args[i] || String(testValue) === String(args[i])) {
            return args[i + 1];
        }
    }
    // If odd remaining arg, it's the default
    if (args.length % 2 === 0) {
        return args[args.length - 1]; // default value
    }
    return null; // no match, no default
};
(switchImpl as any).rawArgs = false;
math.import({ SWITCH: switchImpl }, { override: true });

// XLOOKUP(lookupValue, lookupColumn, returnColumn, defaultValue)
// lookupColumn and returnColumn are arrays (passed from the full dataset)
const xlookupImpl = function (lookupValue: any, lookupArray: any, returnArray: any, defaultValue?: any) {
    // math.js may wrap arrays in Matrix, extract data if needed
    const lookupArr = lookupArray?.toArray ? lookupArray.toArray() : lookupArray;
    const returnArr = returnArray?.toArray ? returnArray.toArray() : returnArray;

    if (!Array.isArray(lookupArr) || !Array.isArray(returnArr)) {
        throw new Error('XLOOKUP: lookup and return columns must be arrays');
    }
    const idx = lookupArr.findIndex((v: any) =>
        v === lookupValue || String(v) === String(lookupValue)
    );
    if (idx !== -1) return returnArr[idx];
    return defaultValue !== undefined ? defaultValue : null;
};
(xlookupImpl as any).rawArgs = false;
math.import({ XLOOKUP: xlookupImpl }, { override: true });

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

/**
 * Aggregate Function Interface
 */
interface AggregateFunction {
    name: string;           // e.g., "$SUM_"
    column: string;         // e.g., "CO2"
    groupBy?: string;       // Optional group column
    originalSyntax: string; // Full syntax from formula
}

/**
 * Detect aggregate functions in formula
 * Syntax: $SUM_[column] or $AVG_[column] etc.
 */
const detectAggregates = (formula: string): AggregateFunction[] => {
    const aggregates: AggregateFunction[] = [];
    const regex = /\$([A-Z]+)_\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(formula)) !== null) {
        const funcName = match[1]; // SUM, AVG, etc.
        const column = match[2];   // Column name
        aggregates.push({
            name: `$${funcName}_`,
            column,
            originalSyntax: match[0]
        });
    }

    return aggregates;
};

/**
 * Calculate aggregate value
 */
const calculateAggregate = (
    funcName: string,
    column: string,
    rows: any[]
): number | null => {
    const values = rows
        .map(row => row[column])
        .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
        .map(v => Number(v));

    if (values.length === 0) return null;

    switch (funcName) {
        case '$SUM_':
            return values.reduce((sum, v) => sum + v, 0);
        case '$AVG_':
            return values.reduce((sum, v) => sum + v, 0) / values.length;
        case '$MIN_':
            return Math.min(...values);
        case '$MAX_':
            return Math.max(...values);
        case '$COUNT_':
            return values.length;
        default:
            return null;
    }
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

    // Validate that all word references are in brackets (with exceptions for known functions)
    // Step 1: Remove all safe tokens from formula, then check what remains
    const cleanedFormula = formula
        .replace(/\$[A-Z]+_\[[^\]]+\]/g, '')   // Remove aggregate syntax $SUM_[col]
        .replace(/\[[^\]]+\]/g, '')             // Remove all [bracketed] terms
        .replace(/"[^"]*"/g, '')                // Remove string literals "..."
        .replace(/[0-9.]+/g, '')                // Remove all numbers
        .replace(/[+\-*/^(),>=<!&|?:]/g, '')    // Remove operators, comparisons, commas
        .replace(/\s+/g, '');                   // Remove whitespace

    if (cleanedFormula.length > 0) {
        // Strip strings, aggregates, and brackets BEFORE searching for unbracketed words
        const strippedFormula = formula
            .replace(/"[^"]*"/g, '')               // Remove string literals
            .replace(/\$[A-Z]+_\[[^\]]+\]/g, '')   // Remove aggregate syntax
            .replace(/\[[^\]]+\]/g, '');            // Remove bracketed terms
        const unbracketedWords = strippedFormula.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];
        const unknownWords = unbracketedWords.filter(word => !KNOWN_FUNCTIONS.has(word));

        if (unknownWords.length > 0) {
            return {
                success: false,
                error: {
                    rowIndex: -1,
                    message: `Invalid term "${unknownWords[0]}" - column/scalar references must be in brackets like [${unknownWords[0]}]. If this is a function, check spelling.`
                }
            };
        }
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

    // Phase 9: Pre-calculation pass for aggregates
    const aggregates = detectAggregates(formula);
    const aggregateValues: Record<string, number | null> = {};

    if (aggregates.length > 0) {
        for (const agg of aggregates) {
            const value = calculateAggregate(agg.name, agg.column, rows);
            // Create safe variable name for aggregate
            const safeAggregateName = sanitizeVarName(agg.originalSyntax);
            aggregateValues[safeAggregateName] = value;
        }
    }

    // Pre-build column arrays for XLOOKUP support
    // Each column becomes available as __col_ColumnName (full column array)
    const columnArrays: Record<string, any[]> = {};
    const hasXLOOKUP = formula.includes('XLOOKUP');
    if (hasXLOOKUP) {
        existingSchema.forEach(colName => {
            const safeArrayName = '__col_' + sanitizeVarName(colName);
            columnArrays[safeArrayName] = rows.map(r => {
                const v = Number(r[colName]);
                return isNaN(v) ? r[colName] : v;
            });
        });
    }

    for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];

        // Build scope with column values
        const cleanScope: any = {};
        let cleanFormula = formula;

        // STEP 1: Replace aggregate syntax FIRST (before column replacement)
        // This prevents [column] inside $AVG_[column] from being corrupted
        if (aggregates.length > 0) {
            for (const agg of aggregates) {
                const safeAggregateName = sanitizeVarName(agg.originalSyntax);
                cleanScope[safeAggregateName] = aggregateValues[safeAggregateName] ?? 0;

                // Replace $SUM_[column] with safe variable name in formula
                const escapedSyntax = agg.originalSyntax.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                cleanFormula = cleanFormula.replace(new RegExp(escapedSyntax, 'g'), safeAggregateName);
            }
        }

        // STEP 2: Add column values to scope (after aggregates are already replaced)
        existingSchema.forEach(colName => {
            const val = Number(row[colName]);
            const safeVarName = columnMapping[colName];
            cleanScope[safeVarName] = isNaN(val) ? row[colName] : val;

            const escapedColName = colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanFormula = cleanFormula.replace(new RegExp(`\\[${escapedColName}\\]`, 'g'), safeVarName);
        });

        // STEP 3: Add scalar values to scope
        Object.entries(scalarInputs).forEach(([name, input]) => {
            const safeVarName = scalarMapping[name];
            cleanScope[safeVarName] = input.value;

            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanFormula = cleanFormula.replace(new RegExp(`\\[${escapedName}\\]`, 'g'), safeVarName);
        });

        // Inject XLOOKUP column arrays into scope
        if (hasXLOOKUP) {
            Object.entries(columnArrays).forEach(([arrayName, arrayData]) => {
                cleanScope[arrayName] = arrayData;
            });

            // Replace column references inside XLOOKUP 2nd and 3rd args with array versions
            // Pattern: XLOOKUP(expr, [Col1], [Col2], ...)
            cleanFormula = cleanFormula.replace(
                /XLOOKUP\s*\(([^,]+),\s*([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\)/g,
                (_match, lookupVal, lookupCol, returnCol, defaultVal) => {
                    // Convert [ColName] references to __col_ColName for lookup/return args
                    const toArray = (s: string) => {
                        return s.trim().replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (m: string) => {
                            // Check if this var name has a corresponding column array
                            const arrayName = '__col_' + m;
                            if (columnArrays[arrayName]) return arrayName;
                            return m;
                        });
                    };
                    const args = [lookupVal.trim(), toArray(lookupCol), toArray(returnCol)];
                    if (defaultVal) args.push(defaultVal.trim());
                    return `XLOOKUP(${args.join(', ')})`;
                }
            );
        }

        try {
            const result = math.evaluate(cleanFormula, cleanScope);

            // Fail-Fast: Result must be valid (allow strings from IF/SWITCH)
            if (result === undefined || (typeof result === 'number' && isNaN(result))) {
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

/**
 * Join Configuration Interface
 */
export interface JoinConfig {
    mainData: any[];
    lookupData: any[];
    leftKey: string;      // Key column from main data
    rightKey: string;     // Key column from lookup data
    targetColumns: string[]; // Columns to extract from lookup data
}

/**
 * Execute Join Operation (LEFT JOIN)
 * Uses hash map for O(N+M) performance instead of O(N*M)
 */
export const executeJoin = (config: JoinConfig): CalculationResult => {
    const { mainData, lookupData, leftKey, rightKey, targetColumns } = config;

    // Validation
    if (!mainData || mainData.length === 0) {
        return { success: false, error: { rowIndex: -1, message: "Main data is empty" } };
    }

    if (!lookupData || lookupData.length === 0) {
        return { success: false, error: { rowIndex: -1, message: "Lookup data is empty" } };
    }

    if (!leftKey || !rightKey) {
        return { success: false, error: { rowIndex: -1, message: "Join keys are required" } };
    }

    if (!targetColumns || targetColumns.length === 0) {
        return { success: false, error: { rowIndex: -1, message: "Target columns are required" } };
    }

    // Step 1: Build hash map from lookup data - O(M)
    const lookupMap = new Map<any, any>();
    for (const row of lookupData) {
        const key = row[rightKey];
        if (key !== undefined && key !== null) {
            lookupMap.set(key, row);
        }
    }

    // Step 2: Single pass on main data - O(N)
    const result = mainData.map(mainRow => {
        const key = mainRow[leftKey];
        const lookupRow = lookupMap.get(key);

        // Step 3: Merge selected columns
        const merged = { ...mainRow };

        targetColumns.forEach(col => {
            let colName = col;

            // Handle collision: if column exists in main data, add _lookup suffix
            if (mainRow.hasOwnProperty(col)) {
                colName = `${col}_lookup`;
            }

            // Fill with null if key not found in lookup
            merged[colName] = lookupRow?.[col] ?? null;
        });

        return merged;
    });

    return {
        success: true,
        data: result
    };
};

