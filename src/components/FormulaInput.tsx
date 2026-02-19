import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ── Suggestion Data ──────────────────────────────────────────────
interface Suggestion {
    label: string;       // Display text
    insertText: string;  // Text to insert
    type: 'column' | 'scalar' | 'function' | 'aggregate';
    description?: string; // Tooltip/description
}

const FUNCTION_SUGGESTIONS: Suggestion[] = [
    { label: 'IF', insertText: 'IF(', type: 'function', description: 'IF(condition, true_val, false_val)' },
    { label: 'IFS', insertText: 'IFS(', type: 'function', description: 'IFS(cond1, val1, cond2, val2, ...)' },
    { label: 'SWITCH', insertText: 'SWITCH(', type: 'function', description: 'SWITCH(val, case1, res1, ..., default)' },
    { label: 'XLOOKUP', insertText: 'XLOOKUP(', type: 'function', description: 'XLOOKUP(val, lookup_col, return_col, default)' },
    { label: 'sqrt', insertText: 'sqrt(', type: 'function', description: 'sqrt(x) — Square root' },
    { label: 'abs', insertText: 'abs(', type: 'function', description: 'abs(x) — Absolute value' },
    { label: 'pow', insertText: 'pow(', type: 'function', description: 'pow(base, exp) — Power' },
    { label: 'round', insertText: 'round(', type: 'function', description: 'round(x, n) — Round to n decimals' },
    { label: 'ceil', insertText: 'ceil(', type: 'function', description: 'ceil(x) — Round up' },
    { label: 'floor', insertText: 'floor(', type: 'function', description: 'floor(x) — Round down' },
    { label: 'log', insertText: 'log(', type: 'function', description: 'log(x) — Natural logarithm' },
    { label: 'log10', insertText: 'log10(', type: 'function', description: 'log10(x) — Base-10 logarithm' },
    { label: 'exp', insertText: 'exp(', type: 'function', description: 'exp(x) — Euler\'s number raised to x' },
    { label: 'min', insertText: 'min(', type: 'function', description: 'min(a, b) — Minimum value' },
    { label: 'max', insertText: 'max(', type: 'function', description: 'max(a, b) — Maximum value' },
    { label: 'mod', insertText: 'mod(', type: 'function', description: 'mod(a, b) — Modulo/remainder' },
];

const AGGREGATE_SUGGESTIONS: Suggestion[] = [
    { label: '$SUM_', insertText: '$SUM_[', type: 'aggregate', description: '$SUM_[Column] — Sum all values' },
    { label: '$AVG_', insertText: '$AVG_[', type: 'aggregate', description: '$AVG_[Column] — Average' },
    { label: '$MIN_', insertText: '$MIN_[', type: 'aggregate', description: '$MIN_[Column] — Minimum' },
    { label: '$MAX_', insertText: '$MAX_[', type: 'aggregate', description: '$MAX_[Column] — Maximum' },
    { label: '$COUNT_', insertText: '$COUNT_[', type: 'aggregate', description: '$COUNT_[Column] — Count non-null' },
];

// ── Type Badge Colors ────────────────────────────────────────────
const TYPE_COLORS: Record<Suggestion['type'], { bg: string; text: string; badge: string }> = {
    column: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
    scalar: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-600' },
    function: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-600' },
    aggregate: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-600' },
};

const TYPE_LABELS: Record<Suggestion['type'], string> = {
    column: 'COL',
    scalar: 'VAR',
    function: 'FN',
    aggregate: 'AGG',
};

// ── Props ────────────────────────────────────────────────────────
interface FormulaInputProps {
    value: string;
    onChange: (value: string) => void;
    columns: Array<{ name: string }>;
    scalars: Array<{ label: string; unit: string }>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    placeholder?: string;
}

