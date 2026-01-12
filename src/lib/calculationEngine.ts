import type { Node, Edge } from 'reactflow';
import type { NodeData, ProcessNodeData } from '../types';
import { math } from './mathConfig';

export interface CalculationResult {
    nodeId: string;
    value: string | number | null;
    error?: string;
}

export interface CalculationOutput {
    results: Map<string, CalculationResult>;
    circularNodes: Set<string>;
}

/**
 * Value with custom unit tracking
 * Supports compound units like "kg CO2/kWh"
 */
interface UnitValue {
    value: number;
    numeratorUnits: string[];   // e.g., ["kg", "CO2"]
    denominatorUnits: string[]; // e.g., ["kWh"]
}

/**
 * Known molecule names that should NOT be parsed as exponents
 */
const MOLECULE_NAMES = ['CO2', 'H2O', 'SO2', 'NO2', 'CH4', 'N2O', 'O2', 'N2', 'H2'];

/**
 * Parse a single unit that may have exponent notation
 * e.g., "kg^2" → ["kg", "kg"], "m2" → ["m", "m"], "CO2" → ["CO2"]
 */
function parseUnitWithExponent(unit: string): string[] {
    // Check if it's a known molecule
    const upperUnit = unit.toUpperCase();
    for (const molecule of MOLECULE_NAMES) {
        if (upperUnit === molecule.toUpperCase()) {
            return [unit]; // Return as-is, not an exponent
        }
    }

    // Check for caret notation: kg^2, m^3, s^-2
    const caretMatch = unit.match(/^([a-zA-Z]+)\^(-?\d+)$/);
    if (caretMatch) {
        const baseUnit = caretMatch[1];
        const exponent = parseInt(caretMatch[2]);
        if (exponent === 0) return [];
        if (exponent < 0) {
            // Negative exponent means it goes to denominator - handled separately
            return Array(Math.abs(exponent)).fill(`${baseUnit}[NEG]`);
        }
        return Array(exponent).fill(baseUnit);
    }

    // Check for number suffix: kg2, m3 (but not at start like 2kg)
    const numMatch = unit.match(/^([a-zA-Z]+)(\d+)$/);
    if (numMatch) {
        const baseUnit = numMatch[1];
        const exponent = parseInt(numMatch[2]);
        if (exponent === 0) return [];
        return Array(exponent).fill(baseUnit);
    }

    // Regular unit
    return [unit];
}

/**
 * Parse units string expanding exponents
 */
function parseUnitsExpanded(unitsStr: string): { numerator: string[], denominator: string[] } {
    const numerator: string[] = [];
    const denominator: string[] = [];

    if (!unitsStr.trim()) {
        return { numerator, denominator };
    }

    const units = unitsStr.trim().split(/\s+/);

    units.forEach((unit) => {
        const expanded = parseUnitWithExponent(unit);
        expanded.forEach((u) => {
            if (u.endsWith('[NEG]')) {
                denominator.push(u.replace('[NEG]', ''));
            } else {
                numerator.push(u);
            }
        });
    });

    return { numerator, denominator };
}

/**
 * Parse a value string like "100 kWh" or "0.5 kg/kWh" or "10 m^2" into UnitValue
 */
function parseValueWithUnit(input: string | number): UnitValue {
    if (typeof input === 'number') {
        return { value: input, numeratorUnits: [], denominatorUnits: [] };
    }

    const str = String(input).trim();

    // Match number at the start (handles comma decimal separators too)
    const match = str.match(/^(-?[\d.,]+)\s*(.*)$/);
    if (!match) {
        return { value: parseFloat(str) || 0, numeratorUnits: [], denominatorUnits: [] };
    }

    // Parse number (handle format with comma thousands: 1,000.5)
    const numStr = match[1].replace(/,/g, '');
    const value = parseFloat(numStr);
    const unitPart = match[2].trim();

    if (!unitPart) {
        return { value, numeratorUnits: [], denominatorUnits: [] };
    }

    // Split by "/" to get numerator and denominator parts
    const parts = unitPart.split('/');

    const numParsed = parseUnitsExpanded(parts[0] || '');
    const denParsed = parts[1] ? parseUnitsExpanded(parts[1]) : { numerator: [], denominator: [] };

    // Combine: numerator gets num's numerator + den's denominator
    // Denominator gets num's denominator + den's numerator
    const numeratorUnits = [...numParsed.numerator, ...denParsed.denominator];
    const denominatorUnits = [...numParsed.denominator, ...denParsed.numerator];

    return { value, numeratorUnits, denominatorUnits };
}

