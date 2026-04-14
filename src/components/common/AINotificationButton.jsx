import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, RefreshCw, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  info:     { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  ok:       { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
};

export default function AINotificationButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: () => base44.entities.Stock.list() });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => base44.entities.Material.list() });
  const { data: kits = [] } = useQuery({ queryKey: ['kits'], queryFn: () => base44.entities.Kit.list() });
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: () => base44.entities.Batch.list() });

  const buildContextSummary = () => {
    const today = new Date();
    const activeStock = stock.filter(s => !s.archived);

    // Expiry analysis
    const expiryData = activeStock
      .filter(s => s.expiry_date)
      .map(s => {
        const days = differenceInDays(parseISO(s.expiry_date), today);
        return { ...s, daysToExpiry: days };
      })
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    const expired = expiryData.filter(s => s.daysToExpiry < 0);
    const critical = expiryData.filter(s => s.daysToExpiry >= 0 && s.daysToExpiry <= 7);
    const warning = expiryData.filter(s => s.daysToExpiry > 7 && s.daysToExpiry <= 30);

    // Kit status
    const pendingKits = kits.filter(k => !k.archived && k.status === 'Pending');
    const inProgressKits = kits.filter(k => !k.archived && k.status === 'In Progress');
    const kitsNearCure = kits
      .filter(k => !k.archived && k.cure_by_date && ['Pending', 'In Progress'].includes(k.status))
      .map(k => ({ ...k, daysToCure: differenceInDays(parseISO(k.cure_by_date), today) }))
      .filter(k => k.daysToCure <= 3)
      .sort((a, b) => a.daysToCure - b.daysToCure);

    // Low stock materials
    const materialStockCount = {};
    activeStock.forEach(s => {
      if (s.material_id) materialStockCount[s.material_id] = (materialStockCount[s.material_id] || 0) + 1;
    });
    const zeroStockMaterials = materials.filter(m => !materialStockCount[m.id]);
    const lowStockMaterials = materials.filter(m => materialStockCount[m.id] === 1);

    // Batch quarantine
    const quarantineBatches = batches.filter(b => b.status === 'Quarantine');

    return {
      today: format(today, 'dd MMM yyyy'),
      totalActiveStock: activeStock.length,
      expiredItems: expired.slice(0, 5).map(s => `${s.material_name} (${s.stock_id}, ${Math.abs(s.daysToExpiry)} days ago)`),
      criticalExpiry: critical.slice(0, 5).map(s => `${s.material_name} (${s.stock_id}, ${s.daysToExpiry} days)`),
      soonExpiry: warning.slice(0, 5).map(s => `${s.material_name} (${s.stock_id}, ${s.daysToExpiry} days)`),
      pendingKitCount: pendingKits.length,
      inProgressKitCount: inProgressKits.length,
      kitsUrgentCure: kitsNearCure.slice(0, 3).map(k => `Kit ${k.part_number} (${k.daysToCure < 0 ? 'overdue' : `${k.daysToCure}d`})`),
      zeroStockMaterials: zeroStockMaterials.slice(0, 5).map(m => m.part_number),
      lowStockMaterials: lowStockMaterials.slice(0, 5).map(m => m.part_number),
      quarantineBatchCount: quarantineBatches.length,
      quarantineBatches: quarantineBatches.slice(0, 3).map(b => b.batch_number),
    };
  };

  const generateNotifications = async () => {
    setLoading(true);
    const ctx = buildContextSummary();

    const prompt = `You are an AI assistant for a composite materials inventory management system. 
Today is ${ctx.today}. Analyse this inventory snapshot and return actionable notifications.

INVENTORY SNAPSHOT:
- Total active stock items: ${ctx.totalActiveStock}
- EXPIRED items (past expiry date): ${ctx.expiredItems.length > 0 ? ctx.expiredItems.join(', ') : 'None'}
- CRITICAL expiry (within 7 days): ${ctx.criticalExpiry.length > 0 ? ctx.criticalExpiry.join(', ') : 'None'}
- Expiring soon (8-30 days): ${ctx.soonExpiry.length > 0 ? ctx.soonExpiry.join(', ') : 'None'}
- Kits Pending: ${ctx.pendingKitCount}, In Progress: ${ctx.inProgressKitCount}
- Kits with urgent cure dates (≤3 days): ${ctx.kitsUrgentCure.length > 0 ? ctx.kitsUrgentCure.join(', ') : 'None'}
- Materials with ZERO stock: ${ctx.zeroStockMaterials.length > 0 ? ctx.zeroStockMaterials.join(', ') : 'None'}
- Materials with only 1 roll left: ${ctx.lowStockMaterials.length > 0 ? ctx.lowStockMaterials.join(', ') : 'None'}
- Batches in Quarantine: ${ctx.quarantineBatchCount} (${ctx.quarantineBatches.join(', ') || 'N/A'})

Generate 3-6 concise, actionable notifications. Each must be directly relevant to what the data shows.
Only include notifications for issues that actually exist (non-empty arrays, counts > 0).
If everything looks good, include a positive status notification.

Return JSON array with objects: { "severity": "critical"|"warning"|"info"|"ok", "title": "short title", "message": "1-2 sentence actionable message" }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          notifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string' },
                title: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setNotifications(result.notifications || []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // Auto-run on mount (once data is loaded) and refresh every 30 minutes
  useEffect(() => {
    if (stock.length === 0 && materials.length === 0) return;
    generateNotifications();
    const interval = setInterval(generateNotifications, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stock.length > 0, materials.length > 0]);

  const handleOpen = () => {
    setOpen(true);
  };

  const criticalCount = notifications?.filter(n => n.severity === 'critical').length || 0;
  const warningCount = notifications?.filter(n => n.severity === 'warning').length || 0;
  const badgeCount = criticalCount + warningCount;

  return (
    <div className="relative">
      {/* Nav Bell Button */}
      <button
        onClick={() => open ? setOpen(false) : handleOpen()}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors relative ${open ? 'bg-[--primary] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
        title="AI Notifications"
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 shadow">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[--primary]" />
                <span className="text-slate-100 font-semibold text-sm">AI Alerts</span>
                {lastUpdated && (
                  <span className="text-xs text-slate-500">· {format(lastUpdated, 'HH:mm')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateNotifications}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-8 w-8 rounded-full border-4 border-[--primary] border-t-transparent animate-spin" />
                  <p className="text-slate-400 text-sm">Analysing inventory...</p>
                </div>
              ) : notifications && notifications.length > 0 ? (
                notifications.map((n, i) => {
                  const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${cfg.color}`}>{n.title}</p>
                          <p className="text-slate-300 text-xs mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : notifications && notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">No alerts at this time.</div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center">AI-generated · Based on live inventory data</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}