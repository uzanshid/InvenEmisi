import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Plus, FolderOpen, Clock, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { importProjectFile } from '../lib/projectSerializer';
import type { RecentProject } from '../store/useProjectStore';

export const WelcomeOverlay: React.FC = () => {
    const showWelcome = useProjectStore((s) => s.showWelcome);
    const setShowWelcome = useProjectStore((s) => s.setShowWelcome);
    const recentProjects = useProjectStore((s) => s.recentProjects);
    const loadRecentProjects = useProjectStore((s) => s.loadRecentProjects);
    const resetProject = useProjectStore((s) => s.resetProject);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadRecentProjects();
    }, [loadRecentProjects]);

    const handleNewProject = useCallback(() => {
        resetProject();
        setShowWelcome(false);
    }, [resetProject, setShowWelcome]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);

        const result = await importProjectFile(file);

        if (result.success) {
            setShowWelcome(false);
        } else {
            setImportError(result.error || 'Failed to import project');
        }

        setIsImporting(false);
        e.target.value = '';
    }, [setShowWelcome]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    };

    if (!showWelcome) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-950/80 to-indigo-950/90 backdrop-blur-sm" />

            {/* Card */}
            <div className="relative w-full max-w-lg mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20 overflow-hidden animate-in">
                {/* Header gradient */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="p-8">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 mb-4">
                            <Sparkles size={28} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">InvenEmisi</h1>
                        <p className="text-sm text-slate-500 mt-1">Emission Inventory Workbench</p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={handleNewProject}
                            className="flex flex-col items-center gap-2 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/60 rounded-xl transition-all group"
                        >
                            <div className="p-2.5 bg-blue-500 rounded-lg text-white group-hover:scale-110 transition-transform shadow-md shadow-blue-500/20">
                                <Plus size={22} />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-700">New Project</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Start from scratch</div>
                            </div>
                        </button>

                        <button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="flex flex-col items-center gap-2 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/60 rounded-xl transition-all group disabled:opacity-50"
                        >
                            <div className="p-2.5 bg-emerald-500 rounded-lg text-white group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/20">
                                <FolderOpen size={22} />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-700">
                                    {isImporting ? 'Importing...' : 'Import File'}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">.inven or .json</div>
                            </div>
                        </button>
                    </div>

                    {/* Import Error */}
                    {importError && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{importError}</span>
                        </div>
                    )}

                    {/* Recent Projects */}
                    {recentProjects.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Projects</span>
                            </div>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {recentProjects.map((project: RecentProject, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <FileText size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-xs font-medium text-slate-600 truncate flex-1">{project.name}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{formatDate(project.date)}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 text-center italic">
                                Use "Import File" to reopen a saved project
                            </p>
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".inven,.json"
                    onChange={handleFileSelected}
                    className="hidden"
                />
            </div>

            {/* CSS animation */}
            <style>{`
                .animate-in {
                    animation: welcomeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes welcomeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};
