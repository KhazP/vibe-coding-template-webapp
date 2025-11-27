import React, { useState, useEffect, useMemo } from 'react';
import { PageTransition, GlassCard, Button } from '../components/UI';
import { BarChart2, Users, PieChart, Activity, RefreshCw, AlertTriangle, ShieldCheck, Download, Database } from 'lucide-react';
import { AnalyticsEvent, Persona } from '../types';
import { supabase } from '../utils/supabaseClient';

const Analytics: React.FC = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Load events from Supabase or Local Storage
  const loadEvents = async () => {
    try {
        let remoteEvents: AnalyticsEvent[] = [];
        let isRemoteConnected = false;

        // Try fetching from Supabase if client exists
        if (supabase) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2000);
                
            if (!error && data) {
                isRemoteConnected = true;
                remoteEvents = data.map((e: any) => ({
                    id: e.id,
                    eventName: e.event_name,
                    timestamp: new Date(e.created_at).getTime(),
                    data: e.metadata
                }));
            } else if (error) {
                console.warn('Supabase Fetch Error:', error.message);
            }
        }

        if (isRemoteConnected) {
            setIsConnected(true);
            setEvents(remoteEvents);
        } else {
            // Fallback to local storage if Supabase failed or isn't configured
            setIsConnected(false);
            const stored = localStorage.getItem('VIBE_ANALYTICS_EVENTS');
            if (stored) {
                // Ensure we parse correctly and perhaps sort by timestamp desc
                const localEvents = JSON.parse(stored) as AnalyticsEvent[];
                localEvents.sort((a, b) => b.timestamp - a.timestamp);
                setEvents(localEvents);
            }
        }
    } catch (e) {
        console.error('Failed to load analytics', e);
        // Final Fallback
        const stored = localStorage.getItem('VIBE_ANALYTICS_EVENTS');
        if (stored) setEvents(JSON.parse(stored));
        setIsConnected(false);
    }
  };

  useEffect(() => {
      loadEvents();
      // Poll for updates every 10 seconds
      const interval = setInterval(loadEvents, 10000);
      return () => clearInterval(interval);
  }, []);

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
      const totalEvents = events.length;
      const totalProjects = events.filter(e => e.eventName === 'project_created').length;
      const totalExports = events.filter(e => e.eventName === 'export_kit').length;
      
      const personaCounts = {
          [Persona.VibeCoder]: 0,
          [Persona.Developer]: 0,
          [Persona.InBetween]: 0
      };

      events.forEach(e => {
          if (e.eventName === 'persona_selected' && e.data?.persona) {
              if (personaCounts[e.data.persona as Persona] !== undefined) {
                  personaCounts[e.data.persona as Persona]++;
              }
          }
      });

      const totalPersonaSelections = Object.values(personaCounts).reduce((a, b) => a + b, 0) || 1; // Avoid div by zero

      return {
          totalEvents,
          totalProjects,
          totalExports,
          personaCounts,
          totalPersonaSelections
      };
  }, [events]);

  const getPercent = (count: number) => ((count / metrics.totalPersonaSelections) * 100).toFixed(1);

  return (
    <PageTransition>
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
                    <Activity className="text-primary-400" /> Admin Analytics
                </h2>
                <p className="text-slate-400">Real-time usage statistics and persona distribution.</p>
            </div>
            
            <div className="flex items-center gap-3">
               <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border ${isConnected ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-amber-950/30 border-amber-500/30 text-amber-400'}`}>
                   <Database size={12} />
                   {isConnected ? 'Supabase Connected' : 'Local Storage Mode'}
               </div>
               <Button onClick={loadEvents} variant="secondary" className="border-white/10 text-slate-300">
                    <RefreshCw size={16} className="mr-2" /> Refresh
               </Button>
            </div>
        </div>

        {/* Disclaimer Banner */}
        {!isConnected && (
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-200">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                    <strong>Connection Issue:</strong> Could not connect to Supabase. Showing local data only. 
                    Ensure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set in your environment variables.
                </div>
            </div>
        )}

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                 <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Events</div>
                 <div className="text-3xl font-mono text-white">{metrics.totalEvents}</div>
             </GlassCard>
             <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                 <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Projects Created</div>
                 <div className="text-3xl font-mono text-primary-400">{metrics.totalProjects}</div>
             </GlassCard>
             <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                 <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Kits Exported</div>
                 <div className="text-3xl font-mono text-emerald-400">{metrics.totalExports}</div>
             </GlassCard>
             <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                 <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Active Personas</div>
                 <div className="text-3xl font-mono text-purple-400">{metrics.totalPersonaSelections}</div>
             </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Persona Distribution Chart */}
            <GlassCard className="h-full">
                <div className="flex items-center gap-2 mb-6">
                    <PieChart size={20} className="text-purple-400" />
                    <h3 className="font-bold text-lg text-slate-200">Persona Distribution</h3>
                </div>
                
                <div className="space-y-6">
                    {/* Vibe Coder Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-fuchsia-400 font-bold">Vibe Coder</span>
                            <span className="text-slate-400">{metrics.personaCounts[Persona.VibeCoder]} users ({getPercent(metrics.personaCounts[Persona.VibeCoder])}%)</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-fuchsia-600 to-purple-600 transition-all duration-1000 ease-out"
                                style={{ width: `${getPercent(metrics.personaCounts[Persona.VibeCoder])}%` }}
                            />
                        </div>
                    </div>

                    {/* Developer Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-emerald-400 font-bold">Developer</span>
                            <span className="text-slate-400">{metrics.personaCounts[Persona.Developer]} users ({getPercent(metrics.personaCounts[Persona.Developer])}%)</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-1000 ease-out"
                                style={{ width: `${getPercent(metrics.personaCounts[Persona.Developer])}%` }}
                            />
                        </div>
                    </div>

                    {/* Learner Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-amber-400 font-bold">In-Between (Learner)</span>
                            <span className="text-slate-400">{metrics.personaCounts[Persona.InBetween]} users ({getPercent(metrics.personaCounts[Persona.InBetween])}%)</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-600 to-orange-600 transition-all duration-1000 ease-out"
                                style={{ width: `${getPercent(metrics.personaCounts[Persona.InBetween])}%` }}
                            />
                        </div>
                    </div>
                </div>
            </GlassCard>

             {/* Recent Activity Feed */}
            <GlassCard className="h-full max-h-[500px] flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart2 size={20} className="text-blue-400" />
                    <h3 className="font-bold text-lg text-slate-200">Recent Global Activity</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {events.map((event) => (
                        <div key={event.id} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors">
                             <div className="flex flex-col">
                                 <span className="font-mono text-primary-300 font-bold uppercase">{event.eventName.replace('_', ' ')}</span>
                                 <span className="text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                             </div>
                             {event.data && Object.keys(event.data).length > 0 && (
                                 <div className="text-right text-slate-400 max-w-[150px] truncate">
                                     {JSON.stringify(event.data)}
                                 </div>
                             )}
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="text-center text-slate-600 py-10">No events found.</div>
                    )}
                </div>
            </GlassCard>
        </div>
        
        <div className="flex justify-center mt-12">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
                <ShieldCheck size={12} />
                <span>Admin View Secure • {isConnected ? 'Live Database' : 'Offline'}</span>
            </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Analytics;