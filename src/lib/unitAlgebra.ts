/**
 * Unit Algebra Engine
 * Handles parsing, multiplication, division, cancellation, and formatting of units
 */

export interface UnitExpression {
    numerator: string[];   // ['kg', 'm', 'm'] for kg·m²
    denominator: string[]; // ['s', 's'] for /s²
}

// Parse unit string like "kg·m²/s²" or "kg/m³" into expression
export function parseUnit(unit: string): UnitExpression {
    if (!unit || unit.trim() === '' || unit.toLowerCase() === 'unitless') {
        return { numerator: [], denominator: [] };
    }

    const result: UnitExpression = { numerator: [], denominator: [] };

    // Split by "/" to get numerator and denominator parts
    const parts = unit.split('/');
    const numPart = parts[0] || '';
    const denomPart = parts[1] || '';

    // Parse numerator
    if (numPart.trim()) {
        result.numerator = parseUnitPart(numPart);
    }

    // Parse denominator
    if (denomPart.trim()) {
        result.denominator = parseUnitPart(denomPart);
    }

    return result;
}

// Parse a single part like "kg·m²" into ['kg', 'm', 'm']
function parseUnitPart(part: string): string[] {
    const units: string[] = [];

    // Split by multiplication signs (·, *, or space when between units)
    const tokens = part.split(/[·*\s]+/).filter(t => t.trim());

    for (const token of tokens) {
        // Check for exponent: m², m³, m^2, m^3
        const expMatch = token.match(/^([a-zA-Z%°]+)([²³⁴⁵]|\^(\d+))?$/);

        if (expMatch) {
            const baseUnit = expMatch[1];
            let exponent = 1;

            if (expMatch[2]) {
                if (expMatch[2] === '²') exponent = 2;
                else if (expMatch[2] === '³') exponent = 3;
                else if (expMatch[2] === '⁴') exponent = 4;
                else if (expMatch[2] === '⁵') exponent = 5;
                else if (expMatch[3]) exponent = parseInt(expMatch[3], 10);
            }

            // Add unit multiple times for exponent
            for (let i = 0; i < exponent; i++) {
                units.push(baseUnit);
            }
        } else if (token.trim()) {
            units.push(token.trim());
        }
    }

    return units;
}

// Multiply two unit expressions
export function multiplyUnits(a: UnitExpression, b: UnitExpression): UnitExpression {
    const result: UnitExpression = {
        numerator: [...a.numerator, ...b.numerator],
        denominator: [...a.denominator, ...b.denominator]
    };
    return simplifyUnit(result);
}

// Divide two unit expressions (a / b)
export function divideUnits(a: UnitExpression, b: UnitExpression): UnitExpression {
    const result: UnitExpression = {
        numerator: [...a.numerator, ...b.denominator],
        denominator: [...a.denominator, ...b.numerator]
    };
    return simplifyUnit(result);
}

// Cancel matching units between numerator and denominator
export function simplifyUnit(expr: UnitExpression): UnitExpression {
    const num = [...expr.numerator];
    const denom = [...expr.denominator];

    // Cancel matching units
    for (let i = num.length - 1; i >= 0; i--) {
        const idx = denom.indexOf(num[i]);
        if (idx !== -1) {
            num.splice(i, 1);
            denom.splice(idx, 1);
        }
    }

    return { numerator: num, denominator: denom };
}

// Format unit expression back to string
export function formatUnit(expr: UnitExpression): string {
    if (expr.numerator.length === 0 && expr.denominator.length === 0) {
        return 'unitless';
    }

    const formatPart = (units: string[]): string => {
        if (units.length === 0) return '';

        // Group and count units
        const counts: Record<string, number> = {};
        for (const u of units) {
            counts[u] = (counts[u] || 0) + 1;
        }

        // Format with exponents
        return Object.entries(counts)
            .map(([unit, count]) => {
                if (count === 1) return unit;
                if (count === 2) return `${unit}²`;
                if (count === 3) return `${unit}³`;
                return `${unit}^${count}`;
            })
            .join('·');
    };

    const numStr = formatPart(expr.numerator);
    const denomStr = formatPart(expr.denominator);

    if (!denomStr) return numStr || 'unitless';
    if (!numStr) return `1/${denomStr}`;
    return `${numStr}/${denomStr}`;
}

// Check if two units are compatible for addition/subtraction
export function unitsAreCompatible(a: UnitExpression, b: UnitExpression): boolean {
    const aFormatted = formatUnit(simplifyUnit(a));
    const bFormatted = formatUnit(simplifyUnit(b));
    return aFormatted === bFormatted;
}

