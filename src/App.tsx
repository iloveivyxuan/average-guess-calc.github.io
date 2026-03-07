/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calculator, 
  Plus, 
  Trash2, 
  Info, 
  Target, 
  TrendingDown,
  ChevronRight,
  AlertTriangle,
  Github,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlayerGroup {
  id: string;
  playerCount: number | '';
  chosenNumber: number | '';
  label: string;
}

const COEFFICIENTS = [0.25, 0.5, 0.75];

export default function App() {
  const [totalPlayers, setTotalPlayers] = useState<number | ''>(10);
  const [lastRoundFinalNumber, setLastRoundFinalNumber] = useState<number | ''>(50);
  const [groups, setGroups] = useState<PlayerGroup[]>([
    { id: '1', playerCount: 1, chosenNumber: 50, label: '玩家组 1' }
  ]);

  const addGroup = () => {
    setGroups(prevGroups => {
      const numericTotal = totalPlayers === '' ? 0 : totalPlayers;
      const currentSum = prevGroups.reduce((acc, g) => acc + (g.playerCount === '' ? 0 : g.playerCount), 0);
      const remaining = Math.max(0, numericTotal - currentSum);
      
      return [...prevGroups, { 
        id: Math.random().toString(36).substr(2, 9), 
        playerCount: remaining > 0 ? 1 : 0, // 默认给 1 人，或者如果没有剩余则给 0
        chosenNumber: 50, 
        label: `玩家组 ${prevGroups.length + 1}` 
      }];
    });
  };

  const updateGroup = (id: string, updates: Partial<PlayerGroup>) => {
    setGroups(prevGroups => {
      const newGroups = prevGroups.map(g => g.id === id ? { ...g, ...updates } : g);
      
      // 如果更新的是人数，且不是最后一个组，则自动调整最后一个组的人数以匹配总人数
      if ('playerCount' in updates && newGroups.length > 1) {
        const lastIndex = newGroups.length - 1;
        const targetIndex = newGroups.findIndex(g => g.id === id);
        
        if (targetIndex !== lastIndex) {
          const numericTotal = totalPlayers === '' ? 0 : totalPlayers;
          const otherSum = newGroups.slice(0, lastIndex).reduce((acc, g) => acc + (g.playerCount === '' ? 0 : g.playerCount), 0);
          newGroups[lastIndex] = {
            ...newGroups[lastIndex],
            playerCount: Math.max(0, numericTotal - otherSum)
          };
        }
      }
      return newGroups;
    });
  };

  const handleTotalPlayersChange = (val: string) => {
    const numericVal = val === '' ? '' : parseInt(val);
    setTotalPlayers(numericVal);
    
    // 当总人数改变时，自动更新最后一个组的人数
    setGroups(prevGroups => {
      if (prevGroups.length === 0) return prevGroups;
      const newGroups = [...prevGroups];
      const lastIndex = newGroups.length - 1;
      const numericTotal = numericVal === '' ? 0 : numericVal;
      const otherSum = newGroups.slice(0, lastIndex).reduce((acc, g) => acc + (g.playerCount === '' ? 0 : g.playerCount), 0);
      newGroups[lastIndex] = {
        ...newGroups[lastIndex],
        playerCount: Math.max(0, numericTotal - otherSum)
      };
      return newGroups;
    });
  };

  const removeGroup = (id: string) => {
    if (groups.length > 1) {
      setGroups(prevGroups => {
        const filtered = prevGroups.filter(g => g.id !== id);
        // 移除后，重新调整最后一个组的人数
        const lastIndex = filtered.length - 1;
        const numericTotal = totalPlayers === '' ? 0 : totalPlayers;
        const otherSum = filtered.slice(0, lastIndex).reduce((acc, g) => acc + (g.playerCount === '' ? 0 : g.playerCount), 0);
        filtered[lastIndex] = {
          ...filtered[lastIndex],
          playerCount: Math.max(0, numericTotal - otherSum)
        };
        return filtered;
      });
    }
  };

  const stats = useMemo(() => {
    const numericTotalPlayers = totalPlayers === '' ? 0 : totalPlayers;
    const numericLastRoundFinal = lastRoundFinalNumber === '' ? 0 : lastRoundFinalNumber;
    const inputPlayerCount = groups.reduce((acc, g) => acc + (g.playerCount === '' ? 0 : g.playerCount), 0);
    const inputSum = groups.reduce((acc, g) => acc + ((g.playerCount === '' ? 0 : g.playerCount) * (g.chosenNumber === '' ? 0 : g.chosenNumber)), 0);
    
    // 如果输入的总人数少于场上存活人数，假设剩余的人平均值为上一轮数字的 50%，最小为 1
    const remainingCount = Math.max(0, numericTotalPlayers - inputPlayerCount);
    const assumedRemainingAverage = Math.max(1, numericLastRoundFinal * 0.5);
    const finalTotalSum = inputSum + (remainingCount * assumedRemainingAverage);
    const average = numericTotalPlayers > 0 ? finalTotalSum / numericTotalPlayers : 0;

    const results = COEFFICIENTS.map(coef => {
      const finalNumber = average * coef;
      const groupDiffs = groups.map(g => ({
        label: g.label,
        number: g.chosenNumber === '' ? 0 : g.chosenNumber,
        diff: Math.abs((g.chosenNumber === '' ? 0 : g.chosenNumber) - finalNumber)
      }));

      // 将未录入玩家也纳入淘汰判定
      const allDiffs = [...groupDiffs];
      if (remainingCount > 0) {
        allDiffs.push({
          label: '未录入玩家',
          number: Number(assumedRemainingAverage.toFixed(2)),
          diff: Math.abs(assumedRemainingAverage - finalNumber)
        });
      }

      const maxDiff = allDiffs.length > 0 ? Math.max(...allDiffs.map(d => d.diff)) : 0;
      // 只有在存在差值的情况下才判定淘汰（避免初始全 0 的情况）
      const eliminatedGroups = allDiffs.filter(d => d.diff === maxDiff && d.diff > 0.0001);

      return {
        coef,
        finalNumber,
        groupDiffs,
        eliminatedGroups
      };
    });

    return {
      average,
      inputPlayerCount,
      remainingCount,
      results
    };
  }, [groups, totalPlayers]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto px-4 py-12 lg:px-8">
        {/* Header */}
        <header className="mb-12 border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <Calculator className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">决策计算器</h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">上一局最终数</div>
                <input 
                  type="number" 
                  step="0.01"
                  value={lastRoundFinalNumber}
                  onChange={(e) => setLastRoundFinalNumber(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="bg-transparent text-2xl font-mono font-bold text-emerald-400 outline-none w-24"
                />
              </div>
              <Target className="text-slate-600" size={24} />
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">场上存活总人数</div>
                <input 
                  type="number" 
                  value={totalPlayers}
                  onChange={(e) => handleTotalPlayersChange(e.target.value)}
                  className="bg-transparent text-2xl font-mono font-bold text-indigo-400 outline-none w-20"
                />
              </div>
              <Users className="text-slate-600" size={24} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left: Input Section */}
          <div className="xl:col-span-5 space-y-6">
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Target size={20} className="text-indigo-400" />
                  预测数据录入
                </h2>
                <button 
                  onClick={addGroup}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold transition-all border border-indigo-500/20"
                >
                  <Plus size={14} /> 添加组
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {groups.map((group) => (
                    <motion.div 
                      key={group.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-slate-900/50 border border-slate-700/30 rounded-2xl p-4 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <input 
                            type="text" 
                            value={group.label}
                            onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-300 w-full outline-none"
                            placeholder="组名/玩家名"
                          />
                          <button 
                            onClick={() => removeGroup(group.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 block">选择数字</label>
                            <div className="flex items-center bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800">
                              <input 
                                type="number" 
                                value={group.chosenNumber}
                                onChange={(e) => updateGroup(group.id, { chosenNumber: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                className="bg-transparent w-full outline-none font-mono text-emerald-400"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 block">人数</label>
                            <div className="flex items-center bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800">
                              <input 
                                type="number" 
                                value={group.playerCount}
                                onChange={(e) => updateGroup(group.id, { playerCount: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                className="bg-transparent w-full outline-none font-mono text-indigo-400"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {stats.remainingCount > 0 && (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-amber-200/80 leading-relaxed">
                    尚有 <span className="font-bold text-amber-400">{stats.remainingCount}</span> 名玩家未录入。
                    当前计算假设这些玩家的平均值为上一局最终数的 <span className="font-bold text-amber-400">50%</span> (即 <span className="font-bold text-amber-400">{(Math.max(1, (lastRoundFinalNumber === '' ? 0 : lastRoundFinalNumber) * 0.5)).toFixed(2)}</span>)。
                  </div>
                </div>
              )}
            </section>

            <section className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="relative z-10">
                <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">当前预测平均值</div>
                <div className="text-5xl font-mono font-bold text-indigo-400/90 tracking-tighter">
                  {stats.average.toFixed(2)}
                </div>
              </div>
              <TrendingDown className="absolute -right-4 -bottom-4 text-slate-700/20 group-hover:scale-110 transition-transform duration-700" size={120} />
            </section>
          </div>

          {/* Right: Results Section */}
          <div className="xl:col-span-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.results.map((res) => (
                <div 
                  key={res.coef}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm"
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">系数 {res.coef * 100}%</div>
                  <div className="text-2xl font-mono font-bold text-white mb-4">
                    {res.finalNumber.toFixed(2)}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-700 pb-1">差值分析</div>
                      {res.groupDiffs.map((gd, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 truncate max-w-[140px]">
                            {gd.number} - {gd.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-mono font-bold",
                              gd.diff < 5 ? "text-emerald-400" : gd.diff < 15 ? "text-amber-400" : "text-rose-400"
                            )}>
                              {gd.diff.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-rose-500/70 font-bold border-b border-rose-500/20 pb-1">淘汰数字</div>
                      {res.eliminatedGroups.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {res.eliminatedGroups.map((eg, idx) => (
                            <div key={idx} className="flex flex-col items-start">
                              <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-mono font-bold text-rose-400">
                                {eg.number}
                              </span>
                              <span className="text-[8px] text-slate-600 mt-0.5 ml-1">{eg.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-600 italic">暂无淘汰数据</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
