import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '../components/common/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from 'date-fns';
import { FileText, Settings, Plus, Trash2, Archive, ArchiveRestore, ChevronLeft, ChevronRight, X, History, Copy, SlidersHorizontal, MapPin, Package } from 'lucide-react';
import MobileDetailSheet from '../components/common/MobileDetailSheet';
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const statusOptions = [
  { value: 'all', label: 'Any Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Issued', label: 'Issued' },
  { value: 'Cancelled', label: 'Cancelled' },
];

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
  return [
    { value: 'all', label: 'All Locations' },
    ...locations.map(loc => {
      const name = typeof loc === 'string' ? loc : loc.name;
      return { value: name, label: name };
    })
  ];
};

export default function Kits() {
  const queryClient = useQueryClient();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [locations, setLocations] = useState(getLocations());
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchCriteria, setSearchCriteria] = useState('part_number');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [sidebarView, setSidebarView] = useState('details');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [materialPopoverOpen, setMaterialPopoverOpen] = useState({});
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  
  const [formData, setFormData] = useState({
    part_number: '',
    description: '',
    order_number: '',
    status: 'Pending',
    location: '',
    cure_by_date: '',
    comments: '',
    materials: []
  });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('kits_visible_columns');
    return saved ? JSON.parse(saved) : {
      part_number: true,
      description: true,
      order_number: true,
      status: true,
      location: true,
      cure_by_date: true,
      materials_count: true,
      comments: true
    };
  });

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ['kits'],
    queryFn: () => base44.entities.Kit.list(),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['stock'],
    queryFn: () => base44.entities.Stock.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Kit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Kit created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      setDialogOpen(false);
      setIsEditing(false);
      resetForm();
      toast.success('Kit updated successfully');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Kit.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit archived');
      setEditingKit(null);
    },
    onError: () => toast.error('Failed to archive kit'),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Kit.update(id, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit restored');
      setEditingKit(null);
    },
    onError: () => toast.error('Failed to restore kit'),
  });

  const resetForm = () => {
    setFormData({
      part_number: '',
      description: '',
      order_number: '',
      status: 'Pending',
      location: '',
      cure_by_date: '',
      comments: '',
      materials: []
    });
    setEditingKit(null);
    setMaterialPopoverOpen({});
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleRowClick = (kit) => {
    setIsEditing(false);
    setEditingKit(kit);
    setSelectedMaterial(null);
    if (window.innerWidth < 768) setMobileDetailOpen(true);
    setFormData({
      part_number: kit.part_number || '',
      description: kit.description || '',
      order_number: kit.order_number || '',
      status: kit.status || 'Pending',
      location: kit.location || '',
      cure_by_date: kit.cure_by_date || '',
      comments: kit.comments || '',
      materials: kit.materials || []
    });
  };

  const addMaterialLine = () => {
    setFormData({
      ...formData,
      materials: [
        ...formData.materials,
        { material_id: '', material_name: '', stock_id: '', batch_number: '', roll_number: '', quantity: '', unit: 'm²' }
      ]
    });
  };

  const removeMaterialLine = (index) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index)
    });
  };

  const updateMaterialLine = (index, field, value) => {
    const updated = [...formData.materials];
    if (field === 'material_id') {
      const material = materials.find(m => m.id === value);
      updated[index] = {
        ...updated[index],
        material_id: value,
        material_name: material?.part_number || '',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, materials: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      materials: formData.materials.map(m => ({
        ...m,
        quantity: m.quantity ? Number(m.quantity) : 0
      }))
    };

    if (editingKit) {
      updateMutation.mutate({ id: editingKit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSave = () => {
    if (editingKit) {
      const savedLocations = localStorage.getItem('server_locations');
      const locationsList = savedLocations ? JSON.parse(savedLocations) : [
        { name: 'Freezer A', isFreezer: true },
        { name: 'Freezer B', isFreezer: true },
        { name: 'Freezer C', isFreezer: true },
        { name: 'Clean Room', isFreezer: false },
        { name: 'Layup Area', isFreezer: false },
        { name: 'Cure Area', isFreezer: false }
      ];
      
      const locationObj = locationsList.find(l => (typeof l === 'string' ? l : l.name) === formData.location);
      const isFreezer = locationObj?.isFreezer || formData.location?.toLowerCase().includes('freezer');
      
      let autoStatus = formData.status;
      if (formData.location !== editingKit.location) {
        if (isFreezer) {
          autoStatus = 'Pending'; // Frozen
        } else {
          autoStatus = 'In Progress'; // Defrosting/Ready
        }
      }
      
      const data = {
        ...formData,
        status: autoStatus,
        materials: formData.materials.map(m => ({
          ...m,
          quantity: m.quantity ? Number(m.quantity) : 0
        }))
      };
      updateMutation.mutate({ id: editingKit.id, data });
    }
  };

  const handleArchiveKit = () => {
    archiveMutation.mutate({ id: editingKit.id });
    setArchiveConfirmOpen(false);
  };

  const filteredKits = kits.filter((k) => {
    // Filter archived items
    if (!showArchived && k.archived) return false;
    if (showArchived && !k.archived) return false;
    
    if (locationFilter !== 'all' && k.location !== locationFilter) return false;
    if (statusFilter !== 'all' && k.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (searchCriteria === 'part_number' && !k.part_number?.toLowerCase().includes(searchLower)) return false;
      if (searchCriteria === 'order_number' && !k.order_number?.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (!sortBy) return 0;
    
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    
    let comparison = 0;
    if (typeof aVal === 'string') {
      comparison = aVal.toLowerCase().localeCompare(bVal.toString().toLowerCase());
    } else if (typeof aVal === 'number') {
      comparison = aVal - bVal;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const defaultColumnOrder = [
    { key: 'part_number', header: 'Part Number', accessor: 'part_number' },
    { key: 'description', header: 'Description', accessor: 'description' },
    { key: 'order_number', header: 'Order Number', accessor: 'order_number' },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status || 'Pending'} /> },
    { key: 'location', header: 'Location', accessor: 'location' },
    { key: 'cure_by_date', header: 'Cure By Date', cell: (row) => row.cure_by_date ? format(new Date(row.cure_by_date), 'dd/MM/yyyy') : '-' },
    { key: 'materials_count', header: 'Materials', cell: (row) => `${row.materials?.length || 0} items` },
    { key: 'comments', header: 'Comments', cell: (row) => row.comments ? '✓' : '-' },
  ];

  const [columnOrder, setColumnOrder] = React.useState(() => {
    const saved = localStorage.getItem('kits_column_order');
    if (saved) {
      const savedKeys = JSON.parse(saved);
      return savedKeys.map(key => defaultColumnOrder.find(col => col.key === key)).filter(Boolean);
    }
    return defaultColumnOrder;
  });

  const allColumns = columnOrder;

  const handleColumnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setColumnOrder(items);
    localStorage.setItem('kits_column_order', JSON.stringify(items.map(col => col.key)));
  };

  const columns = allColumns.filter(col => visibleColumns[col.key]);

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 56;
      if (newWidth >= 280 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setLocations(getLocations());
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

  React.useEffect(() => {
    if (filteredKits.length > 0 && !editingKit) {
      const firstKit = filteredKits[0];
      setEditingKit(firstKit);
      setFormData({
        part_number: firstKit.part_number || '',
        description: firstKit.description || '',
        order_number: firstKit.order_number || '',
        status: firstKit.status || 'Pending',
        location: firstKit.location || '',
        cure_by_date: firstKit.cure_by_date || '',
        comments: firstKit.comments || '',
        materials: firstKit.materials || []
      });
    }
  }, [kits]);

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Sidebar Navigation - Hidden on mobile */}
      <div className="hidden md:flex w-14 bg-[--bg-card] border-r border-[--border-color] flex-col items-center py-4 gap-2 shadow-xl">
        <button
          onClick={() => setSidebarView('details')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            sidebarView === 'details' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
          title="Details"
        >
          <FileText className="h-4 w-4" />
        </button>
        <button
          onClick={() => setSidebarView('logs')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            sidebarView === 'logs' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
          title="Traceability"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          onClick={() => setSidebarView('settings')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            sidebarView === 'settings' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Details/Settings Sidebar - Hidden on mobile */}
      <div className="hidden md:flex relative bg-[--bg-card] border-r border-[--border-color] overflow-hidden flex-col shadow-2xl" style={{ width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`, transition: 'width 0.3s ease' }}>
        {!sidebarCollapsed && (
         <div className="p-6 overflow-y-auto flex-1 bg-[--bg-card]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {sidebarView === 'settings' ? 'Column Settings' : sidebarView === 'logs' ? 'Traceability' : 'Kit Details'}
          </h2>
          <div className="flex gap-2">
            {sidebarView === 'details' && editingKit && !isEditing && (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-[--primary] hover:bg-[--primary-hover] text-white"
              >
                Edit
              </Button>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  if (editingKit) {
                    setFormData({
                      part_number: editingKit.part_number || '',
                      description: editingKit.description || '',
                      order_number: editingKit.order_number || '',
                      status: editingKit.status || 'Pending',
                      location: editingKit.location || '',
                      cure_by_date: editingKit.cure_by_date || '',
                      comments: editingKit.comments || '',
                      materials: editingKit.materials || []
                    });
                  }
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-[--primary] hover:bg-[--primary-hover] text-white"
              >
                Save
              </Button>
            </div>
          )}
        </div>

        {sidebarView === 'logs' ? (
          !editingKit ? (
            <div className="text-center text-slate-500 mt-20">
              <p>Select a kit to view action logs</p>
            </div>
          ) : (() => {
            const events = [];
            if (editingKit.created_date) {
              events.push({ type: 'created', date: editingKit.created_date, description: 'Kit created', detail: `Status: ${editingKit.status}${editingKit.location ? ` · ${editingKit.location}` : ''}${editingKit.materials?.length ? ` · ${editingKit.materials.length} material(s)` : ''}`, by: editingKit.created_by });
            }
            if (editingKit.updated_date && editingKit.updated_date !== editingKit.created_date) {
              events.push({ type: 'updated', date: editingKit.updated_date, description: 'Kit updated', detail: 'Status, location or materials may have changed' });
            }
            if (editingKit.archived) {
              events.push({ type: 'archived', date: editingKit.updated_date, description: 'Kit archived', detail: null });
            }
            return (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event History</h4>
                <div className="space-y-2">
                  {events.map((event, idx) => {
                    const isSelected = selectedMaterial?.eventIdx === idx && selectedMaterial?.kitId === editingKit.id;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedMaterial(isSelected ? null : { eventIdx: idx, kitId: editingKit.id, event })}
                        className={`rounded-lg border cursor-pointer transition-all ${
                          isSelected ? 'bg-[--primary]/10 border-[--primary]/50' :
                          event.type === 'created' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' :
                          event.type === 'updated' ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40' :
                          'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-2 p-2.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            event.type === 'created' ? 'bg-emerald-500/20' : event.type === 'updated' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                          }`}>
                            {event.type === 'created' && <Plus className="h-3 w-3 text-emerald-400" />}
                            {event.type === 'updated' && <FileText className="h-3 w-3 text-blue-400" />}
                            {event.type === 'archived' && <Archive className="h-3 w-3 text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-slate-200 text-xs font-medium">{event.description}</p>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">{event.date ? format(new Date(event.date), 'dd/MM HH:mm') : '-'}</span>
                            </div>
                            {event.detail && <p className="text-[10px] text-slate-400 mt-0.5">{event.detail}</p>}
                            {event.by && <p className="text-[10px] text-slate-500 mt-0.5">by {event.by}</p>}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="px-2.5 pb-2.5 border-t border-slate-700/50 mt-0.5 pt-2">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                              <div><p className="text-[10px] text-slate-500 uppercase">Date</p><p className="text-slate-200 text-xs mt-0.5">{event.date ? format(new Date(event.date), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                              {event.by && <div><p className="text-[10px] text-slate-500 uppercase">By</p><p className="text-slate-200 text-xs mt-0.5">{event.by}</p></div>}
                              {event.type === 'created' && (
                                <>
                                  <div><p className="text-[10px] text-slate-500 uppercase">Part Number</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.part_number}</p></div>
                                  <div><p className="text-[10px] text-slate-500 uppercase">Status</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.status}</p></div>
                                  {editingKit.location && <div><p className="text-[10px] text-slate-500 uppercase">Location</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.location}</p></div>}
                                  {editingKit.materials?.length > 0 && <div><p className="text-[10px] text-slate-500 uppercase">Materials</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.materials.length} item(s)</p></div>}
                                </>
                              )}
                              {event.type === 'updated' && (
                                <>
                                  <div><p className="text-[10px] text-slate-500 uppercase">Status</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.status}</p></div>
                                  <div><p className="text-[10px] text-slate-500 uppercase">Location</p><p className="text-slate-200 text-xs mt-0.5">{editingKit.location || '-'}</p></div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : sidebarView === 'settings' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 mb-4">Drag to reorder, check to show/hide columns</p>
            <DragDropContext onDragEnd={handleColumnDragEnd}>
              <Droppable droppableId="columns">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {allColumns.map((col, index) => (
                      <Draggable key={col.key} draggableId={col.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 ${
                              snapshot.isDragging ? 'opacity-50 shadow-xl' : ''
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                              </svg>
                            </div>
                            <Checkbox
                              id={col.key}
                              checked={visibleColumns[col.key]}
                              onCheckedChange={(checked) => {
                                const newVisibleColumns = { ...visibleColumns, [col.key]: checked };
                                setVisibleColumns(newVisibleColumns);
                                localStorage.setItem('kits_visible_columns', JSON.stringify(newVisibleColumns));
                              }}
                              className="border-slate-600 data-[state=checked]:bg-[--primary]"
                            />
                            <Label htmlFor={col.key} className="text-slate-300 text-sm cursor-pointer flex-1">
                              {col.header}
                            </Label>
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
        ) : !editingKit ? (
          <div className="text-center text-slate-500 mt-20">
            <p>Select a kit to view details</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300 text-xs">Part Number</Label>
              <Input
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Order Number</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Location</Label>
              <Select 
                value={formData.location} 
                onValueChange={(v) => {
                  const savedLocations = localStorage.getItem('server_locations');
                  const locationsList = savedLocations ? JSON.parse(savedLocations) : [
                    { name: 'Freezer A', isFreezer: true },
                    { name: 'Freezer B', isFreezer: true },
                    { name: 'Freezer C', isFreezer: true },
                    { name: 'Clean Room', isFreezer: false },
                    { name: 'Layup Area', isFreezer: false },
                    { name: 'Cure Area', isFreezer: false }
                  ];
                  
                  const locationObj = locationsList.find(l => (typeof l === 'string' ? l : l.name) === v);
                  const isFreezer = locationObj?.isFreezer || v?.toLowerCase().includes('freezer');
                  
                  const autoStatus = isFreezer ? 'Pending' : 'In Progress';
                  setFormData({ ...formData, location: v, status: autoStatus });
                }}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  {locations.filter(l => l.value !== 'all').map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Status will auto-update based on location</p>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Status (Auto-set)</Label>
              <div className="mt-1">
                <StatusBadge status={formData.status} />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Cure By Date</Label>
              <Input
                type="date"
                value={formData.cure_by_date}
                onChange={(e) => setFormData({ ...formData, cure_by_date: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Comments</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                rows={3}
              />
            </div>
            
            {/* Materials Section in Edit Mode */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-slate-300 text-xs">Materials</Label>
                <Button
                  type="button"
                  onClick={addMaterialLine}
                  size="sm"
                  className="bg-[--primary] hover:bg-[--primary-hover] text-white h-7"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
              {formData.materials.map((mat, idx) => {
                const availableStock = mat.material_id ? stock.filter(s => s.material_id === mat.material_id && !s.archived) : [];
                return (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 space-y-2">
                  <div className="flex gap-1">
                    <Popover open={materialPopoverOpen[idx]} onOpenChange={(open) => setMaterialPopoverOpen({...materialPopoverOpen, [idx]: open})}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="flex-1 justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-800/50 h-8 text-xs">
                          {mat.material_id ? materials.find(m => m.id === mat.material_id)?.part_number : "Select material..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-[#1e293b] border-slate-700">
                        <Command className="bg-[#1e293b]">
                          <CommandInput placeholder="Search..." className="text-white" />
                          <CommandEmpty className="text-slate-400 py-4 text-center text-xs">No material found.</CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-auto">
                            {materials.map((m) => (
                              <CommandItem key={m.id} value={m.part_number + ' ' + (m.description || '')} onSelect={() => { updateMaterialLine(idx, 'material_id', m.id); setMaterialPopoverOpen({...materialPopoverOpen, [idx]: false}); }} className="text-slate-300 aria-selected:bg-slate-700/50 cursor-pointer text-xs">
                                {m.part_number}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" onClick={() => removeMaterialLine(idx)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {mat.material_id && (
                    <Select value={mat.stock_id || ''} onValueChange={(v) => { const s = stock.find(st => st.id === v); const updated = [...formData.materials]; updated[idx] = { ...updated[idx], stock_id: v, batch_number: s?.batch_number || '', roll_number: s?.roll_number || '' }; setFormData({ ...formData, materials: updated }); }}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-200 h-8 text-xs">
                        <SelectValue placeholder="Select batch / roll..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-slate-700">
                        {availableStock.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-slate-300 focus:bg-slate-700/50 text-xs">
                            {s.batch_number} / Roll {s.roll_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex gap-2 items-center">
                    <Input type="number" step="0.01" value={mat.quantity} onChange={(e) => updateMaterialLine(idx, 'quantity', e.target.value)} placeholder="Qty" className="bg-slate-900/50 border-slate-600 text-slate-200 h-8 text-xs flex-1" />
                    <Select value={mat.unit} onValueChange={(v) => updateMaterialLine(idx, 'unit', v)}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-200 h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-slate-700">
                        <SelectItem value="m²" className="text-slate-300 focus:bg-slate-700/50 text-xs">M²</SelectItem>
                        <SelectItem value="m" className="text-slate-300 focus:bg-slate-700/50 text-xs">M</SelectItem>
                        <SelectItem value="kg" className="text-slate-300 focus:bg-slate-700/50 text-xs">KG</SelectItem>
                        <SelectItem value="pcs" className="text-slate-300 focus:bg-slate-700/50 text-xs">PCS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                );
              })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Part Number</Label>
              <div 
                onClick={() => { navigator.clipboard.writeText(editingKit.part_number); toast.success('Copied'); }} 
                className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
              >
                <p className="text-slate-200">{editingKit.part_number}</p>
                <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Description</Label>
              <div 
                onClick={() => { navigator.clipboard.writeText(editingKit.description); toast.success('Copied'); }} 
                className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
              >
                <p className="text-slate-200">{editingKit.description}</p>
                <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Order Number</Label>
              <div 
                onClick={() => { navigator.clipboard.writeText(editingKit.order_number); toast.success('Copied'); }} 
                className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
              >
                <p className="text-slate-200">{editingKit.order_number}</p>
                <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Status</Label>
              <div className="mt-1">
                <StatusBadge status={editingKit.status || 'Pending'} />
              </div>
            </div>
            {editingKit.location && (
              <div>
                <Label className="text-slate-400 text-xs">Location</Label>
                <div 
                  onClick={() => { navigator.clipboard.writeText(editingKit.location); toast.success('Copied'); }} 
                  className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
                >
                  <p className="text-slate-200">{editingKit.location}</p>
                  <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
            {editingKit.cure_by_date && (
              <div>
                <Label className="text-slate-400 text-xs">Cure By Date</Label>
                <div 
                  onClick={() => { navigator.clipboard.writeText(format(new Date(editingKit.cure_by_date), 'dd/MM/yyyy')); toast.success('Copied'); }} 
                  className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
                >
                  <p className="text-slate-200">{format(new Date(editingKit.cure_by_date), 'dd/MM/yyyy')}</p>
                  <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
            {editingKit.materials && editingKit.materials.length > 0 && (
              <div>
                <Label className="text-slate-400 text-xs">Materials ({editingKit.materials.length})</Label>
                <div className="mt-2 space-y-2">
                  {editingKit.materials.map((mat, idx) => {
                    const stockItem = mat.stock_id ? stock.find(s => s.id === mat.stock_id) : null;
                    const isExpired = stockItem?.expiry_date && new Date(stockItem.expiry_date) < new Date();
                    return (
                    <div key={idx} className={`border rounded-lg p-3 ${
                      isExpired ? 'bg-red-500/10 border-red-500/40' : 'bg-[--bg-card] border-[--border-color]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${isExpired ? 'text-red-300' : 'text-slate-200'}`}>{mat.material_name}</p>
                        <span className="text-xs text-slate-400">{mat.quantity} {mat.unit}</span>
                      </div>
                      {mat.batch_number && <p className="text-slate-500 text-xs mt-0.5">Batch: {mat.batch_number} / Roll: {mat.roll_number}</p>}
                      {isExpired && <p className="text-red-400 text-xs mt-0.5">⚠ Expired {format(new Date(stockItem.expiry_date), 'dd/MM/yyyy')}</p>}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            {editingKit.comments && (
              <div>
                <Label className="text-slate-400 text-xs">Comments</Label>
                <div 
                  onClick={() => { navigator.clipboard.writeText(editingKit.comments); toast.success('Copied'); }} 
                  className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors"
                >
                  <p className="text-slate-200 text-sm">{editingKit.comments}</p>
                  <Copy className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        )}
        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[--primary] transition-colors bg-slate-700/30"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto bg-[--bg-dark]">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAdd}
              size="sm"
              className="bg-[--primary] hover:bg-[--primary-hover] text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {editingKit && !showArchived && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setArchiveConfirmOpen(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-700"
                title="Archive Kit"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {editingKit && showArchived && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => restoreMutation.mutate({ id: editingKit.id })}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-slate-700"
                title="Restore Kit"
              >
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowArchived(!showArchived)}
              className={`${showArchived ? 'text-[--primary] bg-[--primary]/10' : 'text-slate-400 hover:text-white'} hover:bg-slate-700/50 border border-[--border-color]`}
              title={showArchived ? "Show Active" : "Show Archived"}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
          </div>

          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search by ${searchCriteria === 'part_number' ? 'Part Number' : 'Order Number'}`} className="w-64 bg-slate-800/50 border-[--border-color] text-slate-200 h-9 focus:border-[--primary] focus:ring-1 focus:ring-[--primary]/20" />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-slate-200 h-9"><SelectValue placeholder="All Locations" /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-slate-700">
                {locations.map((loc) => (<SelectItem key={loc.value} value={loc.value} className="text-slate-300 focus:bg-slate-700/50">{loc.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-slate-200 h-9"><SelectValue placeholder="Any Status" /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-slate-700">
                {statusOptions.map((status) => (<SelectItem key={status.value} value={status.value} className="text-slate-300 focus:bg-slate-700/50">{status.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-1">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="part_number" checked={searchCriteria === 'part_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-xs text-slate-400">Part Number</span></label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="order_number" checked={searchCriteria === 'order_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-xs text-slate-400">Order Number</span></label>
          </div>

          {/* Mobile: search + filter button */}
          <div className="flex md:hidden items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-slate-800/50 border-[--border-color] text-slate-200 h-9" />
            <Button size="sm" variant="ghost" onClick={() => setMobileFilterOpen(true)} className={`border h-9 px-3 ${(locationFilter !== 'all' || statusFilter !== 'all' || sortBy) ? 'text-[--primary] border-[--primary]' : 'border-slate-700 text-slate-400'}`}>
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent" /></div>
          ) : filteredKits.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No kits found</div>
          ) : filteredKits.map((row) => (
            <div key={row.id} onClick={() => handleRowClick(row)} className={`rounded-xl border p-4 cursor-pointer transition-all ${editingKit?.id === row.id ? 'border-blue-500 bg-blue-500/10' : 'border-[--border-color] bg-[--bg-card]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm truncate">{row.part_number}</p>
                  {row.description && <p className="text-slate-400 text-xs mt-0.5 truncate">{row.description}</p>}
                </div>
                <StatusBadge status={row.status || 'Pending'} />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                {row.order_number && <span>Order: {row.order_number}</span>}
                {row.location && <span>{row.location}</span>}
                {row.materials?.length > 0 && <span>{row.materials.length} materials</span>}
                {row.cure_by_date && <span>Cure: {format(new Date(row.cure_by_date), 'dd/MM/yy')}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-[--border-color] overflow-hidden shadow-xl bg-[--bg-card]">
          <table className="w-full">
            <thead>
              <tr className="bg-[--bg-card-hover] border-b border-[--border-color]">
                {columns.map((col, idx) => (
                  <th 
                    key={idx}
                    onClick={() => {
                      if (sortBy === col.accessor || sortBy === col.key) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(col.accessor || col.key);
                        setSortOrder('asc');
                      }
                    }}
                    className="text-slate-300 font-semibold text-xs uppercase tracking-wider py-4 px-4 text-left first:pl-6 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {(sortBy === col.accessor || sortBy === col.key) && (
                        <span className="text-slate-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 bg-slate-900/50">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredKits.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-slate-500 bg-slate-900/50">
                    No kits found
                  </td>
                </tr>
              ) : (
                filteredKits.map((row, rowIdx) => (
                  <ContextMenu key={row.id || rowIdx}>
                    <ContextMenuTrigger asChild>
                      <tr
                        onClick={() => handleRowClick(row)}
                        className={`border-b transition-all duration-200 cursor-pointer ${
                          editingKit?.id === row.id
                            ? 'bg-blue-500/15 border-l-4 border-l-blue-500 border-b-transparent hover:bg-blue-500/20'
                            : row.materials?.some(m => { const s = m.stock_id ? stock.find(st => st.id === m.stock_id) : null; return s?.expiry_date && new Date(s.expiry_date) < new Date(); })
                              ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
                              : 'border-[--border-color] hover:bg-[--bg-card-hover]'
                        }`}
                      >
                        {columns.map((col, colIdx) => (
                          <td key={colIdx} className="py-4 px-4 text-sm text-slate-200 first:pl-6">
                            {col.cell ? col.cell(row) : row[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-[#1e293b] border-slate-700 shadow-xl">
                      {!showArchived && (
                        <ContextMenuItem
                          onClick={() => {
                            setEditingKit(row);
                            setArchiveConfirmOpen(true);
                          }}
                          className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </ContextMenuItem>
                      )}
                      {showArchived && (
                        <ContextMenuItem
                          onClick={() => {
                            restoreMutation.mutate({ id: row.id });
                          }}
                          className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-300 cursor-pointer"
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Restore
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </tbody>
          </table>
        </div>{/* closes desktop table hidden md:block wrapper */}
      </div>{/* closes main content */}

      {/* === Modals & Sheets === */}
      {/* Mobile Detail Sheet */}
      <MobileDetailSheet
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
        title={editingKit?.part_number || 'Kit Details'}
        navItems={[
          { icon: <FileText className="h-3.5 w-3.5" />, label: 'Details', active: sidebarView === 'details', onClick: () => setSidebarView('details') },
          { icon: <History className="h-3.5 w-3.5" />, label: 'Traceability', active: sidebarView === 'logs', onClick: () => setSidebarView('logs') },
        ]}
      >
        {editingKit && (
          <div className="space-y-3">
            <div><Label className="text-slate-400 text-xs">Part Number</Label><p className="text-slate-200 mt-1">{editingKit.part_number}</p></div>
            {editingKit.description && <div><Label className="text-slate-400 text-xs">Description</Label><p className="text-slate-200 mt-1 text-sm">{editingKit.description}</p></div>}
            {editingKit.order_number && <div><Label className="text-slate-400 text-xs">Order Number</Label><p className="text-slate-200 mt-1">{editingKit.order_number}</p></div>}
            <div><Label className="text-slate-400 text-xs">Status</Label><div className="mt-1"><StatusBadge status={editingKit.status || 'Pending'} /></div></div>
            {editingKit.location && <div><Label className="text-slate-400 text-xs">Location</Label><p className="text-slate-200 mt-1">{editingKit.location}</p></div>}
            {editingKit.cure_by_date && <div><Label className="text-slate-400 text-xs">Cure By Date</Label><p className="text-slate-200 mt-1">{format(new Date(editingKit.cure_by_date), 'dd/MM/yyyy')}</p></div>}
            {editingKit.materials && editingKit.materials.length > 0 && (
              <div>
                <Label className="text-slate-400 text-xs">Materials ({editingKit.materials.length})</Label>
                <div className="mt-2 space-y-2">
                  {editingKit.materials.map((mat, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded p-2">
                      <p className="text-slate-200 text-sm font-medium">{mat.material_name}</p>
                      {mat.batch_number && <p className="text-slate-400 text-xs">Batch: {mat.batch_number} | Roll: {mat.roll_number}</p>}
                      <p className="text-slate-400 text-xs">{mat.quantity} {mat.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editingKit.comments && <div><Label className="text-slate-400 text-xs">Comments</Label><p className="text-slate-200 mt-1 text-sm">{editingKit.comments}</p></div>}
            <div className="flex gap-2 pt-4">
              <Button onClick={() => { setMobileDetailOpen(false); setIsEditing(true); setDialogOpen(true); }} className="bg-[--primary] hover:bg-[--primary-hover] text-white flex-1">Edit</Button>
              <Button variant="outline" onClick={() => setMobileDetailOpen(false)} className="border-slate-600 text-slate-300">Close</Button>
            </div>
          </div>
        )}
      </MobileDetailSheet>

      {/* Mobile Filter Dialog */}
      <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Filter & Sort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Search by</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="part_number" checked={searchCriteria === 'part_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-sm text-slate-300">Part Number</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="order_number" checked={searchCriteria === 'order_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-sm text-slate-300">Order Number</span></label>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  {locations.map((loc) => (<SelectItem key={loc.value} value={loc.value} className="text-slate-300 focus:bg-slate-700/50">{loc.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  {statusOptions.map((s) => (<SelectItem key={s.value} value={s.value} className="text-slate-300 focus:bg-slate-700/50">{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Sort By</Label>
              <Select value={sortBy || 'none'} onValueChange={(v) => setSortBy(v === 'none' ? null : v)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  <SelectItem value="none" className="text-slate-300 focus:bg-slate-700/50">None</SelectItem>
                  <SelectItem value="part_number" className="text-slate-300 focus:bg-slate-700/50">Part Number</SelectItem>
                  <SelectItem value="order_number" className="text-slate-300 focus:bg-slate-700/50">Order Number</SelectItem>
                  <SelectItem value="cure_by_date" className="text-slate-300 focus:bg-slate-700/50">Cure By Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sortBy && (
              <div className="flex gap-2">
                <button onClick={() => setSortOrder('asc')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sortOrder === 'asc' ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>Asc</button>
                <button onClick={() => setSortOrder('desc')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sortOrder === 'desc' ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>Desc</button>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setLocationFilter('all'); setStatusFilter('all'); setSortBy(null); setSortOrder('asc'); }} className="flex-1 border-slate-600 text-slate-300">Reset</Button>
              <Button onClick={() => setMobileFilterOpen(false)} className="flex-1 bg-[--primary] hover:bg-[--primary-hover] text-white">Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Archive Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Are you sure you want to archive <strong>{editingKit?.part_number}</strong>?
            </p>
            <p className="text-sm text-slate-400">
              You can view archived items using the "Show Archived" button.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setArchiveConfirmOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleArchiveKit}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingKit ? 'Edit Kit' : 'Add Kit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Part Number *</Label>
                <Input
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-300">Order Number</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    {statusOptions.filter(s => s.value !== 'all').map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-slate-300 focus:bg-slate-700/50">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Location</Label>
                <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-slate-800/50 border-slate-700 text-slate-200 mt-1 hover:bg-slate-700/50"
                    >
                      {formData.location || "Select location..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-[#1e293b] border-slate-700">
                    <Command className="bg-[#1e293b]">
                      <CommandInput placeholder="Search location..." className="text-white" />
                      <CommandEmpty className="text-slate-400 py-6 text-center text-sm">No location found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {locations.filter(l => l.value !== 'all').map((l) => (
                          <CommandItem
                            key={l.value}
                            value={l.label}
                            onSelect={() => {
                              setFormData({ ...formData, location: l.value });
                              setLocationPopoverOpen(false);
                            }}
                            className="text-slate-300 aria-selected:bg-slate-700/50 cursor-pointer"
                          >
                            {l.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-slate-300">Cure By Date</Label>
                <Input
                  type="date"
                  value={formData.cure_by_date}
                  onChange={(e) => setFormData({ ...formData, cure_by_date: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                />
              </div>
            </div>

            {/* Materials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Materials</Label>
                <Button
                  type="button"
                  onClick={addMaterialLine}
                  size="sm"
                  className="bg-[--primary] hover:bg-[--primary-hover] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Material
                </Button>
              </div>
              {formData.materials.map((mat, idx) => {
                const availableStock = mat.material_id
                  ? stock.filter(s => s.material_id === mat.material_id && !s.archived)
                  : [];
                return (
                <div key={idx} className="space-y-2 bg-slate-800/50 p-3 rounded border border-slate-700">
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-5">
                      <Popover open={materialPopoverOpen[idx]} onOpenChange={(open) => setMaterialPopoverOpen({...materialPopoverOpen, [idx]: open})}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between bg-slate-900/50 border-slate-600 text-slate-200 hover:bg-slate-800/50">
                            {mat.material_id ? materials.find(m => m.id === mat.material_id)?.part_number : "Select material..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-[#1e293b] border-slate-700">
                          <Command className="bg-[#1e293b]">
                            <CommandInput placeholder="Search material..." className="text-white" />
                            <CommandEmpty className="text-slate-400 py-6 text-center text-sm">No material found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {materials.map((m) => (
                                <CommandItem key={m.id} value={m.part_number + ' ' + (m.description || '')} onSelect={() => { updateMaterialLine(idx, 'material_id', m.id); setMaterialPopoverOpen({...materialPopoverOpen, [idx]: false}); }} className="text-slate-300 aria-selected:bg-slate-700/50 cursor-pointer">
                                  {m.part_number} - {m.description}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button type="button" onClick={() => removeMaterialLine(idx)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {mat.material_id && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Select
                          value={mat.stock_id || ''}
                          onValueChange={(v) => {
                            const s = stock.find(st => st.id === v);
                            const updated = [...formData.materials];
                            updated[idx] = { ...updated[idx], stock_id: v, batch_number: s?.batch_number || '', roll_number: s?.roll_number || '' };
                            setFormData({ ...formData, materials: updated });
                          }}
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-200 text-xs h-8">
                            <SelectValue placeholder="Batch / Roll..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-slate-700">
                            {availableStock.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-slate-300 focus:bg-slate-700/50 text-xs">
                                {s.batch_number} / Roll {s.roll_number} ({s.quantity ? `${s.quantity}m²` : s.length_m ? `${s.length_m}m` : '-'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1">
                        <Input type="number" step="0.01" value={mat.quantity} onChange={(e) => updateMaterialLine(idx, 'quantity', e.target.value)} placeholder="Qty" className="bg-slate-900/50 border-slate-600 text-slate-200 h-8 text-xs" />
                        <Select value={mat.unit} onValueChange={(v) => updateMaterialLine(idx, 'unit', v)}>
                          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-200 h-8 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-slate-700">
                            <SelectItem value="m²" className="text-slate-300 focus:bg-slate-700/50 text-xs">M²</SelectItem>
                            <SelectItem value="m" className="text-slate-300 focus:bg-slate-700/50 text-xs">M</SelectItem>
                            <SelectItem value="kg" className="text-slate-300 focus:bg-slate-700/50 text-xs">KG</SelectItem>
                            <SelectItem value="pcs" className="text-slate-300 focus:bg-slate-700/50 text-xs">PCS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            <div>
              <Label className="text-slate-300">Comments</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">
                Cancel
              </Button>
              <Button type="submit" className="bg-[--primary] hover:bg-[--primary-hover] text-white">
                {editingKit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}