import React from 'react';
import { X } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, language }) => {
    const t = TRANSLATIONS[language];

    if (!isOpen) return null;

    // Helper to draw a mini grid for demonstration
    const MiniGrid = ({ type }: { type: string }) => {
        // Determine diagram based on type
        const renderContent = () => {
            switch (type) {
                case 'general':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L0,4 L4,2 z" fill="#d97706" /></marker></defs>
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="2" />
                            <line x1="10" y1="36" x2="90" y2="36" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="63" x2="90" y2="63" stroke="#ba702e" strokeWidth="1" />
                            <line x1="36" y1="10" x2="36" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="63" y1="10" x2="63" y2="90" stroke="#ba702e" strokeWidth="1" />
                            {/* Palace X */}
                            <line x1="10" y1="10" x2="90" y2="90" stroke="#ba702e" strokeWidth="1" strokeDasharray="4" />
                            <line x1="90" y1="10" x2="10" y2="90" stroke="#ba702e" strokeWidth="1" strokeDasharray="4" />
                            {/* Piece */}
                            <circle cx="50" cy="50" r="12" fill="#ef4444" />
                            <text x="50" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">帅</text>
                            {/* Moves */}
                            <circle cx="50" cy="23" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="50" cy="77" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="23" cy="50" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="77" cy="50" r="3" fill="#22c55e" opacity="0.6" />
                        </svg>
                    );
                case 'advisor':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="2" />
                            <line x1="10" y1="36" x2="90" y2="36" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="63" x2="90" y2="63" stroke="#ba702e" strokeWidth="1" />
                            <line x1="36" y1="10" x2="36" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="63" y1="10" x2="63" y2="90" stroke="#ba702e" strokeWidth="1" />
                            {/* Palace X */}
                            <line x1="10" y1="10" x2="90" y2="90" stroke="#ba702e" strokeWidth="1" strokeDasharray="4" />
                            <line x1="90" y1="10" x2="10" y2="90" stroke="#ba702e" strokeWidth="1" strokeDasharray="4" />
                            {/* Piece */}
                            <circle cx="50" cy="50" r="12" fill="#ef4444" />
                            <text x="50" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">仕</text>
                            {/* Moves */}
                            <circle cx="10" cy="10" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="90" cy="10" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="90" cy="90" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="10" cy="90" r="3" fill="#22c55e" opacity="0.6" />
                        </svg>
                    );
                case 'horse':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="1" />
                            <line x1="36" y1="10" x2="36" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="63" y1="10" x2="63" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="36" x2="90" y2="36" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="63" x2="90" y2="63" stroke="#ba702e" strokeWidth="1" />

                            {/* Piece */}
                            <circle cx="50" cy="50" r="12" fill="#ef4444" />
                            <text x="50" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">马</text>

                            {/* Moves */}
                            <circle cx="36" cy="23" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="63" cy="23" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="77" cy="36" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="77" cy="63" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="63" cy="77" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="36" cy="77" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="23" cy="63" r="3" fill="#22c55e" opacity="0.6" />
                            <circle cx="23" cy="36" r="3" fill="#22c55e" opacity="0.6" />

                            {/* Path lines */}
                            <path d="M50,50 L50,36 L36,23" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
                            <path d="M50,50 L50,36 L63,23" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
                        </svg>
                    );
                case 'elephant':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="1" />
                            <line x1="50" y1="10" x2="50" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="50" x2="90" y2="50" stroke="#ba702e" strokeWidth="1" />

                            {/* Piece */}
                            <circle cx="50" cy="50" r="12" fill="#ef4444" />
                            <text x="50" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">相</text>

                            {/* Moves */}
                            <circle cx="10" cy="10" r="4" fill="#22c55e" opacity="0.6" />
                            <circle cx="90" cy="10" r="4" fill="#22c55e" opacity="0.6" />
                            <circle cx="90" cy="90" r="4" fill="#22c55e" opacity="0.6" />
                            <circle cx="10" cy="90" r="4" fill="#22c55e" opacity="0.6" />

                            {/* Block Example */}
                            <circle cx="30" cy="30" r="2" fill="#000" opacity="0.2" />
                            <text x="35" y="45" fontSize="8" fill="#7a4526">Eye</text>
                        </svg>
                    );
                case 'chariot':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="1" />
                            <line x1="50" y1="10" x2="50" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="50" x2="90" y2="50" stroke="#ba702e" strokeWidth="1" />

                            {/* Piece */}
                            <circle cx="50" cy="50" r="12" fill="#ef4444" />
                            <text x="50" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">车</text>

                            {/* Arrows */}
                            <path d="M50,38 L50,15" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.6" />
                            <path d="M50,62 L50,85" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.6" />
                            <path d="M38,50 L15,50" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.6" />
                            <path d="M62,50 L85,50" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.6" />
                        </svg>
                    );
                case 'cannon':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="1" />
                            <line x1="50" y1="10" x2="50" y2="90" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="50" x2="90" y2="50" stroke="#ba702e" strokeWidth="1" />

                            {/* Piece */}
                            <circle cx="30" cy="50" r="12" fill="#ef4444" />
                            <text x="30" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">炮</text>

                            {/* Obstacle */}
                            <circle cx="60" cy="50" r="10" fill="#ba702e" stroke="#7a4526" strokeWidth="1" />

                            {/* Target */}
                            <circle cx="90" cy="50" r="8" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2" />

                            {/* Jump Path */}
                            <path d="M30,50 Q60,20 90,50" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" opacity="0.8" />
                        </svg>
                    );
                case 'soldier':
                    return (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                            {/* River divider */}
                            <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ba702e" strokeWidth="1" />
                            <line x1="10" y1="50" x2="90" y2="50" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" />
                            <text x="85" y="45" fontSize="8" fill="#3b82f6" textAnchor="end">River</text>

                            {/* Before River */}
                            <circle cx="30" cy="70" r="10" fill="#ef4444" />
                            <text x="30" y="74" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">兵</text>
                            <path d="M30,60 L30,52" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" />

                            {/* After River */}
                            <circle cx="70" cy="30" r="10" fill="#ef4444" opacity="0.8" />
                            <text x="70" y="34" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">兵</text>
                            <path d="M70,20 L70,12" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" />
                            <path d="M60,30 L52,30" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" />
                            <path d="M80,30 L88,30" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" />
                        </svg>
                    );
                default:
                    return null;
            }
        }

        return (
            <div className="w-16 h-16 bg-amber-100 rounded-lg border border-amber-300 mx-auto shadow-inner">
                {renderContent()}
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-[#fbf7f1] rounded-xl w-full max-w-3xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-stone-300">

                {/* Header - Compact */}
                <div className="bg-[#ba702e] text-[#fbf7f1] p-3 flex justify-between items-center shadow-md shrink-0">
                    <h2 className="text-lg font-serif font-bold flex items-center gap-2">
                        📖 {t.rulesTitle}
                    </h2>
                    <button onClick={onClose} className="hover:bg-black/20 p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Compact */}
                <div className="overflow-y-auto p-3 md:p-4 space-y-4 flex-1 scroll-smooth">

                    {/* Intro */}
                    <section className="text-center bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <p className="text-sm text-stone-700 font-serif leading-relaxed">
                            {t.rulesIntro}
                        </p>
                    </section>

                    {/* General & Advisor */}
                    <section>
                        <h3 className="text-sm font-bold text-[#ba702e] mb-2 border-b border-amber-200 pb-1">{t.pieceMovement}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* General */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="general" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleGeneral}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleGeneralDesc}</p>
                                </div>
                            </div>

                            {/* Advisor */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="advisor" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleAdvisor}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleAdvisorDesc}</p>
                                </div>
                            </div>

                            {/* Horse */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="horse" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleHorse}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleHorseDesc}</p>
                                </div>
                            </div>

                            {/* Elephant */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="elephant" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleElephant}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleElephantDesc}</p>
                                </div>
                            </div>

                            {/* Chariot */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="chariot" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleChariot}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleChariotDesc}</p>
                                </div>
                            </div>

                            {/* Cannon */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="cannon" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleCannon}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleCannonDesc}</p>
                                </div>
                            </div>

                            {/* Soldier */}
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-200 flex flex-row gap-3 items-center md:col-span-2 hover:shadow-md transition-shadow">
                                <div className="shrink-0"><MiniGrid type="soldier" /></div>
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-red-700 text-sm mb-0.5">{t.ruleSoldier}</h4>
                                    <p className="text-xs text-stone-600 leading-tight">{t.ruleSoldierDesc}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Special Rules */}
                    <section className="bg-[#fff8ed] p-3 rounded-lg border border-[#e4c083]">
                        <h3 className="text-sm font-bold text-[#ba702e] mb-2">{t.specialRules}</h3>
                        <ul className="space-y-1 text-xs text-stone-700">
                            <li className="flex gap-2">
                                <span className="text-blue-500">🌊</span>
                                <span>{t.ruleRiver}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-red-500">🏰</span>
                                <span>{t.rulePalace}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-yellow-600">🏆</span>
                                <span>{t.ruleWin}</span>
                            </li>
                        </ul>
                    </section>

                    <button
                        onClick={onClose}
                        className="w-full bg-[#ba702e] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#955627] transition-colors shadow-md"
                    >
                        {t.confirm} (OK)
                    </button>
                </div>
            </div>
        </div>
    );
};