import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '../components/common/StatusBadge';
import { Plus, Copy, CheckCircle2, ChevronDown, MoreVertical, Download, Edit, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, subDays } from 'date-fns';
import { jsPDF } from 'jspdf';

const getLocations = () => {
  const saved = localStorage.getItem('server_locations');
  const defaultLocations = [
    { name: 'Freezer A', isFreezer: true },
    { name: 'Freezer B', isFreezer: true },
    { name: 'Freezer C', isFreezer: true },
    { name: 'Clean Room', isFreezer: false },
    { name: 'Layup Area', isFreezer: false },
    { name: 'Cure Area', isFreezer: false }
  ];
  const locations = saved ? JSON.parse(saved) : defaultLocations;
  return locations.map(loc => {
    const name = typeof loc === 'string' ? loc : loc.name;
    return { value: name, label: name };
  });
};

const getTransferReasons = () => {
  const saved = localStorage.getItem('server_transfer_reasons');
  const defaultReasons = ['Production', 'Inspection', 'Rework', 'Return to Freezer', 'Disposal'];
  const reasons = saved ? JSON.parse(saved) : defaultReasons;
  return reasons.map(reason => ({ value: reason, label: reason }));
};

const statusOptions = [
  { value: 'all', label: 'Any Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Transit', label: 'In Transit' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function Transfer() {
  const queryClient = useQueryClient();
  const [locations, setLocations] = useState(getLocations());
  const [reasons, setReasons] = useState(getTransferReasons());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedTransfer, setExpandedTransfer] = useState(null);
  const [showOldCompleted, setShowOldCompleted] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [formData, setFormData] = useState({
    item_type: 'stock',
    stock_ids: [],
    kit_ids: [],
    to_location: '',
    reason: 'Production',
    custom_reason: '',
    transferred_by: '',
    status: 'Pending',
    notes: ''
  });
  const [rollSearch, setRollSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list(), // base44Client already orders by created_at desc
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['stock'],
    queryFn: () => base44.entities.Stock.list(),
  });

  const { data: kits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => base44.entities.Kit.list(),
  });

  React.useEffect(() => {
    const handleStorageChange = () => {
      setLocations(getLocations());
      setReasons(getTransferReasons());
    };
    window.addEventListener('settingsUpdated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('settingsUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create transfer record
      const transfer = await base44.entities.Transfer.create(data);
      
      // Update stock location if transfer is completed
      if (data.status === 'Completed' && data.stock_id) {
        const stockItem = stock.find(s => s.id === data.stock_id);
        if (stockItem) {
          await base44.entities.Stock.update(data.stock_id, {
            location: data.to_location
          });
        }
      }
      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Transfer recorded successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Transfer.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setDialogOpen(false);
      setEditingTransfer(null);
      resetForm();
      toast.success('Transfer updated successfully');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (transferIds) => {
      for (const id of transferIds) {
        await base44.entities.Transfer.update(id, { status: 'Cancelled' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer(s) cancelled');
    },
  });

  const resetForm = () => {
    setFormData({
      item_type: 'stock',
      stock_ids: [],
      kit_ids: [],
      to_location: '',
      reason: 'Production',
      custom_reason: '',
      transferred_by: '',
      status: 'Pending',
      notes: ''
    });
    setRollSearch('');
    setSortBy('newest');
  };

  const handleAdd = () => {
    resetForm();
    setEditingTransfer(null);
    setDialogOpen(true);
  };

  const handleEdit = (transfer) => {
    setEditingTransfer(transfer);
    
    if (transfer.isGroup) {
      // For group transfers, use common data from first item
      const firstItem = transfer.items[0];
      setFormData({
        item_type: firstItem.item_type || 'stock',
        stock_ids: [],
        kit_ids: [],
        to_location: firstItem.to_location || '',
        reason: firstItem.reason || 'Production',
        custom_reason: '',
        transferred_by: firstItem.transferred_by || '',
        status: firstItem.status || 'Pending',
        notes: firstItem.notes || ''
      });
    } else {
      setFormData({
        item_type: transfer.item_type || 'stock',
        stock_ids: transfer.stock_id ? [transfer.stock_id] : [],
        kit_ids: transfer.kit_id ? [transfer.kit_id] : [],
        to_location: transfer.to_location || '',
        reason: transfer.reason || 'Production',
        custom_reason: '',
        transferred_by: transfer.transferred_by || '',
        status: transfer.status || 'Pending',
        notes: transfer.notes || ''
      });
    }
    setDialogOpen(true);
  };

  const handleCancel = (transfer) => {
    if (transfer.isGroup) {
      cancelMutation.mutate(transfer.items.map(i => i.id));
    } else {
      cancelMutation.mutate([transfer.id]);
    }
  };

  const exportToPDF = (transfer) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Transfer Document', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Transfer #: ${transfer.transfer_number || transfer.group_id}`, 20, 30);
    doc.text(`Date: ${transfer.transfer_date ? format(new Date(transfer.transfer_date), 'dd/MM/yyyy HH:mm') : '-'}`, 20, 36);
    doc.text(`Status: ${transfer.status || 'Completed'}`, 20, 42);
    
    // Details
    doc.setFontSize(12);
    doc.text('Transfer Details', 20, 55);
    
    doc.setFontSize(10);
    let y = 65;
    
    if (transfer.isGroup) {
      doc.text(`Group Transfer - ${transfer.items.length} Items`, 20, y);
      y += 10;
      
      transfer.items.forEach((item, idx) => {
        const stockItem = stock.find(s => s.id === item.stock_id);
        const kitItem = kits.find(k => k.id === item.kit_id);
        
        if (stockItem) {
          doc.text(`${idx + 1}. ${stockItem.material_name} (Roll: ${stockItem.roll_number})`, 25, y);
          y += 5;
          doc.text(`   From: ${item.from_location} → To: ${item.to_location}`, 25, y);
          y += 5;
          doc.text(`   Batch: ${stockItem.batch_number}`, 25, y);
          y += 8;
        } else if (kitItem) {
          doc.text(`${idx + 1}. Kit: ${kitItem.part_number}`, 25, y);
          y += 5;
          doc.text(`   From: ${item.from_location} → To: ${item.to_location}`, 25, y);
          y += 8;
        }
      });
    } else {
      const stockItem = stock.find(s => s.id === transfer.stock_id);
      const kitItem = kits.find(k => k.id === transfer.kit_id);
      
      doc.text(`Material: ${transfer.material_name}`, 20, y);
      y += 6;
      doc.text(`From: ${transfer.from_location} → To: ${transfer.to_location}`, 20, y);
      y += 6;
      
      if (stockItem) {
        if (stockItem.batch_number) {
          doc.text(`Batch: ${stockItem.batch_number}`, 20, y);
          y += 6;
        }
        if (stockItem.roll_number) {
          doc.text(`Roll: ${stockItem.roll_number}`, 20, y);
          y += 6;
        }
      }
    }
    
    if (transfer.reason) {
      doc.text(`Reason: ${transfer.reason}`, 20, y);
      y += 6;
    }
    
    if (transfer.transferred_by) {
      doc.text(`Transferred By: ${transfer.transferred_by}`, 20, y);
      y += 6;
    }
    
    if (transfer.notes) {
      doc.text(`Notes: ${transfer.notes}`, 20, y);
    }
    
    // Save
    doc.save(`Transfer-${transfer.transfer_number || transfer.group_id}.pdf`);
    toast.success('PDF exported');
  };

  const handleItemToggle = (itemId) => {
    if (formData.item_type === 'stock') {
      const isSelected = formData.stock_ids.includes(itemId);
      const newStockIds = isSelected 
        ? formData.stock_ids.filter(id => id !== itemId)
        : [...formData.stock_ids, itemId];
      
      setFormData({
        ...formData,
        stock_ids: newStockIds
      });
    } else {
      const isSelected = formData.kit_ids.includes(itemId);
      const newKitIds = isSelected 
        ? formData.kit_ids.filter(id => id !== itemId)
        : [...formData.kit_ids, itemId];
      
      setFormData({
        ...formData,
        kit_ids: newKitIds
      });
    }
  };

  const markAsComplete = useMutation({
    mutationFn: async (transferIds) => {
      for (const id of transferIds) {
        const transfer = transfers.find(t => t.id === id);
        if (transfer) {
          const stockItem = stock.find(s => s.id === transfer.stock_id);
          const toLocation = transfer.to_location;
          const isToFreezer = locations.find(l => l.value === toLocation)?.isFreezer || toLocation.toLowerCase().includes('freezer');
          const fromLocation = transfer.from_location;
          const isFromFreezer = locations.find(l => l.value === fromLocation)?.isFreezer || fromLocation.toLowerCase().includes('freezer');
          
          await base44.entities.Transfer.update(id, {
            status: 'Completed',
            out_time_end: !isToFreezer && isFromFreezer ? new Date().toISOString() : transfer.out_time_end,
            out_time_start: transfer.out_time_start || (!isFromFreezer && isToFreezer ? null : new Date().toISOString())
          });
          
          if (stockItem) {
            await base44.entities.Stock.update(transfer.stock_id, {
              location: toLocation
            });
          }
          
          // Update kit status and location if transfer is for a kit
          if (transfer.kit_id) {
            const newStatus = isToFreezer ? 'Pending' : 'In Progress';
            await base44.entities.Kit.update(transfer.kit_id, { location: toLocation, status: newStatus });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Transfer(s) marked as complete');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingTransfer) {
      // Update existing transfer(s)
      const finalReason = formData.reason === 'Custom' ? formData.custom_reason : formData.reason;
      const updateData = {
        to_location: formData.to_location,
        reason: finalReason,
        transferred_by: formData.transferred_by,
        status: formData.status,
        notes: formData.notes
      };
      
      if (editingTransfer.isGroup) {
        // Update all transfers in the group
        for (const item of editingTransfer.items) {
          await updateMutation.mutateAsync({
            id: item.id,
            data: updateData
          });
        }
      } else {
        await updateMutation.mutateAsync({
          id: editingTransfer.id,
          data: updateData
        });
      }
    } else {
      // Create new transfer(s)
      const itemIds = formData.item_type === 'stock' ? formData.stock_ids : formData.kit_ids;
      const groupId = itemIds.length > 1 ? `GRP-${Date.now().toString(36).toUpperCase()}` : null;
      const finalReason = formData.reason === 'Custom' ? formData.custom_reason : formData.reason;
      
      for (const itemId of itemIds) {
        const item = formData.item_type === 'stock' 
          ? stock.find(s => s.id === itemId)
          : kits.find(k => k.id === itemId);
        
        const fromLocation = item?.location || '';
        const toLocation = formData.to_location;
        
        const isFromFreezer = locations.find(l => l.value === fromLocation)?.isFreezer || fromLocation.toLowerCase().includes('freezer');
        const isToFreezer = locations.find(l => l.value === toLocation)?.isFreezer || toLocation.toLowerCase().includes('freezer');
        
        const data = {
          transfer_number: `TRF-${Date.now().toString(36).toUpperCase()}`,
          group_id: groupId,
          item_type: formData.item_type,
          stock_id: formData.item_type === 'stock' ? itemId : null,
          kit_id: formData.item_type === 'kit' ? itemId : null,
          material_name: formData.item_type === 'stock' ? item?.material_name || '' : item?.part_number || '',
          batch_number: formData.item_type === 'stock' ? item?.batch_number || '' : '',
          from_location: fromLocation,
          to_location: toLocation,
          transfer_date: new Date().toISOString(),
          out_time_start: isFromFreezer && !isToFreezer ? new Date().toISOString() : null,
          out_time_end: null,
          reason: finalReason,
          transferred_by: formData.transferred_by,
          status: formData.status,
          notes: formData.notes
        };
        await createMutation.mutateAsync(data);
        
        // Update kit status based on location
        if (formData.item_type === 'kit' && formData.status === 'Completed') {
          const newStatus = isToFreezer ? 'Pending' : 'In Progress';
          await base44.entities.Kit.update(itemId, { location: toLocation, status: newStatus });
        }
      }
      
      setDialogOpen(false);
      resetForm();
      toast.success(`${itemIds.length} transfer(s) created`);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (!t.transfer_number?.toLowerCase().includes(searchLower) &&
          !t.material_name?.toLowerCase().includes(searchLower) &&
          !t.batch_number?.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });

  // Group transfers by group_id
  const groupTransfers = (transfersList) => {
    const groups = {};
    const ungrouped = [];
    
    transfersList.forEach(transfer => {
      if (transfer.group_id) {
        if (!groups[transfer.group_id]) {
          groups[transfer.group_id] = [];
        }
        groups[transfer.group_id].push(transfer);
      } else {
        ungrouped.push(transfer);
      }
    });
    
    // Convert groups to array format
    const groupedItems = Object.entries(groups).map(([groupId, items]) => ({
      isGroup: true,
      group_id: groupId,
      items: items,
      // Use first item for display data
      ...items[0],
      material_name: `${items.length} items`
    }));
    
    return [...groupedItems, ...ungrouped];
  };

  const plannedTransfers = groupTransfers(filteredTransfers.filter(t => t.status === 'Pending' || t.status === 'In Transit'));
  
  // Filter completed transfers - hide those older than 30 days unless showOldCompleted is true
  const thirtyDaysAgo = subDays(new Date(), 30);
  const allCompletedTransfers = groupTransfers(filteredTransfers.filter(t => t.status === 'Completed' || t.status === 'Cancelled'));
  const recentCompletedTransfers = allCompletedTransfers.filter(t => {
    const transferDate = new Date(t.transfer_date || t.created_date);
    return transferDate >= thirtyDaysAgo;
  });
  const completedTransfers = showOldCompleted ? allCompletedTransfers : recentCompletedTransfers;
  const hasOldCompleted = allCompletedTransfers.length > recentCompletedTransfers.length;

  const TransferRow = ({ transfer, isGroup }) => {
    const isExpanded = expandedTransfer === (isGroup ? transfer.group_id : transfer.id);
    const canComplete = transfer.status === 'Pending' || transfer.status === 'In Transit';
    const canEdit = transfer.status === 'Pending' || transfer.status === 'In Transit';
    
    return (
      <div className="bg-[--bg-card] border border-[--border-color] rounded-lg overflow-hidden hover:border-[--primary]/30 transition-all">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div>
                <Label className="text-[--text-muted] text-xs">{isGroup ? 'Group ID' : 'Transfer #'}</Label>
                <div 
                  onClick={(e) => { 
                    e.stopPropagation();
                    navigator.clipboard.writeText(isGroup ? transfer.group_id : transfer.transfer_number); 
                    toast.success('Copied'); 
                  }}
                  className="flex items-center gap-1.5 mt-1 cursor-pointer group/copy hover:text-[--primary] transition-colors"
                >
                  <p className="text-[--text-primary] text-sm font-medium">{isGroup ? transfer.group_id : transfer.transfer_number}</p>
                  <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                </div>
              </div>
              <div>
                <Label className="text-[--text-muted] text-xs">Material</Label>
                <p className="text-[--text-primary] text-sm mt-1">{transfer.material_name}</p>
              </div>
              <div>
                <Label className="text-[--text-muted] text-xs">Reason</Label>
                <p className="text-[--text-primary] text-sm mt-1">{transfer.reason}</p>
              </div>
              <div>
                <Label className="text-[--text-muted] text-xs">Date</Label>
                <p className="text-[--text-primary] text-sm mt-1">{transfer.transfer_date ? format(new Date(transfer.transfer_date), 'dd/MM/yy HH:mm') : '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusBadge status={transfer.status || 'Completed'} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[--bg-card] border-[--border-color]" align="end">
                  {canComplete && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (isGroup) {
                          markAsComplete.mutate(transfer.items.map(i => i.id));
                        } else {
                          markAsComplete.mutate([transfer.id]);
                        }
                      }}
                      className="text-emerald-400 focus:bg-emerald-500/10 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem 
                      onClick={() => handleEdit(transfer)}
                      className="text-[--text-secondary] focus:bg-[--bg-card-hover] cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => exportToPDF(transfer)}
                    className="text-[--text-secondary] focus:bg-[--bg-card-hover] cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem 
                      onClick={() => handleCancel(transfer)}
                      className="text-red-400 focus:bg-red-500/10 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setExpandedTransfer(isExpanded ? null : (isGroup ? transfer.group_id : transfer.id))}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-[--border-light] space-y-4">
              {isGroup && (
                <div className="bg-[--primary]/10 border border-[--primary]/20 rounded-lg p-3">
                  <Label className="text-[--primary] text-xs font-semibold">GROUP TRANSFER - {transfer.items.length} ITEMS</Label>
                  <div className="mt-3 space-y-2">
                    {transfer.items.map((item, idx) => {
                      const stockItem = stock.find(s => s.id === item.stock_id);
                      const kitItem = kits.find(k => k.id === item.kit_id);
                      const displayItem = stockItem || kitItem;
                      return displayItem ? (
                        <div key={idx} className="bg-[--bg-darker] rounded p-2 text-xs">
                        <p className="text-[--text-secondary] font-medium">
                          {stockItem ? `${stockItem.material_name} (Roll: ${stockItem.roll_number})` : kitItem?.part_number}
                        </p>
                        <p className="text-[--text-muted]">
                          {stockItem ? `Batch: ${stockItem.batch_number}` : kitItem?.description}
                        </p>
                        <p className="text-[--text-muted] mt-1">
                          {item.from_location} → {item.to_location}
                        </p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {!isGroup && (() => {
                const stockItem = stock.find(s => s.id === transfer.stock_id);
                const kitItem = kits.find(k => k.id === transfer.kit_id);
                const displayItem = stockItem || kitItem;
                return displayItem && (
                  <div className="bg-[--bg-card-hover] border border-[--border-light] rounded-lg p-3 space-y-2">
                    <Label className="text-[--text-muted] text-xs font-semibold">{stockItem ? 'Stock Details' : 'Kit Details'}</Label>
                    {stockItem && (
                      <>
                        <div>
                          <Label className="text-[--text-muted] text-xs">Stock ID</Label>
                          <div 
                            onClick={() => { navigator.clipboard.writeText(stockItem.stock_id); toast.success('Copied'); }}
                            className="flex items-center gap-1.5 mt-1 cursor-pointer group/copy hover:text-[--primary] transition-colors"
                          >
                            <p className="text-[--text-primary] text-sm">{stockItem.stock_id}</p>
                            <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {stockItem.roll_number && (
                          <div>
                            <Label className="text-[--text-muted] text-xs">Roll</Label>
                            <p className="text-[--text-primary] text-sm mt-1">{stockItem.roll_number}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-[--text-muted] text-xs">Batch</Label>
                          <p className="text-[--text-primary] text-sm mt-1">{stockItem.batch_number}</p>
                        </div>
                        <div>
                          <Label className="text-[--text-muted] text-xs">Location</Label>
                          <p className="text-[--text-primary] text-sm mt-1">{transfer.from_location} → {transfer.to_location}</p>
                        </div>
                      </>
                    )}
                    {kitItem && (
                      <>
                        <div>
                          <Label className="text-[--text-muted] text-xs">Part Number</Label>
                          <p className="text-[--text-primary] text-sm mt-1">{kitItem.part_number}</p>
                        </div>
                        <div>
                          <Label className="text-[--text-muted] text-xs">Description</Label>
                          <p className="text-[--text-primary] text-sm mt-1">{kitItem.description}</p>
                        </div>
                        <div>
                          <Label className="text-[--text-muted] text-xs">Location</Label>
                          <p className="text-[--text-primary] text-sm mt-1">{transfer.from_location} → {transfer.to_location}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              
              {transfer.transferred_by && (
                <div>
                  <Label className="text-[--text-muted] text-xs">Transferred By</Label>
                  <p className="text-[--text-primary] text-sm mt-1">{transfer.transferred_by}</p>
                </div>
              )}
              
              {(transfer.out_time_start || transfer.out_time_end) && (
                <div className="bg-[--bg-card-hover] border border-[--border-light] rounded-lg p-3">
                  <Label className="text-[--text-muted] text-xs mb-2 block">Out Time Tracking</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {transfer.out_time_start && (
                      <div>
                        <Label className="text-[--text-muted] text-xs">Start</Label>
                        <p className="text-[--text-primary] text-sm mt-1">
                          {format(new Date(transfer.out_time_start), 'dd/MM/yy HH:mm')}
                        </p>
                      </div>
                    )}
                    {transfer.out_time_end && (
                      <div>
                        <Label className="text-[--text-muted] text-xs">End</Label>
                        <p className="text-[--text-primary] text-sm mt-1">
                          {format(new Date(transfer.out_time_end), 'dd/MM/yy HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {transfer.notes && (
                <div>
                  <Label className="text-[--text-muted] text-xs">Notes</Label>
                  <p className="text-[--text-primary] text-sm mt-1">{transfer.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="h-full bg-[--bg-dark] p-4 md:p-6 overflow-auto">
        {/* Toolbar */}
         <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-6">
          <Button 
            onClick={handleAdd}
            size="sm"
            className="bg-[--primary] hover:bg-[--primary-hover] text-white w-full md:w-auto"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="relative w-full md:w-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Transfer #, Material or Batch"
              className="w-full md:w-80 bg-[--bg-card-hover] border-[--border-color] text-[--text-primary] h-9 focus:border-[--primary] focus:ring-1 focus:ring-[--primary]/20"
            />
          </div>
        </div>

        {/* Planned Transfers */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[--text-primary] mb-3">Planned Transfers</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 bg-[--bg-card] rounded-lg border border-[--border-color]">
                <div className="flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent"></div>
                </div>
              </div>
            ) : plannedTransfers.length === 0 ? (
              <div className="text-center py-12 bg-[--bg-card] rounded-lg border border-[--border-color] text-[--text-muted]">
                No planned transfers
              </div>
            ) : (
              plannedTransfers.map((transfer) => (
                <TransferRow 
                  key={transfer.isGroup ? transfer.group_id : transfer.id} 
                  transfer={transfer} 
                  isGroup={transfer.isGroup}
                />
              ))
            )}
          </div>
        </div>

        {/* Completed Transfers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[--text-primary]">Completed Transfers</h2>
            {hasOldCompleted && (
              <Button
                onClick={() => setShowOldCompleted(!showOldCompleted)}
                size="sm"
                variant="outline"
                className="border-[--border-color] text-[--text-secondary] hover:bg-[--bg-card-hover]"
              >
                {showOldCompleted ? 'Hide Old Transfers' : `Show ${allCompletedTransfers.length - recentCompletedTransfers.length} Older`}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 bg-[--bg-card] rounded-lg border border-[--border-color]">
                <div className="flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent"></div>
                </div>
              </div>
            ) : completedTransfers.length === 0 ? (
              <div className="text-center py-12 bg-[--bg-card] rounded-lg border border-[--border-color] text-[--text-muted]">
                No completed transfers
              </div>
            ) : (
              completedTransfers.map((transfer) => (
                <TransferRow 
                  key={transfer.isGroup ? transfer.group_id : transfer.id} 
                  transfer={transfer} 
                  isGroup={transfer.isGroup}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[--bg-card] border-[--border-color] text-[--text-primary] max-w-2xl w-full mx-4 md:mx-0">
          <DialogHeader>
            <DialogTitle>{editingTransfer ? 'Edit Transfer' : 'New Transfer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-4">
              {!editingTransfer && (
                <div>
                  <Label className="text-[--text-secondary] mb-2 block">Transfer Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, item_type: 'stock', kit_ids: [] })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.item_type === 'stock'
                          ? 'bg-[--primary] text-white'
                          : 'bg-[--bg-darker] text-[--text-muted] hover:text-[--text-secondary] border border-[--border-color]'
                      }`}
                    >
                      Stock Rolls
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, item_type: 'kit', stock_ids: [] })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.item_type === 'kit'
                          ? 'bg-[--primary] text-white'
                          : 'bg-[--bg-darker] text-[--text-muted] hover:text-[--text-secondary] border border-[--border-color]'
                      }`}
                    >
                      Kits
                    </button>
                  </div>
                </div>
              )}

              {!editingTransfer && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[--text-secondary]">Select Items to Transfer *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={rollSearch}
                      onChange={(e) => setRollSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-48 bg-[--bg-darker] border-[--border-color] text-[--text-primary] h-8 text-sm"
                    />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-32 bg-[--bg-darker] border-[--border-color] text-[--text-primary] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[--bg-card] border-[--border-color]">
                        <SelectItem value="newest" className="text-[--text-secondary] focus:bg-[--bg-card-hover]">Newest</SelectItem>
                        <SelectItem value="oldest" className="text-[--text-secondary] focus:bg-[--bg-card-hover]">Oldest</SelectItem>
                        <SelectItem value="location" className="text-[--text-secondary] focus:bg-[--bg-card-hover]">Location</SelectItem>
                        <SelectItem value="material" className="text-[--text-secondary] focus:bg-[--bg-card-hover]">Material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-[--bg-darker] border border-[--border-color] rounded-lg p-3 max-h-96 overflow-y-auto space-y-2">
                  {formData.item_type === 'stock' ? (
                    (() => {
                      let items = stock.filter(s => !s.archived && s.status !== 'Depleted');
                      
                      // Filter by search
                      if (rollSearch) {
                        const search = rollSearch.toLowerCase();
                        items = items.filter(s => 
                          s.material_name?.toLowerCase().includes(search) ||
                          s.roll_number?.toLowerCase().includes(search) ||
                          s.batch_number?.toLowerCase().includes(search) ||
                          s.location?.toLowerCase().includes(search)
                        );
                      }
                      
                      // Sort items
                      if (sortBy === 'newest') {
                        items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                      } else if (sortBy === 'oldest') {
                        items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                      } else if (sortBy === 'location') {
                        items.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
                      } else if (sortBy === 'material') {
                        items.sort((a, b) => (a.material_name || '').localeCompare(b.material_name || ''));
                      }
                      
                      return items.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-[--bg-card-hover] p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.stock_ids.includes(s.id)}
                            onChange={() => handleItemToggle(s.id)}
                            className="w-4 h-4 text-[--primary]"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-[--text-secondary] font-medium">
                              {s.material_name} {s.roll_number && `(Roll: ${s.roll_number})`}
                            </div>
                            <div className="text-xs text-[--text-muted]">
                              Batch: {s.batch_number} • {s.location}
                            </div>
                          </div>
                        </label>
                      ));
                    })()
                  ) : (
                    (() => {
                      let items = kits.filter(k => !k.archived);
                      
                      // Filter by search
                      if (rollSearch) {
                        const search = rollSearch.toLowerCase();
                        items = items.filter(k => 
                          k.part_number?.toLowerCase().includes(search) ||
                          k.description?.toLowerCase().includes(search) ||
                          k.order_number?.toLowerCase().includes(search) ||
                          k.location?.toLowerCase().includes(search)
                        );
                      }
                      
                      // Sort items
                      if (sortBy === 'newest') {
                        items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                      } else if (sortBy === 'oldest') {
                        items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                      } else if (sortBy === 'location') {
                        items.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
                      } else if (sortBy === 'material') {
                        items.sort((a, b) => (a.part_number || '').localeCompare(b.part_number || ''));
                      }
                      
                      return items.map((k) => (
                        <label key={k.id} className="flex items-center gap-2 cursor-pointer hover:bg-[--bg-card-hover] p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.kit_ids.includes(k.id)}
                            onChange={() => handleItemToggle(k.id)}
                            className="w-4 h-4 text-[--primary]"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-[--text-secondary] font-medium">
                              {k.part_number}
                            </div>
                            <div className="text-xs text-[--text-muted]">
                              {k.description} • {k.location} • {k.status}
                            </div>
                          </div>
                        </label>
                      ));
                    })()
                  )}
                </div>
                  {(formData.stock_ids.length > 0 || formData.kit_ids.length > 0) && (
                    <p className="text-sm text-[--primary] mt-2">
                      {formData.item_type === 'stock' ? formData.stock_ids.length : formData.kit_ids.length} item(s) selected
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label className="text-[--text-secondary]">To Location *</Label>
                <Select value={formData.to_location} onValueChange={(v) => setFormData({ ...formData, to_location: v })}>
                  <SelectTrigger className="bg-[--bg-darker] border-[--border-color] text-[--text-primary] mt-1">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-card] border-[--border-color]">
                    {locations.map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-[--text-secondary] focus:bg-[--bg-card-hover]">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[--text-secondary]">Reason</Label>
                <Select value={formData.reason} onValueChange={(v) => setFormData({ ...formData, reason: v })}>
                  <SelectTrigger className="bg-[--bg-darker] border-[--border-color] text-[--text-primary] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-card] border-[--border-color]">
                    {reasons.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-[--text-secondary] focus:bg-[--bg-card-hover]">
                        {r.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom" className="text-[--text-secondary] focus:bg-[--bg-card-hover]">
                      Custom...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.reason === 'Custom' && (
                <div>
                  <Label className="text-[--text-secondary]">Custom Reason *</Label>
                  <Input
                    value={formData.custom_reason}
                    onChange={(e) => setFormData({ ...formData, custom_reason: e.target.value })}
                    className="bg-[--bg-darker] border-[--border-color] text-[--text-primary] mt-1"
                    placeholder="Enter custom reason"
                    required
                  />
                </div>
              )}

              <div>
                <Label className="text-[--text-secondary]">Transferred By</Label>
                <Input
                  value={formData.transferred_by}
                  onChange={(e) => setFormData({ ...formData, transferred_by: e.target.value })}
                  className="bg-[--bg-darker] border-[--border-color] text-[--text-primary] mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-[--text-secondary]">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-[--bg-darker] border-[--border-color] text-[--text-primary] mt-1"
                rows={3}
              />
            </div>
            
            <div className="bg-[--bg-card-hover]/30 rounded-lg p-3 border border-[--border-light]">
              <p className="text-xs text-slate-400">
                <strong>Note:</strong> Out-time tracking will be automatically managed based on the location transitions (freezer ↔ non-freezer).
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-[--border-color] text-[--text-secondary] hover:bg-[--bg-card-hover]">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[--primary] hover:bg-[--primary-hover] text-white"
                disabled={editingTransfer ? !formData.to_location : ((formData.stock_ids.length === 0 && formData.kit_ids.length === 0) || !formData.to_location || (formData.reason === 'Custom' && !formData.custom_reason))}
              >
                {editingTransfer ? 'Update Transfer' : 'Create Transfer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}