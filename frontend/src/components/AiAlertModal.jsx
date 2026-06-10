import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin, Clock, X, Check } from 'lucide-react';

const AiAlertModal = ({ alert, onClose }) => {
  if (!alert) return null;

  const { convoy, ai_directive } = alert;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-end p-4 md:p-6 overflow-hidden">
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="pointer-events-auto w-full max-w-md bg-[#0a0f1d] border border-red-500/30 rounded-2xl shadow-2xl shadow-red-900/10 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-650/80 to-amber-600/80 p-4 flex items-center justify-between border-b border-red-550/20 text-white relative">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-400/30 flex items-center justify-center animate-pulse">
                <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-xs font-mono tracking-wider">AI COLLISION AVOIDANCE</h3>
                <p className="text-[9px] text-red-200 uppercase font-semibold tracking-wider font-mono">Immediate Detour Vector Generated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Top red danger bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            
            {/* Alert Details */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">Endangered Fleet</span>
                <span className="font-bold font-mono text-sm text-slate-200 uppercase">{convoy.call_sign}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block uppercase">Dispatched Cargo</span>
                <span className="font-semibold text-xs text-slate-300">{convoy.cargo_type}</span>
              </div>
            </div>

            {/* AI Detour Advice Card */}
            <div className="bg-red-950/10 border border-red-900/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
              {/* background grid */}
              <div className="absolute inset-0 opacity-5 pointer-events-none"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(239, 68, 68, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.2) 1px, transparent 1px)',
                     backgroundSize: '10px 10px'
                   }}
              />
              
              <div className="flex items-start space-x-3 relative z-10">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mt-0.5">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold font-mono text-red-400 uppercase tracking-widest">MITIGATION ROUTE DECISION</span>
                  <p className="font-bold text-sm text-red-300 mt-0.5 glow-text-red">
                    {ai_directive.recommended_action || ai_directive.recommended_detour}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 border-t border-red-900/10 pt-3 relative z-10">
                <div className="p-2 rounded-lg bg-amber-550/10 border border-amber-500/20 text-amber-400 mt-0.5">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold font-mono text-amber-400 uppercase tracking-widest">ETA DEBIASING IMPACT</span>
                  <p className="font-bold text-sm text-amber-300 mt-0.5 font-mono">
                    +{ai_directive.estimated_delay_hours !== undefined ? `${ai_directive.estimated_delay_hours} Hours` : `${ai_directive.estimated_delay_minutes} Minutes`} Delay
                  </p>
                </div>
              </div>
            </div>

            {/* Tactical Summary Brief */}
            <div className="space-y-1 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">TACTICAL RISK ASSESSMENT</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
                {ai_directive.mitigation_brief || ai_directive.tactical_summary}
              </p>
            </div>
            
            {/* Warning Callout */}
            <p className="text-[9px] text-slate-500 leading-tight">
              ⚠️ Rerouting instructions generated by Gemini logistics model. Always coordinate with localized maritime channels before execution.
            </p>

            {/* Actions */}
            <div className="pt-2 flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold font-mono text-xs rounded-lg transition"
              >
                DISMISS
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold font-mono text-xs rounded-lg shadow-lg shadow-red-650/20 flex items-center justify-center space-x-1.5 transition"
              >
                <Check className="h-4 w-4" />
                <span>APPLY DETOUR</span>
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiAlertModal;
