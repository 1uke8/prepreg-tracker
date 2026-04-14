import React from 'react';
import { X } from 'lucide-react';

/**
 * A slide-up sheet for mobile detail views.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   title: string
 *   navItems: [{ icon: ReactNode, label: string, active: boolean, onClick: () => void }]
 *   children: ReactNode
 */
export default function MobileDetailSheet({ open, onClose, title, navItems, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 rounded-t-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-slate-100 font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav icons */}
        {navItems && navItems.length > 0 && (
          <div className="flex gap-1 px-4 py-2 border-b border-slate-700/50">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                title={item.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  item.active
                    ? 'bg-[--primary] text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}