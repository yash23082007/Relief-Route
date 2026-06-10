import React from 'react';
import { ShieldAlert, AlertTriangle, CloudLightning, Info } from 'lucide-react';

export const MissionLog = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
        No operational log entries recorded yet.
      </div>
    );
  }

  const getLogConfig = (type) => {
    switch (type) {
      case 'AI_REROUTED':
        return {
          borderClass: 'border-red-500 bg-red-950/5',
          textClass: 'text-red-400',
          icon: <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
        };
      case 'WEATHER_ALERT':
        return {
          borderClass: 'border-amber-500 bg-amber-950/5',
          textClass: 'text-amber-400',
          icon: <CloudLightning className="h-3.5 w-3.5 text-amber-400" />
        };
      case 'STATUS_CHANGE':
      default:
        return {
          borderClass: 'border-blue-500 bg-blue-950/5',
          textClass: 'text-indigo-400',
          icon: <Info className="h-3.5 w-3.5 text-indigo-400" />
        };
    }
  };

  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
      {events.map((log) => {
        const config = getLogConfig(log.event_type);
        const timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        return (
          <div
            key={log.id}
            className={`p-3 rounded-lg border-l-2 border-y border-r border-slate-800/60 flex items-start space-x-2.5 shadow-sm transition-all duration-300 hover:bg-slate-850/30 ${config.borderClass}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {config.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold font-mono tracking-wider ${config.textClass}`}>
                  {log.convoy_call_sign.toUpperCase()}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {timeStr}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 font-sans leading-relaxed select-text">
                {log.ai_summary}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MissionLog;