export const FormulaInput: React.FC<FormulaInputProps> = ({
    value,
    onChange,
    columns,
    scalars,
    textareaRef,
    placeholder = '[ColumnA] * [FactorNode]',
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [triggerInfo, setTriggerInfo] = useState<{ word: string; startPos: number; isBracket: boolean } | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Build full suggestion list
    const allSuggestions = useMemo<Suggestion[]>(() => {
        const colSuggestions: Suggestion[] = columns.map(col => ({
            label: col.name,
            insertText: `[${col.name}]`,
            type: 'column' as const,
            description: `Column: ${col.name}`,
        }));

        const scalarSuggestions: Suggestion[] = scalars.map(s => ({
            label: s.label,
            insertText: `[${s.label}]`,
            type: 'scalar' as const,
            description: `Scalar: ${s.label}${s.unit ? ` (${s.unit})` : ''}`,
        }));

        return [...colSuggestions, ...scalarSuggestions, ...FUNCTION_SUGGESTIONS, ...AGGREGATE_SUGGESTIONS];
    }, [columns, scalars]);

    // Filter suggestions based on current typing
    const filteredSuggestions = useMemo(() => {
        if (!triggerInfo) return [];
        const query = triggerInfo.word.toLowerCase();
        if (query.length === 0 && triggerInfo.isBracket) {
            // Show columns and scalars when just "[" is typed
            return allSuggestions.filter(s => s.type === 'column' || s.type === 'scalar');
        }
        if (query.length === 0) return [];

        return allSuggestions.filter(s => {
            const label = s.label.toLowerCase();
            // Fuzzy-ish match: starts with or contains
            return label.startsWith(query) || label.includes(query);
        }).slice(0, 12); // Limit to 12 suggestions
    }, [triggerInfo, allSuggestions]);

    // Detect current word at cursor for triggering suggestions
    const detectTrigger = useCallback((text: string, cursorPos: number) => {
        if (cursorPos === 0) {
            setTriggerInfo(null);
            setShowSuggestions(false);
            return;
        }

        const beforeCursor = text.slice(0, cursorPos);

        // Case 1: Inside bracket — user typed "[" then letters
        const bracketMatch = beforeCursor.match(/\[([^\]]*?)$/);
        if (bracketMatch) {
            setTriggerInfo({
                word: bracketMatch[1],
                startPos: cursorPos - bracketMatch[0].length,
                isBracket: true
            });
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
        }

        // Case 2: Typing a function name (letters after operator/start/space/comma)
        const funcMatch = beforeCursor.match(/(?:^|[\s,+\-*/^(])(\$?[a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (funcMatch && funcMatch[1].length >= 1) {
            setTriggerInfo({
                word: funcMatch[1],
                startPos: cursorPos - funcMatch[1].length,
                isBracket: false
            });
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
        }

        setTriggerInfo(null);
        setShowSuggestions(false);
    }, []);

    // Apply a suggestion
    const applySuggestion = useCallback((suggestion: Suggestion) => {
        const textarea = textareaRef.current;
        if (!textarea || !triggerInfo) return;

        const cursorPos = textarea.selectionStart;
        let insertText = suggestion.insertText;

        let replaceStart: number;
        let replaceEnd: number;

        if (triggerInfo.isBracket) {
            // Replace from "[" to cursor position
            replaceStart = triggerInfo.startPos;
            replaceEnd = cursorPos;
            // If next char is "]", include it in replacement
            if (value[cursorPos] === ']') replaceEnd++;
        } else {
            replaceStart = triggerInfo.startPos;
            replaceEnd = cursorPos;
        }

        const newValue = value.slice(0, replaceStart) + insertText + value.slice(replaceEnd);
        onChange(newValue);

        // Set cursor after inserted text
        const newCursorPos = replaceStart + insertText.length;
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        setShowSuggestions(false);
        setTriggerInfo(null);
    }, [value, onChange, textareaRef, triggerInfo]);

    // Handle textarea changes
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        detectTrigger(newValue, e.target.selectionStart);
    }, [onChange, detectTrigger]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || filteredSuggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                break;
            case 'Tab':
            case 'Enter':
                e.preventDefault();
                applySuggestion(filteredSuggestions[selectedIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                break;
        }
    }, [showSuggestions, filteredSuggestions, selectedIndex, applySuggestion]);

    // Handle cursor movement (click) in textarea
    const handleClick = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        detectTrigger(textarea.value, textarea.selectionStart);
    }, [textareaRef, detectTrigger]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (suggestionsRef.current) {
            const selectedEl = suggestionsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    return (
        <div ref={containerRef} className="relative">
            <textarea
                ref={textareaRef}
                className="w-full text-xs font-mono border border-slate-200 rounded p-1.5 focus:outline-none focus:border-purple-800 resize-none h-16 bg-slate-50"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
            />

            {/* Autocomplete Popup */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto"
                    style={{ minWidth: '220px' }}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {filteredSuggestions.map((suggestion, index) => {
                        const colors = TYPE_COLORS[suggestion.type];
                        const isSelected = index === selectedIndex;
                        return (
                            <div
                                key={`${suggestion.type}-${suggestion.label}`}
                                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors ${isSelected ? `${colors.bg} border-l-2 border-purple-500` : 'hover:bg-slate-50 border-l-2 border-transparent'
                                    }`}
                                onClick={() => applySuggestion(suggestion)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {/* Type Badge */}
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
                                    {TYPE_LABELS[suggestion.type]}
                                </span>
                                {/* Label */}
                                <span className={`text-xs font-mono font-semibold ${colors.text} flex-1 truncate`}>
                                    {suggestion.label}
                                </span>
                                {/* Description */}
                                {suggestion.description && isSelected && (
                                    <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                        {suggestion.description}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {/* Hint Footer */}
                    <div className="px-2 py-1 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[9px] text-slate-400">
                        <span>↑↓ navigate</span>
                        <span>Tab/Enter select</span>
                        <span>Esc close</span>
                    </div>
                </div>
            )}
        </div>
    );
};
