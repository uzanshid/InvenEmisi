import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Check } from 'lucide-react';

interface FormulaHelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'basic' | 'conditionals' | 'aggregates' | 'functions' | 'units';

export const FormulaHelpDialog: React.FC<FormulaHelpDialogProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('basic');
    const [copiedExample, setCopiedExample] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedExample(id);
        setTimeout(() => setCopiedExample(null), 2000);
    };

    const ExampleBlock = ({ title, formula, description, id }: { title: string; formula: string; description: string; id: string }) => (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
                <button
                    onClick={() => copyToClipboard(formula, id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                    {copiedExample === id ? (
                        <>
                            <Check size={12} className="text-green-600" />
                            <span className="text-green-600">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            Copy
                        </>
                    )}
                </button>
            </div>
            <code className="block bg-white px-3 py-2 rounded border border-slate-200 text-sm font-mono text-purple-600 mb-2">
                {formula}
            </code>
            <p className="text-xs text-slate-600">{description}</p>
        </div>
    );

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <Dialog.Title className="text-lg font-bold text-slate-800">
                            Formula Help
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 px-6 pt-4 border-b border-slate-200">
                        {[
                            { id: 'basic', label: 'Basic' },
                            { id: 'conditionals', label: 'IF / Lookup' },
                            { id: 'aggregates', label: 'Aggregates' },
                            { id: 'functions', label: 'Functions' },
                            { id: 'units', label: 'Units' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === tab.id
                                    ? 'bg-white text-purple-600 border-t border-x border-slate-200'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'basic' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Column References</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        All column names must be wrapped in square brackets <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">[ColumnName]</code>
                                    </p>
                                    <div className="space-y-3">
                                        <ExampleBlock
                                            id="basic-1"
                                            title="Simple Multiplication"
                                            formula="[Activity Data] * [Emission Factor]"
                                            description="Multiply values from two columns"
                                        />
                                        <ExampleBlock
                                            id="basic-2"
                                            title="Complex Formula"
                                            formula="([Fuel Consumed] * [EF]) + [Direct Emissions]"
                                            description="Use parentheses for order of operations"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Scalar References</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Reference scalar inputs (from connections) using the same bracket syntax
                                    </p>
                                    <ExampleBlock
                                        id="basic-3"
                                        title="Scalar Multiplication"
                                        formula="[CO2] * [GWP Factor]"
                                        description="Multiply column by a scalar input"
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">⚠️ Important Rule</h4>
                                    <p className="text-sm text-blue-700">
                                        Every variable must be in brackets. Unbracketed terms will cause an error.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'conditionals' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Conditional Functions</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Use IF, IFS, SWITCH, and XLOOKUP to create conditional logic in formulas. String values use double quotes <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">"text"</code>
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <ExampleBlock
                                        id="cond-1"
                                        title="IF - Simple Condition"
                                        formula='IF([Value] > 100, "High", "Low")'
                                        description='If value > 100, return "High", otherwise "Low"'
                                    />
                                    <ExampleBlock
                                        id="cond-2"
                                        title="IF - Numeric Result"
                                        formula="IF([FuelType] == 1, [EF_Gas], [EF_Diesel])"
                                        description="Select emission factor based on fuel type code"
                                    />
                                    <ExampleBlock
                                        id="cond-3"
                                        title="IFS - Multiple Conditions"
                                        formula='IFS([Score] >= 90, "A", [Score] >= 80, "B", [Score] >= 70, "C", true, "D")'
                                        description='Check multiple conditions in order. Use true as the last condition for default.'
                                    />
                                    <ExampleBlock
                                        id="cond-4"
                                        title="SWITCH - Value Matching"
                                        formula='SWITCH([Category], "Transport", 2.68, "Energy", 1.85, "Industry", 3.42, 0)'
                                        description='Match a value to cases and return corresponding result. Last arg is default.'
                                    />
                                    <ExampleBlock
                                        id="cond-5"
                                        title="XLOOKUP - Array Lookup"
                                        formula="XLOOKUP([VehicleCode], [CodeList], [EF_Column], 0)"
                                        description="Find VehicleCode in CodeList column and return value from EF_Column. Last arg is default if not found."
                                    />
                                    <ExampleBlock
                                        id="cond-6"
                                        title="Nested IF"
                                        formula="IF([CO2] > $AVG_[CO2], [CO2] * 1.1, [CO2] * 0.9)"
                                        description="Combine IF with aggregates: apply 10% surcharge if above average"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Function Reference</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { name: 'IF(cond, true, false)', desc: 'Returns true-value if condition is met, otherwise false-value' },
                                            { name: 'IFS(c1, v1, c2, v2, ...)', desc: 'Returns value for first matching condition (use true for default)' },
                                            { name: 'SWITCH(val, c1, r1, ..., default)', desc: 'Matches value against cases, returns corresponding result' },
                                            { name: 'XLOOKUP(val, lookup, return, default)', desc: 'Finds value in lookup column, returns matching value from return column' }
                                        ].map((fn, i) => (
                                            <div key={i} className="bg-blue-50 border border-blue-200 rounded p-3">
                                                <code className="text-xs font-mono text-blue-700 font-bold">{fn.name}</code>
                                                <p className="text-xs text-slate-600 mt-1">{fn.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-amber-800 mb-2">📝 Comparison Operators</h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`==`} equal</code>
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`!=`} not equal</code>
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`>`} greater</code>
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`<`} less</code>
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`>=`} greater/eq</code>
                                        <code className="bg-white px-2 py-1 rounded border text-center">{`<=`} less/eq</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'aggregates' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Aggregate Functions</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Calculate totals across all rows using the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">$FUNCTION_[Column]</code> syntax
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <ExampleBlock
                                        id="agg-1"
                                        title="Sum Total"
                                        formula="$SUM_[CO2]"
                                        description="Sum all CO2 values across all rows"
                                    />
                                    <ExampleBlock
                                        id="agg-2"
                                        title="Percentage Calculation"
                                        formula="[CO2] / $SUM_[CO2] * 100"
                                        description="Calculate percentage of each row relative to total"
                                    />
                                    <ExampleBlock
                                        id="agg-3"
                                        title="Average"
                                        formula="$AVG_[EmissionFactor]"
                                        description="Calculate average emission factor"
                                    />
                                    <ExampleBlock
                                        id="agg-4"
                                        title="Min/Max"
                                        formula="[Value] - $MIN_[Value]"
                                        description="Normalize values by subtracting minimum"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Available Aggregates</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { name: '$SUM_[col]', desc: 'Sum of all values' },
                                            { name: '$AVG_[col]', desc: 'Average value' },
                                            { name: '$MIN_[col]', desc: 'Minimum value' },
                                            { name: '$MAX_[col]', desc: 'Maximum value' },
                                            { name: '$COUNT_[col]', desc: 'Count of non-null values' }
                                        ].map((agg, i) => (
                                            <div key={i} className="bg-purple-50 border border-purple-200 rounded p-3">
                                                <code className="text-xs font-mono text-purple-700 font-bold">{agg.name}</code>
                                                <p className="text-xs text-slate-600 mt-1">{agg.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'functions' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Math.js Functions</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        The formula engine supports all math.js functions
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <ExampleBlock
                                        id="func-1"
                                        title="Square Root"
                                        formula="sqrt([Area])"
                                        description="Calculate square root of area"
                                    />
                                    <ExampleBlock
                                        id="func-2"
                                        title="Power"
                                        formula="pow([Base], 2)"
                                        description="Raise base to power of 2"
                                    />
                                    <ExampleBlock
                                        id="func-3"
                                        title="Absolute Value"
                                        formula="abs([Delta])"
                                        description="Get absolute value"
                                    />
                                    <ExampleBlock
                                        id="func-4"
                                        title="Rounding"
                                        formula="round([Value], 2)"
                                        description="Round to 2 decimal places"
                                    />
                                    <ExampleBlock
                                        id="func-5"
                                        title="Trigonometry"
                                        formula="sin([Angle]) * [Radius]"
                                        description="Trigonometric functions (sin, cos, tan, etc.)"
                                    />
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-green-800 mb-2">💡 Tip</h4>
                                    <p className="text-sm text-green-700">
                                        View full function reference at <a href="https://mathjs.org/docs/reference/functions.html" target="_blank" rel="noopener noreferrer" className="underline">mathjs.org</a>
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'units' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Automatic Unit Derivation</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        The engine automatically calculates result units based on the formula
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Multiplication</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <code className="bg-white px-2 py-1 rounded border">[Distance] * [Force]</code>
                                                <span className="text-slate-500">→</span>
                                                <code className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700">m · N = m·N</code>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <code className="bg-white px-2 py-1 rounded border">[Mass] * [Accl]</code>
                                                <span className="text-slate-500">→</span>
                                                <code className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700">kg · m/s² = N</code>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Division</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <code className="bg-white px-2 py-1 rounded border">[Energy] / [Time]</code>
                                                <span className="text-slate-500">→</span>
                                                <code className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700">J / s = W</code>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <code className="bg-white px-2 py-1 rounded border">[Speed] / [Time]</code>
                                                <span className="text-slate-500">→</span>
                                                <code className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700">m/s / s = m/s²</code>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Unit Cancellation</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <code className="bg-white px-2 py-1 rounded border">[Area] / [Length]</code>
                                                <span className="text-slate-500">→</span>
                                                <code className="bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-700">m² / m = m</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-orange-800 mb-2">⚠️ Unit Warnings</h4>
                                    <p className="text-sm text-orange-700 mb-2">
                                        Adding/subtracting columns with different units will show a warning:
                                    </p>
                                    <code className="block bg-white px-3 py-2 rounded border border-orange-300 text-xs">
                                        [Distance_m] + [Mass_kg] ⚠️ Unit mismatch: m vs kg
                                    </code>
                                </div>

                                <div>
                                    <h3 className="text-md font-bold text-slate-800 mb-3">Aggregate Units</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Aggregates inherit the unit of their target column
                                    </p>
                                    <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                        <code className="text-xs font-mono">$SUM_[CO2]</code>
                                        <p className="text-xs text-slate-600 mt-1">
                                            If [CO2] has unit "kg", the result will be "kg" (sum of all kg values)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <p className="text-xs text-slate-500 text-center">
                            Formulas are evaluated using math.js • Unit algebra is automatically applied
                        </p>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