/**
 * Count occurrences of each unit and format with exponents
 */
function formatUnitsWithExponents(units: string[]): string {
    if (units.length === 0) return '';

    const counts = new Map<string, number>();
    units.forEach((unit) => {
        counts.set(unit, (counts.get(unit) || 0) + 1);
    });

    const parts: string[] = [];
    counts.forEach((count, unit) => {
        if (count === 1) {
            parts.push(unit);
        } else {
            // Use superscript numbers
            const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
            const expStr = String(count).split('').map(d => superscripts[parseInt(d)]).join('');
            parts.push(`${unit}${expStr}`);
        }
    });

    return parts.join('·');
}

/**
 * Format UnitValue back to string
 */
function formatUnitValue(uv: UnitValue): string {
    const numStr = formatUnitsWithExponents(uv.numeratorUnits);
    const denStr = formatUnitsWithExponents(uv.denominatorUnits);

    let unitStr = '';
    if (numStr && denStr) {
        unitStr = `${numStr}/${denStr}`;
    } else if (numStr) {
        unitStr = numStr;
    } else if (denStr) {
        unitStr = `1/${denStr}`;
    }

    // Format number - preserve precision for small numbers
    let valueStr: string;
    if (uv.value === 0) {
        valueStr = '0';
    } else if (Math.abs(uv.value) < 0.0001) {
        valueStr = uv.value.toExponential(4);
    } else {
        valueStr = uv.value.toLocaleString('en-US', { maximumFractionDigits: 10 });
    }

    return unitStr ? `${valueStr} ${unitStr}` : valueStr;
}

/**
 * Multiply two UnitValues (handles unit combination)
 */
function multiplyUnits(a: UnitValue, b: UnitValue): UnitValue {
    const result: UnitValue = {
        value: a.value * b.value,
        numeratorUnits: [...a.numeratorUnits, ...b.numeratorUnits],
        denominatorUnits: [...a.denominatorUnits, ...b.denominatorUnits],
    };

    // Cancel out matching units
    result.numeratorUnits = result.numeratorUnits.filter((unit) => {
        const idx = result.denominatorUnits.indexOf(unit);
        if (idx !== -1) {
            result.denominatorUnits.splice(idx, 1);
            return false;
        }
        return true;
    });

    return result;
}

/**
 * Divide two UnitValues
 */
function divideUnits(a: UnitValue, b: UnitValue): UnitValue {
    const result: UnitValue = {
        value: a.value / b.value,
        numeratorUnits: [...a.numeratorUnits, ...b.denominatorUnits],
        denominatorUnits: [...a.denominatorUnits, ...b.numeratorUnits],
    };

    // Cancel out matching units
    result.numeratorUnits = result.numeratorUnits.filter((unit) => {
        const idx = result.denominatorUnits.indexOf(unit);
        if (idx !== -1) {
            result.denominatorUnits.splice(idx, 1);
            return false;
        }
        return true;
    });

    return result;
}

/**
 * Add two UnitValues (units must match)
 */
function addUnits(a: UnitValue, b: UnitValue): UnitValue | null {
    const aNum = a.numeratorUnits.sort().join(' ');
    const aDen = a.denominatorUnits.sort().join(' ');
    const bNum = b.numeratorUnits.sort().join(' ');
    const bDen = b.denominatorUnits.sort().join(' ');

    if (aNum !== bNum || aDen !== bDen) {
        return null; // Units don't match for addition
    }

    return {
        value: a.value + b.value,
        numeratorUnits: [...a.numeratorUnits],
        denominatorUnits: [...a.denominatorUnits],
    };
}

/**
 * Build adjacency list and in-degree map from edges
 */
