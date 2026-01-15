import React, { useState, useMemo } from 'react';
import { X, Search, Database, ChevronDown, ChevronUp, FilterX } from 'lucide-react';
import {
    searchFactorsWithFilters,
    getUniqueNfr,
    getUniqueSectors,
    getUniqueTables,
    getUniqueTypes,
    getUniqueTechnologies,
    getUniqueFuels,
    getUniqueAbatements,
    getUniqueRegions,
    getUniquePollutants,
    type EmissionFactor
} from '../data/emissionFactorDb';

interface LookupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (factor: EmissionFactor) => void;
}

const ITEMS_PER_PAGE = 10;

export const LookupDialog: React.FC<LookupDialogProps> = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const [nfr, setNfr] = useState('All NFR');
    const [sector, setSector] = useState('All Sectors');
    const [table, setTable] = useState('All Tables');
    const [type, setType] = useState('All Types');
    const [technology, setTechnology] = useState('All Technologies');
    const [fuel, setFuel] = useState('All Fuels');
    const [abatement, setAbatement] = useState('All Abatements');
    const [region, setRegion] = useState('All Regions');
    const [pollutant, setPollutant] = useState('All Pollutants');
    const [page, setPage] = useState(0);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const nfrs = useMemo(() => getUniqueNfr(), []);
    const sectors = useMemo(() => getUniqueSectors(), []);
    const tables = useMemo(() => getUniqueTables(), []);
    const types = useMemo(() => getUniqueTypes(), []);
    const technologies = useMemo(() => getUniqueTechnologies(), []);
    const fuels = useMemo(() => getUniqueFuels(), []);
    const abatements = useMemo(() => getUniqueAbatements(), []);
    const regions = useMemo(() => getUniqueRegions(), []);
    const pollutants = useMemo(() => getUniquePollutants(), []);

    const results = useMemo(() => {
        return searchFactorsWithFilters({
            query,
            nfr,
            sector,
            table,
            type,
            technology,
            fuel,
            abatement,
            region,
            pollutant,
            limit: 1000
        });
    }, [query, nfr, sector, table, type, technology, fuel, abatement, region, pollutant]);

    const paginatedResults = useMemo(() => {
        const start = page * ITEMS_PER_PAGE;
        return results.slice(start, start + ITEMS_PER_PAGE);
    }, [results, page]);

    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

    const handleSelect = (factor: EmissionFactor) => {
        onSelect(factor);
        onClose();
    };

    const clearFilters = () => {
        setQuery('');
        setNfr('All NFR');
        setSector('All Sectors');
        setTable('All Tables');
        setType('All Types');
        setTechnology('All Technologies');
        setFuel('All Fuels');
        setAbatement('All Abatements');
        setRegion('All Regions');
        setPollutant('All Pollutants');
        setPage(0);
    };

    const hasActiveFilters = query !== '' ||
        nfr !== 'All NFR' ||
        sector !== 'All Sectors' ||
        table !== 'All Tables' ||
        type !== 'All Types' ||
        technology !== 'All Technologies' ||
        fuel !== 'All Fuels' ||
        abatement !== 'All Abatements' ||
        region !== 'All Regions' ||
        pollutant !== 'All Pollutants';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[1800px] max-w-[95vw] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-emerald-500" />
                        <h2 className="text-xl font-bold text-slate-800">Emission Factor Database</h2>
                        <span className="text-sm text-slate-500">({results.length} results)</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-slate-200 space-y-3">
                    {/* Search and Clear Filters */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                                placeholder="Search across all fields..."
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium text-slate-600"
                            >
                                <FilterX className="w-4 h-4" />
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Primary Filters */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Sector</label>
                            <select
                                value={sector}
                                onChange={(e) => { setSector(e.target.value); setPage(0); }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                            >
                                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Pollutant</label>
                            <select
                                value={pollutant}
                                onChange={(e) => { setPollutant(e.target.value); setPage(0); }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                            >
                                {pollutants.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Fuel</label>
                            <select
                                value={fuel}
                                onChange={(e) => { setFuel(e.target.value); setPage(0); }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                            >
                                {fuels.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                        {showAdvancedFilters ? (
                            <>
                                <ChevronUp className="w-4 h-4" />
                                Hide Advanced Filters
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                Show Advanced Filters
                            </>
                        )}
                    </button>

                    {/* Advanced Filters */}
                    {showAdvancedFilters && (
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">NFR Code</label>
                                <select
                                    value={nfr}
                                    onChange={(e) => { setNfr(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {nfrs.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Table</label>
                                <select
                                    value={table}
                                    onChange={(e) => { setTable(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {tables.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => { setType(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Technology</label>
                                <select
                                    value={technology}
                                    onChange={(e) => { setTechnology(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {technologies.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Abatement</label>
                                <select
                                    value={abatement}
                                    onChange={(e) => { setAbatement(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {abatements.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Region</label>
                                <select
                                    value={region}
                                    onChange={(e) => { setRegion(e.target.value); setPage(0); }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-400 outline-none text-sm"
                                >
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">NFR</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fuel</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Pollutant</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Technology</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Value</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedResults.map((factor) => (
                                <tr
                                    key={factor.id}
                                    onClick={() => handleSelect(factor)}
                                    className="hover:bg-emerald-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-3 py-2.5 text-xs text-slate-600 font-mono max-w-[100px] truncate" title={factor.nfr}>{factor.nfr}</td>
                                    <td className="px-3 py-2.5 text-sm font-medium text-slate-800 max-w-[120px] truncate" title={factor.fuel}>{factor.fuel}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                            {factor.pollutant}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[140px] truncate" title={factor.technology || 'NA'}>{factor.technology || 'NA'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${factor.type.includes('Tier 1') ? 'bg-green-100 text-green-700' :
                                            factor.type.includes('Tier 2') ? 'bg-amber-100 text-amber-700' :
                                                factor.type.includes('Tier 3') ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {factor.type.replace('Emission Factor', 'EF')}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-right font-mono text-slate-700">{factor.value}</td>
                                    <td className="px-3 py-2.5 text-sm text-slate-600">{factor.unit}</td>
                                </tr>
                            ))}
                            {paginatedResults.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No emission factors found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <span className="text-sm text-slate-600">
                        {results.length} result{results.length !== 1 ? 's' : ''} found
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">
                            Page {page + 1} of {Math.max(1, totalPages)}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LookupDialog;
