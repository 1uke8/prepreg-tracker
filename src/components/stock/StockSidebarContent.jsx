import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { Plus, MapPin, RotateCcw, History, Copy } from 'lucide-react';

export default function StockSidebarContent({
  sidebarView, editingStock, isEditing, formData, setFormData,
  locations, allColumns, visibleColumns, setVisibleColumns,
  handleColumnDragEnd, handleSave, handleCancelEdit,
  getStockTimeline, getMaterialDescription, getManufactureDate,
  onViewTraceability, stock, transfers, kits
}) {
  const [selectedEvent, setSelectedEvent] = React.useState(null);

  React.useEffect(() => { setSelectedEvent(null); }, [editingStock]);

  if (sidebarView === 'logs') {
    if (!editingStock) return <div className="text-center text-slate-500 mt-20"><p>Select a stock item to view traceability</p></div>;
    const timeline = getStockTimeline(editingStock);
    return (
      <div className="space-y-4">
        {timeline.length > 0 && (
          <Button onClick={onViewTraceability} className="w-full bg-[--primary] hover:bg-[--primary-hover] text-white">
            <History className="h-4 w-4 mr-2" />View Traceability Graph
          </Button>
        )}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Event History</h4>
          {timeline.length > 0 ? (
            <div className="space-y-2">
              {timeline.map((event, idx) => {
                const isSelected = selectedEvent?.index === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedEvent(isSelected ? null : { ...event, index: idx })}
                    className={`rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[--primary]/10 border-[--primary]/50'
                        : event.type === 'created' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' :
                          event.type === 'transfer' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' :
                          event.type === 'relife' ? 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40' : 'bg-cyan-500/5 border-cyan-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 p-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        event.type === 'created' ? 'bg-emerald-500/20' : event.type === 'transfer' ? 'bg-amber-500/20' : event.type === 'relife' ? 'bg-purple-500/20' : 'bg-cyan-500/20'
                      }`}>
                        {event.type === 'created' && <Plus className="h-3 w-3 text-emerald-400" />}
                        {event.type === 'transfer' && <MapPin className="h-3 w-3 text-amber-400" />}
                        {event.type === 'relife' && <RotateCcw className="h-3 w-3 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-slate-200 text-xs font-medium">{event.description}</p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">{format(new Date(event.date), 'dd/MM HH:mm')}</span>
                        </div>
                        {event.type === 'transfer' && <p className="text-[10px] text-slate-400 mt-0.5">{event.from} → {event.to}</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">Qty: {event.quantity} m²</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="px-2.5 pb-2.5 border-t border-slate-700/50 mt-0.5 pt-2">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          <div><p className="text-[10px] text-slate-500 uppercase">Date</p><p className="text-slate-200 text-xs mt-0.5">{format(new Date(event.date), 'dd/MM/yyyy HH:mm')}</p></div>
                          <div><p className="text-[10px] text-slate-500 uppercase">Quantity</p><p className="text-slate-200 text-xs mt-0.5">{event.quantity} m²</p></div>
                          {event.type === 'transfer' && (
                            <>
                              <div><p className="text-[10px] text-slate-500 uppercase">From</p><p className="text-slate-200 text-xs mt-0.5">{event.from}</p></div>
                              <div><p className="text-[10px] text-slate-500 uppercase">To</p><p className="text-slate-200 text-xs mt-0.5">{event.to}</p></div>
                            </>
                          )}
                          {event.type === 'created' && (
                            <>
                              <div><p className="text-[10px] text-slate-500 uppercase">Stock ID</p><p className="text-slate-200 text-xs mt-0.5">{editingStock.stock_id}</p></div>
                              <div><p className="text-[10px] text-slate-500 uppercase">Location</p><p className="text-slate-200 text-xs mt-0.5">{editingStock.location}</p></div>
                              <div><p className="text-[10px] text-slate-500 uppercase">Batch</p><p className="text-slate-200 text-xs mt-0.5">{editingStock.batch_number || '-'}</p></div>
                              <div><p className="text-[10px] text-slate-500 uppercase">Roll</p><p className="text-slate-200 text-xs mt-0.5">{editingStock.roll_number || '-'}</p></div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500"><History className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-xs">No events yet</p></div>
          )}
        </div>

        {kits && (() => {
          const usedInKits = (kits || []).filter(k => k.materials?.some(m => m.stock_id === editingStock.id));
          if (usedInKits.length === 0) return null;
          return (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Used in Kits ({usedInKits.length})</h4>
              <div className="space-y-2">
                {usedInKits.map((kit) => {
                  const matEntry = kit.materials.find(m => m.stock_id === editingStock.id);
                  return (
                    <div key={kit.id} className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2.5">
                      <p className="text-slate-200 text-xs font-medium">{kit.part_number}</p>
                      {kit.order_number && <p className="text-[10px] text-slate-400 mt-0.5">Order: {kit.order_number}</p>}
                      {matEntry && <p className="text-[10px] text-slate-400 mt-0.5">{matEntry.quantity} {matEntry.unit}</p>}
                      <p className="text-[10px] text-slate-500 mt-0.5">{kit.status}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  if (sidebarView === 'settings') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400 mb-4">Drag to reorder, check to show/hide columns</p>
        <DragDropContext onDragEnd={handleColumnDragEnd}>
          <Droppable droppableId="columns">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {allColumns.map((col, index) => (
                  <Draggable key={col.key} draggableId={col.key} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className={`flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 ${snapshot.isDragging ? 'opacity-50 shadow-xl' : ''}`}>
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" /></svg>
                        </div>
                        <Checkbox id={col.key} checked={visibleColumns[col.key]} onCheckedChange={(checked) => { const nv = { ...visibleColumns, [col.key]: checked }; setVisibleColumns(nv); localStorage.setItem('stock_visible_columns', JSON.stringify(nv)); }} className="border-slate-600 data-[state=checked]:bg-[--primary]" />
                        <Label htmlFor={col.key} className="text-slate-300 text-sm cursor-pointer flex-1">{col.header}</Label>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }

  // Details view
  if (!editingStock) return <div className="text-center text-slate-500 mt-20"><p>Select a stock item to view details</p></div>;

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div><Label className="text-slate-300 text-xs">Roll Number</Label><Input value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Location *</Label><Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-slate-700">{locations.filter(l => l.value !== 'all').map(l => <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50">{l.label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-slate-300 text-xs">M²</Label><Input type="number" step="0.01" value={formData.quantity} onChange={(e) => { const area = e.target.value; const w = formData.width_mm; const nd = { ...formData, quantity: area }; if (area && w) nd.length_m = (parseFloat(area) / (parseFloat(w) / 1000)).toFixed(2); setFormData(nd); }} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Width (mm)</Label><Input type="number" step="0.01" value={formData.width_mm} onChange={(e) => { const w = e.target.value; const l = formData.length_m; const nd = { ...formData, width_mm: w }; if (w && l) nd.quantity = (parseFloat(l) * (parseFloat(w) / 1000)).toFixed(2); setFormData(nd); }} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Linear Metres</Label><Input type="number" step="0.01" value={formData.length_m} onChange={(e) => { const l = e.target.value; const w = formData.width_mm; const nd = { ...formData, length_m: l }; if (l && w) nd.quantity = (parseFloat(l) * (parseFloat(w) / 1000)).toFixed(2); setFormData(nd); }} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">DoM</Label><Input type="date" value={formData.manufacture_date} onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Expiry</Label><Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Out Life (hrs)</Label><Input type="number" value={formData.out_life} onChange={(e) => setFormData({ ...formData, out_life: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
        <div><Label className="text-slate-300 text-xs">Notes</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
      </div>
    );
  }

  const copyRow = (text) => { navigator.clipboard.writeText(text); };
  return (
    <div className="space-y-3">
      {[
        ['Stock ID', editingStock.stock_id],
        ['Part Number', editingStock.material_name],
        ['Description', getMaterialDescription(editingStock.material_id)],
        ['Batch', editingStock.batch_number],
        ['Roll', editingStock.roll_number || '-'],
        ['Linear Metres', editingStock.length_m ? `${editingStock.length_m} m` : '-'],
        ['Width', editingStock.width_mm ? `${editingStock.width_mm} mm` : '-'],
        ['M²', editingStock.quantity ? `${editingStock.quantity} m²` : '-'],
        ['DoM', editingStock.manufacture_date ? format(new Date(editingStock.manufacture_date), 'dd/MM/yyyy') : getManufactureDate(editingStock.batch_id) ? format(new Date(getManufactureDate(editingStock.batch_id)), 'dd/MM/yyyy') : '-'],
        ['Expiry', editingStock.expiry_date ? format(new Date(editingStock.expiry_date), 'dd/MM/yyyy') : '-'],
        ['Out Life', editingStock.out_life ? `${editingStock.out_life} hrs` : '-'],
        ['Location', editingStock.location],
        ['Attachments', `${editingStock.attachments?.length || 0} file(s)`],
        ['Notes', editingStock.notes || '-'],
      ].map(([label, value]) => (
        <div key={label}>
          <Label className="text-slate-400 text-xs">{label}</Label>
          <div onClick={() => copyRow(value)} className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors">
            <p className="text-slate-200">{value}</p>
            <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
    </div>
  );
}