function buildGraph(nodes: Node<NodeData>[], edges: Edge[]) {
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((node) => {
        adjacencyList.set(node.id, []);
        inDegree.set(node.id, 0);
    });

    edges.forEach((edge) => {
        const targets = adjacencyList.get(edge.source) || [];
        targets.push(edge.target);
        adjacencyList.set(edge.source, targets);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    return { adjacencyList, inDegree };
}

/**
 * Topological sort using Kahn's Algorithm
 */
function topologicalSort(
    nodes: Node<NodeData>[],
    adjacencyList: Map<string, string[]>,
    inDegree: Map<string, number>
): { sorted: string[]; circularNodes: Set<string> } {
    const sorted: string[] = [];
    const queue: string[] = [];
    const inDegreeCopy = new Map(inDegree);

    nodes.forEach((node) => {
        if ((inDegreeCopy.get(node.id) || 0) === 0) {
            queue.push(node.id);
        }
    });

    while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(current);

        const neighbors = adjacencyList.get(current) || [];
        neighbors.forEach((neighbor) => {
            const newDegree = (inDegreeCopy.get(neighbor) || 0) - 1;
            inDegreeCopy.set(neighbor, newDegree);
            if (newDegree === 0) {
                queue.push(neighbor);
            }
        });
    }

    const circularNodes = new Set<string>();
    if (sorted.length !== nodes.length) {
        nodes.forEach((node) => {
            if (!sorted.includes(node.id)) {
                circularNodes.add(node.id);
            }
        });
    }

    return { sorted, circularNodes };
}

/**
 * Get value from a node
 */
function getNodeOutputValue(
    node: Node<NodeData>,
    calculatedValues: Map<string, UnitValue>
): UnitValue | null {
    const data = node.data;

    if (data.type === 'source' || data.type === 'factor') {
        const unit = data.unit?.trim() || '';
        return parseValueWithUnit(`${data.value} ${unit}`);
    }

    if (data.type === 'process' || data.type === 'passthrough') {
        return calculatedValues.get(node.id) ?? null;
    }

    // Group nodes don't have values
    return null;
}

/**
 * Tokenize a formula into variables, operators, numbers, and parentheses
 */
function tokenize(formula: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < formula.length) {
        const char = formula[i];
        if (/\s/.test(char)) {
            i++;
            continue;
        }
        if (/[A-Za-z]/.test(char)) {
            let token = '';
            while (i < formula.length && /[A-Za-z0-9_]/.test(formula[i])) {
                token += formula[i];
                i++;
            }
            tokens.push(token);
        } else if (/[\d.]/.test(char)) {
            let token = '';
            while (i < formula.length && /[\d.]/.test(formula[i])) {
                token += formula[i];
                i++;
            }
            tokens.push(token);
        } else if (/[+\-*/()^]/.test(char)) {
            tokens.push(char);
            i++;
        } else {
            i++;
        }
    }
    return tokens;
}

/**
 * Evaluate formula with unit tracking
 * Supports: A * B * C, A / B / C, A + B, A - B, parentheses, numbers
 */
function evaluateWithUnits(
    tokens: string[],
    unitScope: Record<string, UnitValue>
): UnitValue | null {
    let pos = 0;

    function parseExpression(): UnitValue | null {
        let left = parseTerm();
        if (!left) return null;

        while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
            const op = tokens[pos];
            pos++;
            const right = parseTerm();
            if (!right) return null;

            if (op === '+') {
                const result = addUnits(left, right);
                if (!result) return null; // Unit mismatch
                left = result;
            } else {
                const result = addUnits(left, right);
                if (!result) return null;
                left = { ...result, value: left.value - right.value };
            }
        }
        return left;
    }

    function parseTerm(): UnitValue | null {
        let left = parseFactor();
        if (!left) return null;

        while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
            const op = tokens[pos];
            pos++;
            const right = parseFactor();
            if (!right) return null;

            if (op === '*') {
                left = multiplyUnits(left, right);
            } else {
                left = divideUnits(left, right);
            }
        }
        return left;
    }

    function parseFactor(): UnitValue | null {
        const token = tokens[pos];

        if (token === '(') {
            pos++; // skip '('
            const result = parseExpression();
            if (tokens[pos] === ')') {
                pos++; // skip ')'
            }
            return result;
        }

        if (token && /^[A-Za-z]/.test(token)) {
            pos++;
            // Variable
            if (unitScope[token]) {
                return { ...unitScope[token] };
            }
            // Unknown variable, treat as unitless 0
            return { value: 0, numeratorUnits: [], denominatorUnits: [] };
        }

        if (token && /^[\d.]/.test(token)) {
            pos++;
            // Number constant
            return { value: parseFloat(token), numeratorUnits: [], denominatorUnits: [] };
        }

        // Handle unary minus
        if (token === '-') {
            pos++;
            const factor = parseFactor();
            if (factor) {
                factor.value = -factor.value;
                return factor;
            }
        }

        return null;
    }

    return parseExpression();
}

/**
 * Evaluate a Process node's formula with custom unit handling
 */
