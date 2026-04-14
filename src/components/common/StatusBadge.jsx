import React from 'react';
import { cn } from "@/lib/utils";

const statusStyles = {
  // Stock statuses
  'Available': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10',
  'In Use': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10',
  'Depleted': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Expired': 'bg-red-500/10 text-red-400 border-red-500/20 shadow-sm shadow-red-500/10',
  'Quarantine': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10',
  
  // Batch statuses
  'Released': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10',
  'Rejected': 'bg-red-500/10 text-red-400 border-red-500/20 shadow-sm shadow-red-500/10',
  
  // Material statuses
  'Active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10',
  'Discontinued': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Pending Approval': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10',
  
  // Assembly statuses
  'In Layup': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10',
  'Bagged': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-sm shadow-purple-500/10',
  'In Cure': 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-sm shadow-orange-500/10',
  'Cured': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm shadow-cyan-500/10',
  'Inspected': 'bg-teal-500/10 text-teal-400 border-teal-500/20 shadow-sm shadow-teal-500/10',
  'Scrapped': 'bg-red-500/10 text-red-400 border-red-500/20 shadow-sm shadow-red-500/10',
  
  // Kit statuses
  'Pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10',
  'Ready': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10',
  'Issued': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-sm shadow-purple-500/10',
  'Cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  
  // Transfer statuses
  'In Transit': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10',
  'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-sm",
      style
    )}>
      {status}
    </span>
  );
}