// Derive unit from a formula given column units and scalar inputs
export function deriveUnitFromFormula(
    formula: string,
    columnUnits: Record<string, string>,
    scalarInputs: Record<string, { value: number; unit: string }>
): { unit: string; warning?: string } {
    // Extract all [ColumnName] references
    const columnRefs = formula.match(/\[([^\]]+)\]/g) || [];

    if (columnRefs.length === 0) {
        return { unit: 'unitless' };
    }

    // Build unit map for all referenced columns/scalars
    const refUnits: Record<string, UnitExpression> = {};

    for (const ref of columnRefs) {
        const name = ref.slice(1, -1); // Remove [ ]

        if (columnUnits[name]) {
            refUnits[name] = parseUnit(columnUnits[name]);
        } else if (scalarInputs[name]) {
            refUnits[name] = parseUnit(scalarInputs[name].unit);
        } else {
            refUnits[name] = { numerator: [], denominator: [] };
        }
    }

    // Simple formula analysis (for common patterns)
    // This is a simplified version - full AST parsing would be more robust

    // Pattern: [A] * [B] or [A] / [B]
    const simplePattern = /^\s*\[([^\]]+)\]\s*([*\/])\s*\[([^\]]+)\]\s*$/;
    const match = formula.match(simplePattern);

    if (match) {
        const [, leftName, op, rightName] = match;
        const leftUnit = refUnits[leftName] || { numerator: [], denominator: [] };
        const rightUnit = refUnits[rightName] || { numerator: [], denominator: [] };

        if (op === '*') {
            return { unit: formatUnit(multiplyUnits(leftUnit, rightUnit)) };
        } else {
            return { unit: formatUnit(divideUnits(leftUnit, rightUnit)) };
        }
    }

    // Pattern: [A] + [B] or [A] - [B]
    const addPattern = /^\s*\[([^\]]+)\]\s*([+\-])\s*\[([^\]]+)\]\s*$/;
    const addMatch = formula.match(addPattern);

    if (addMatch) {
        const [, leftName, , rightName] = addMatch;
        const leftUnit = refUnits[leftName] || { numerator: [], denominator: [] };
        const rightUnit = refUnits[rightName] || { numerator: [], denominator: [] };

        if (!unitsAreCompatible(leftUnit, rightUnit)) {
            return {
                unit: formatUnit(leftUnit),
                warning: `Unit mismatch: ${formatUnit(leftUnit)} vs ${formatUnit(rightUnit)}`
            };
        }
        return { unit: formatUnit(leftUnit) };
    }

    // Pattern: number * [A] or [A] * number  
    const scalarMultPattern = /^\s*(\d+\.?\d*)\s*\*\s*\[([^\]]+)\]\s*$|^\s*\[([^\]]+)\]\s*\*\s*(\d+\.?\d*)\s*$/;
    const scalarMatch = formula.match(scalarMultPattern);

    if (scalarMatch) {
        const refName = scalarMatch[2] || scalarMatch[3];
        const refUnit = refUnits[refName] || { numerator: [], denominator: [] };
        return { unit: formatUnit(refUnit) };
    }

    // For complex formulas, try to parse the expression tree
    return deriveUnitFromComplexFormula(formula, refUnits);
}

// Handle more complex formulas like [A] * [B] / [C]
function deriveUnitFromComplexFormula(
    formula: string,
    refUnits: Record<string, UnitExpression>
): { unit: string; warning?: string } {
    // Tokenize the formula
    const tokens: Array<{ type: 'ref' | 'op' | 'num'; value: string }> = [];
    let remaining = formula.trim();

    while (remaining.length > 0) {
        // Match column reference [Name]
        const refMatch = remaining.match(/^\[([^\]]+)\]/);
        if (refMatch) {
            tokens.push({ type: 'ref', value: refMatch[1] });
            remaining = remaining.slice(refMatch[0].length).trim();
            continue;
        }

        // Match operator
        const opMatch = remaining.match(/^([*\/+\-])/);
        if (opMatch) {
            tokens.push({ type: 'op', value: opMatch[1] });
            remaining = remaining.slice(1).trim();
            continue;
        }

        // Match number
        const numMatch = remaining.match(/^(\d+\.?\d*)/);
        if (numMatch) {
            tokens.push({ type: 'num', value: numMatch[1] });
            remaining = remaining.slice(numMatch[0].length).trim();
            continue;
        }

        // Skip parentheses for now
        if (remaining[0] === '(' || remaining[0] === ')') {
            remaining = remaining.slice(1).trim();
            continue;
        }

        // Unknown token, skip
        remaining = remaining.slice(1).trim();
    }

    // Process tokens left to right (simplified, doesn't handle precedence)
    let currentUnit: UnitExpression = { numerator: [], denominator: [] };
    let lastOp: string = '*';
    let hasAddSub = false;

    for (const token of tokens) {
        if (token.type === 'ref') {
            const unit = refUnits[token.value] || { numerator: [], denominator: [] };
            if (lastOp === '*') {
                currentUnit = multiplyUnits(currentUnit, unit);
            } else if (lastOp === '/') {
                currentUnit = divideUnits(currentUnit, unit);
            } else if (lastOp === '+' || lastOp === '-') {
                hasAddSub = true;
                // For add/sub, just keep the first operand's unit
            }
        } else if (token.type === 'op') {
            lastOp = token.value;
        }
        // Numbers don't contribute units
    }

    const result = formatUnit(currentUnit);

    if (hasAddSub) {
        return { unit: result, warning: 'Complex formula with +/- - verify units manually' };
    }

    return { unit: result };
}