function evaluateFormula(
    node: Node<ProcessNodeData>,
    incomingEdges: Edge[],
    nodes: Node<NodeData>[],
    calculatedValues: Map<string, UnitValue>
): { value: string | number | null; error?: string } {
    const processData = node.data as ProcessNodeData;
    const formula = processData.formula?.trim();

    if (!formula) {
        return { value: null, error: 'No formula defined' };
    }

    // Build scope from inputs
    const unitScope: Record<string, UnitValue> = {};

    processData.inputs.forEach((input) => {
        const edge = incomingEdges.find((e) => e.targetHandle === input.id);
        if (edge) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            if (sourceNode) {
                const unitValue = getNodeOutputValue(sourceNode, calculatedValues);
                if (unitValue) {
                    unitScope[input.label] = unitValue;
                }
            }
        }
    });

    try {
        // Tokenize and evaluate with units
        const tokens = tokenize(formula);
        const result = evaluateWithUnits(tokens, unitScope);

        if (result) {
            return { value: formatUnitValue(result) };
        }

        // Fallback: evaluate with math.js for complex expressions
        // BUT: If we have units and the unit calculation failed (result is null), it likely means a unit mismatch
        // We should check if the formula only involves addition/subtraction to be strict
        if (!result && Object.keys(unitScope).length > 0) {
            // If simple addition/subtraction, we should have handled it in evaluateWithUnits
            // If we didn't, it implies mismatched units or unsupported op.
            // To support the user request "seharusnya tidak bisa dijumlahkan", we should error out on unit mismatch
            // We can heuristic check: if formula has + or - and we failed unit calc, it's an error.
            if (/[+\-]/.test(formula) && !/[*/^]/.test(formula)) {
                return { value: null, error: 'Unit mismatch: Cannot add/subtract different units' };
            }
        }

        const mathScope: Record<string, number> = {};
        Object.entries(unitScope).forEach(([key, uv]) => {
            mathScope[key] = uv.value;
        });

        const numericResult = math.evaluate(formula, mathScope);
        if (typeof numericResult === 'number') {
            return { value: numericResult.toLocaleString('en-US', { maximumFractionDigits: 4 }) };
        }
        return { value: String(numericResult) };
    } catch (err: any) {
        return { value: null, error: err.message || 'Calculation error' };
    }
}

/**
 * Run calculations for all nodes in topological order
 */
export function runCalculations(
    nodes: Node<NodeData>[],
    edges: Edge[]
): CalculationOutput {
    const results = new Map<string, CalculationResult>();
    const calculatedValues = new Map<string, UnitValue>();

    const { adjacencyList, inDegree } = buildGraph(nodes, edges);
    const { sorted, circularNodes } = topologicalSort(nodes, adjacencyList, inDegree);

    circularNodes.forEach((nodeId) => {
        results.set(nodeId, {
            nodeId,
            value: null,
            error: 'Circular dependency detected',
        });
    });

    sorted.forEach((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        if (node.data.type === 'source' || node.data.type === 'factor') {
            const unitValue = getNodeOutputValue(node, calculatedValues);
            if (unitValue) {
                calculatedValues.set(nodeId, unitValue);
                results.set(nodeId, { nodeId, value: formatUnitValue(unitValue) });
            }
        } else if (node.data.type === 'process') {
            const incomingEdges = edges.filter((e) => e.target === nodeId);

            const { value, error } = evaluateFormula(
                node as Node<ProcessNodeData>,
                incomingEdges,
                nodes,
                calculatedValues
            );

            if (value !== null && !error) {
                const parsedValue = parseValueWithUnit(value);
                calculatedValues.set(nodeId, parsedValue);
            }

            results.set(nodeId, { nodeId, value, error });
        } else if (node.data.type === 'passthrough') {
            // PassThrough: pass the input value directly through
            const incomingEdges = edges.filter((e) => e.target === nodeId);
            if (incomingEdges.length > 0) {
                const sourceEdge = incomingEdges[0];
                const sourceNode = nodes.find((n) => n.id === sourceEdge.source);
                if (sourceNode) {
                    const inputValue = getNodeOutputValue(sourceNode, calculatedValues);
                    if (inputValue) {
                        calculatedValues.set(nodeId, inputValue);
                        results.set(nodeId, { nodeId, value: formatUnitValue(inputValue) });
                    } else {
                        results.set(nodeId, { nodeId, value: null });
                    }
                }
            } else {
                results.set(nodeId, { nodeId, value: null });
            }
        }
        // Group nodes don't need calculation
    });

    return { results, circularNodes };
}
