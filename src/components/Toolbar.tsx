import React, { useRef, useCallback, useState } from 'react';
import { Save, FolderOpen, Check } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { downloadProjectFile, importProjectFile } from '../lib/projectSerializer';

export const Toolbar: React.FC = () => {
    const projectName = useProjectStore((s) => s.projectName);
    const setProjectName = useProjectStore((s) => s.setProjectName);
    const lastModified = useProjectStore((s) => s.lastModified);

    const [saveFlash, setSaveFlash] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = useCallback(() => {
        downloadProjectFile();
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 1500);
    }, []);

    const handleImport = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        const result = await importProjectFile(file);
        if (!result.success) {
            setImportError(result.error || 'Import failed');
            setTimeout(() => setImportError(null), 4000);
        }
        // Reset input so same file can be re-imported
        e.target.value = '';
    }, []);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 z-20 select-none">
            {/* Left: Project Title */}
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="text-sm font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors min-w-[120px] max-w-[300px]"
                    placeholder="Project Name"
                    spellCheck={false}
                />
                {lastModified && (
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                        Saved: {formatDate(lastModified)}
                    </span>
                )}
            </div>

            {/* Right: Buttons */}
            <div className="flex items-center gap-2">
                {importError && (
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded animate-pulse">
                        {importError}
                    </span>
                )}

                <button
                    onClick={handleImport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    title="Import Project (.inven)"
                >
                    <FolderOpen size={14} />
                    Import
                </button>

                <button
                    onClick={handleSave}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${saveFlash
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    title="Save Project (Ctrl+S)"
                >
                    {saveFlash ? <Check size={14} /> : <Save size={14} />}
                    {saveFlash ? 'Saved!' : 'Save'}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".inven,.json"
                    onChange={handleFileSelected}
                    className="hidden"
                />
            </div>
        </div>
    );
};
