import React, { useState, useEffect, useMemo } from 'react';
import { PageTransition, GlassCard, Button, Input } from '../components/UI';
import { 
  BarChart2, Users, PieChart, Activity, RefreshCw, AlertTriangle, ShieldCheck, 
  Database, Lock, Unlock, Zap, Target, TrendingUp, Calendar, ArrowRight,
  FileText, Cpu, Package, Layers, Sparkles
} from 'lucide-react';
import { AnalyticsEvent, Persona } from '../types';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---

const SimpleLineChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 60 }) => {
    if (!data || data.length === 0) return <div className="h-full w-full bg-white/5 rounded-lg animate-pulse" />;
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min;
    const width = 100;
    
    // Create points for the SVG path
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    const fillPath = `${points} 100,100 0,100`;

    return (
        <div className="w-full relative overflow-hidden rounded-lg" style={{ height }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <path d={fillPath} fill={`url(#grad-${color})`} stroke="none" />
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string | number; subValue?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, icon, trend }) => (
    <GlassCard className="p-5 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 transform translate-x-2 -translate-y-2">
            {icon}
        </div>
        <div>
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                {icon} {label}
            </div>
            <div className="text-3xl font-mono text-white font-bold tracking-tight">{value}</div>
        </div>
        {subValue && (
            <div className={`text-xs mt-3 flex items-center gap-1 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
                {trend === 'up' && <TrendingUp size={12} />}
                {subValue}
            </div>
        )}
    </GlassCard>
);

const ProgressBar: React.FC<{ label: string; value: number; max: number; color: string; icon?: React.ReactNode }> = ({ label, value, max, color, icon }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs items-center">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                    {icon} {label}
                </span>
                <span className="text-slate-400 font-mono">{value} ({percentage.toFixed(0)}%)</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color}`} 
                />
            </div>
        </div>
    );
};

// --- Main Analytics Component ---

const Analytics: React.FC = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load events
  const loadEvents = async () => {
    setLoading(true);
    try {
        let remoteEvents: AnalyticsEvent[] = [];
        let isRemoteConnected = false;

        if (supabase) {
            // Check session first if using Supabase
            // const { data: { session } } = await supabase.auth.getSession();
            // If connected, we assume valid credentials/RLS are in place.
            
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5000); // Increased limit for better charts
                
            if (!error && data) {
                isRemoteConnected = true;
                remoteEvents = data.map((e: any) => ({
                    id: e.id,
                    eventName: e.event_name,
                    timestamp: new Date(e.created_at).getTime(),
                    data: e.metadata
                }));
            }
        }

        if (isRemoteConnected) {
            setIsConnected(true);
            setEvents(remoteEvents);
        } else {
            setIsConnected(false);
            const stored = localStorage.getItem('VIBE_ANALYTICS_EVENTS');
            if (stored) {
                const localEvents = JSON.parse(stored) as AnalyticsEvent[];
                localEvents.sort((a, b) => b.timestamp - a.timestamp);
                setEvents(localEvents);
            }
        }
    } catch (e) {
        console.error('Failed to load analytics', e);
        const stored = localStorage.getItem('VIBE_ANALYTICS_EVENTS');
        if (stored) setEvents(JSON.parse(stored));
        setIsConnected(false);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      loadEvents();
      const interval = setInterval(loadEvents, 15000); // 15s polling
      return () => clearInterval(interval);
  }, []);


  // --- Deep Metrics Calculation ---
  const metrics = useMemo(() => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      const totalEvents = events.length;
      
      // Breakdown by Event Type
      const projectCreates = events.filter(e => e.eventName === 'project_created');
      const exports = events.filter(e => e.eventName === 'export_kit');
      const generations = events.filter(e => e.eventName === 'generation_complete');
      
      // Generation Sub-types
      const genResearch = generations.filter(e => e.data?.type === 'research').length;
      const genPRD = generations.filter(e => e.data?.type === 'prd').length;
      const genTech = generations.filter(e => e.data?.type === 'tech').length;
      const genAgent = generations.filter(e => e.data?.type === 'agent').length;

      // Unique Sessions
      // const sessions = new Set(events.map(e => e.id)); 
      
      // Active in last 24h
      const activeEvents24h = events.filter(e => (now - e.timestamp) < oneDay);
      
      // Activity Buckets (Last 14 days)
      const daysMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
          const d = new Date(now - (i * oneDay));
          daysMap.set(d.toLocaleDateString(), 0);
      }
      events.forEach(e => {
          const date = new Date(e.timestamp).toLocaleDateString();
          if (daysMap.has(date)) {
              daysMap.set(date, (daysMap.get(date) || 0) + 1);
          }
      });
      const chartData = Array.from(daysMap.values()).reverse(); // Oldest to newest

      // Funnel Logic (Approximation by Volume)
      const funnel = {
          projects: projectCreates.length,
          research: genResearch,
          prd: genPRD,
          tech: genTech,
          export: exports.length
      };
      
      const conversionRate = funnel.projects > 0 ? ((funnel.export / funnel.projects) * 100).toFixed(1) : '0';

      return {
          totalEvents,
          active24h: activeEvents24h.length,
          projects: funnel.projects,
          exports: funnel.export,
          generations: generations.length,
          conversionRate,
          chartData,
          funnel,
          distribution: {
              research: genResearch,
              prd: genPRD,
              tech: genTech,
              agent: genAgent
          }
      };
  }, [events]);

  // --- Main Dashboard ---
  return (
    <PageTransition>
      <div className="space-y-8 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
                    <Activity className="text-primary-400" /> Mission Control
                </h2>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className={`flex items-center gap-2 ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <Database size={12} /> {isConnected ? 'Live Database' : 'Local Storage'}
                    </span>
                    <span>•</span>
                    <span>{events.length} Total Events Logged</span>
                </div>
            </div>
            <Button onClick={loadEvents} variant="secondary" className="border-white/10 text-slate-300">
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </Button>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <MetricCard 
                label="Total Projects" 
                value={metrics.projects} 
                icon={<FolderOpen size={20} className="text-blue-400" />}
                subValue="All time"
             />
             <MetricCard 
                label="Active Events (24h)" 
                value={metrics.active24h} 
                icon={<Zap size={20} className="text-amber-400" />}
                trend="up"
                subValue="Last 24 hours"
             />
             <MetricCard 
                label="AI Generations" 
                value={metrics.generations} 
                icon={<Sparkles size={20} className="text-purple-400" />}
                subValue="Across all phases"
             />
             <MetricCard 
                label="Conversion Rate" 
                value={`${metrics.conversionRate}%`} 
                icon={<Target size={20} className="text-emerald-400" />}
                trend={parseFloat(metrics.conversionRate) > 50 ? 'up' : 'neutral'}
                subValue="Projects to Export"
             />
        </div>

        {/* Main Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Activity Chart */}
            <GlassCard className="lg:col-span-2 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-400" /> User Activity
                        </h3>
                        <p className="text-xs text-slate-500">Event volume over the last 14 days</p>
                    </div>
                </div>
                <div className="flex-1 flex items-end">
                    <SimpleLineChart data={metrics.chartData} color="#34d399" height={200} />
                </div>
                <div className="flex justify-between mt-4 text-[10px] text-slate-600 font-mono uppercase">
                    <span>14 Days Ago</span>
                    <span>Today</span>
                </div>
            </GlassCard>

            {/* Funnel / Conversion */}
            <GlassCard className="flex flex-col">
                <div className="mb-6">
                    <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                        <BarChart2 size={18} className="text-blue-400" /> Pipeline Funnel
                    </h3>
                    <p className="text-xs text-slate-500">Drop-off from creation to export</p>
                </div>
                <div className="space-y-6 flex-1">
                    <ProgressBar 
                        label="Projects Started" 
                        value={metrics.funnel.projects} 
                        max={metrics.funnel.projects} 
                        color="bg-blue-500"
                        icon={<FolderOpen size={12}/>} 
                    />
                    <ProgressBar 
                        label="Research Done" 
                        value={metrics.funnel.research} 
                        max={metrics.funnel.projects} 
                        color="bg-indigo-500" 
                        icon={<Zap size={12}/>}
                    />
                    <ProgressBar 
                        label="PRD Generated" 
                        value={metrics.funnel.prd} 
                        max={metrics.funnel.projects} 
                        color="bg-purple-500" 
                        icon={<FileText size={12}/>}
                    />
                    <ProgressBar 
                        label="Tech Design" 
                        value={metrics.funnel.tech} 
                        max={metrics.funnel.projects} 
                        color="bg-fuchsia-500" 
                        icon={<Cpu size={12}/>}
                    />
                    <ProgressBar 
                        label="Kits Exported" 
                        value={metrics.funnel.export} 
                        max={metrics.funnel.projects} 
                        color="bg-emerald-500" 
                        icon={<Package size={12}/>}
                    />
                </div>
            </GlassCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Artifact Distribution (Donut Alternative using CSS Grid/Bars for simplicity without Recharts) */}
            <GlassCard>
                <div className="mb-6">
                    <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                        <PieChart size={18} className="text-purple-400" /> Generation Distribution
                    </h3>
                    <p className="text-xs text-slate-500">Types of content being generated by AI</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Research Reports</div>
                        <div className="text-2xl text-white font-mono">{metrics.distribution.research}</div>
                        <div className="h-1 w-full bg-slate-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(metrics.distribution.research / metrics.generations * 100) || 0}%` }} />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">PRD Docs</div>
                        <div className="text-2xl text-white font-mono">{metrics.distribution.prd}</div>
                        <div className="h-1 w-full bg-slate-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${(metrics.distribution.prd / metrics.generations * 100) || 0}%` }} />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Tech Designs</div>
                        <div className="text-2xl text-white font-mono">{metrics.distribution.tech}</div>
                        <div className="h-1 w-full bg-slate-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${(metrics.distribution.tech / metrics.generations * 100) || 0}%` }} />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Agent Configs</div>
                        <div className="text-2xl text-white font-mono">{metrics.distribution.agent}</div>
                        <div className="h-1 w-full bg-slate-800 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${(metrics.distribution.agent / metrics.generations * 100) || 0}%` }} />
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Live Feed */}
            <GlassCard className="flex flex-col h-[350px]">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                        <Activity size={18} className="text-emerald-400" /> Live Feed
                    </h3>
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {events.map((event) => {
                        let icon = <Activity size={12} />;
                        let color = 'text-slate-400 border-slate-700 bg-slate-900/50';
                        
                        if (event.eventName === 'project_created') {
                            icon = <FolderOpen size={12} />;
                            color = 'text-blue-400 border-blue-500/20 bg-blue-900/20';
                        } else if (event.eventName === 'generation_complete') {
                            icon = <Sparkles size={12} />;
                            color = 'text-purple-400 border-purple-500/20 bg-purple-900/20';
                        } else if (event.eventName === 'export_kit') {
                            icon = <Package size={12} />;
                            color = 'text-emerald-400 border-emerald-500/20 bg-emerald-900/20';
                        } else if (event.eventName === 'persona_selected') {
                            icon = <Users size={12} />;
                            color = 'text-amber-400 border-amber-500/20 bg-amber-900/20';
                        }

                        return (
                            <div key={event.id} className="p-3 rounded-lg border border-white/5 bg-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-md border ${color}`}>
                                        {icon}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-200">{event.eventName.replace('_', ' ')}</span>
                                        <span className="text-slate-500 font-mono text-[10px]">
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                    {event.data?.project ? event.data.project.substring(0, 15) + '...' : 'Unknown Project'}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="text-center text-slate-600 py-10">No recent activity found.</div>
                    )}
                </div>
            </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
};

// Simple icon wrapper for imports
const FolderOpen = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2" /></svg>
);

export default Analytics;