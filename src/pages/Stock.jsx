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
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { FileText, Settings, Plus, Archive, ArchiveRestore, Eye, History, ChevronLeft, ChevronRight, X, ArrowRightLeft, ChevronDown, Copy, RotateCcw, Upload, MapPin, SlidersHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import MobileDetailSheet from '../components/common/MobileDetailSheet';
import StockSidebarContent from '../components/stock/StockSidebarContent';
import RollsTable from '../components/stock/RollsTable';

const defaultCategories = ['Composite', 'Resin Film', 'Elastomer', 'Adhesive', 'Core'];

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

const getStatusOptions = () => {
  const saved = localStorage.getItem('server_statuses');
  const defaultStatuses = ['Available', 'In Use', 'Depleted', 'Expired', 'Quarantine'];
  const statuses = saved ? JSON.parse(saved) : defaultStatuses;
  return [
    { value: 'all', label: 'Any Status' },
    ...statuses.map(status => ({ value: status, label: status }))
  ];
};

export default function Stock() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [locations, setLocations] = useState(getLocations());
  const [statusOptions, setStatusOptions] = useState(getStatusOptions());
  const [locationFilter, setLocationFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState(() => {
    return localStorage.getItem('selected_category_filter') || 'all';
  });
  const [search, setSearch] = useState('');
  const [searchCriteria, setSearchCriteria] = useState('part_number');
  const [categories, setCategories] = useState([]);

  const { data: categoriesSettings, isLoading: categoriesLoading } = useQuery({
    queryKey: ['settings', 'material_categories'],
    queryFn: async () => {
      const settings = await base44.entities.Settings.filter({ key: 'material_categories' });
      return settings[0] || null;
    },
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [sidebarView, setSidebarView] = useState('details');
  const [groupBy, setGroupBy] = useState('none');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferringStock, setTransferringStock] = useState(null);
  const [reLifeDialogOpen, setReLifeDialogOpen] = useState(false);
  const [reLifeStock, setReLifeStock] = useState(null);
  const [reLifeFormData, setReLifeFormData] = useState({
    new_expiry_date: '',
    apply_to_batch: false,
    attachment_url: '',
    attachment_type: 'upload'
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [traceabilityDialogOpen, setTraceabilityDialogOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(document.documentElement.classList.contains('light-theme'));
  const [transferFormData, setTransferFormData] = useState({
    to_location: '',
    transfer_date: new Date().toISOString().slice(0, 16)
  });
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  const [batchesWithRolls, setBatchesWithRolls] = useState([{
    material_id: '',
    batch_number: '',
    manufacture_date: '',
    expiry_date: '',
    supplier: '',
    rolls: [{ roll_number: '', location: '', measurement_type: 'm2', value: '', width_mm: '' }]
  }]);
  const [materialPopoverOpen, setMaterialPopoverOpen] = useState({});
  const [locationPopoverOpen, setLocationPopoverOpen] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('stock_visible_columns');
    return saved ? JSON.parse(saved) : {
      part_number: true,
      description: true,
      batch_number: true,
      roll_number: true,
      length_m: true,
      width_mm: true,
      quantity: true,
      manufacture_date: true,
      expiry_date: true,
      out_life: true,
      location: true,
      attachments: true,
      notes: true
    };
  });
  const [formData, setFormData] = useState({
    stock_id: '',
    roll_number: '',
    batch_id: '',
    batch_number: '',
    material_id: '',
    material_name: '',
    description: '',
    material_type: '',
    location: 'Freezer A',
    quantity: '',
    width_mm: '',
    length_m: '',
    manufacture_date: '',
    expiry_date: '',
    out_life: '',
    notes: '',
    attachments: []
  });

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => base44.entities.Stock.list(),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => base44.entities.Batch.list(),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list(),
  });

  const { data: kits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => base44.entities.Kit.list(),
  });

  const createBatchMutation = useMutation({
    mutationFn: (data) => base44.entities.Batch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });

  const createMultipleMutation = useMutation({
    mutationFn: async (stockItems) => {
      const promises = stockItems.map(item => base44.entities.Stock.create(item));
      return Promise.all(promises);
    },
    onSuccess: (_, stockItems) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setDialogOpen(false);
      resetForm();
      toast.success(`${stockItems.length} stock item${stockItems.length > 1 ? 's' : ''} created successfully`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setDialogOpen(false);
      setIsEditing(false);
      resetForm();
      toast.success('Stock item updated successfully');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Stock.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Stock item archived');
      setEditingStock(null);
    },
    onError: () => toast.error('Failed to archive stock item'),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Stock.update(id, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Stock item restored');
      setEditingStock(null);
    },
    onError: () => toast.error('Failed to restore stock item'),
  });

  const reLifeMutation = useMutation({
    mutationFn: async ({ stockItem, newExpiryDate, applyToBatch, attachmentUrl }) => {
      const updates = [];
      
      if (applyToBatch) {
        // Update all stock items with the same batch
        const batchStockItems = stock.filter(s => s.batch_id === stockItem.batch_id && !s.archived);
        for (const item of batchStockItems) {
          const updateData = { expiry_date: newExpiryDate };
          if (attachmentUrl) {
            updateData.attachments = [...(item.attachments || []), attachmentUrl];
          }
          updates.push(base44.entities.Stock.update(item.id, updateData));
        }
      } else {
        // Update only the selected stock item
        const updateData = { expiry_date: newExpiryDate };
        if (attachmentUrl) {
          updateData.attachments = [...(stockItem.attachments || []), attachmentUrl];
        }
        updates.push(base44.entities.Stock.update(stockItem.id, updateData));
      }
      
      return Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setReLifeDialogOpen(false);
      setReLifeStock(null);
      const count = variables.applyToBatch 
        ? stock.filter(s => s.batch_id === variables.stockItem.batch_id && !s.archived).length 
        : 1;
      toast.success(`Re-life completed for ${count} item${count > 1 ? 's' : ''}`);
    },
    onError: () => toast.error('Failed to re-life stock'),
  });

  const transferMutation = useMutation({
    mutationFn: async ({ stockId, toLocation, transferDate }) => {
      const stockItem = stock.find(s => s.id === stockId);
      
      // Create transfer record
      await base44.entities.Transfer.create({
        transfer_number: `TRF-${Date.now()}`,
        stock_id: stockId,
        material_name: stockItem.material_name,
        batch_number: stockItem.batch_number,
        from_location: stockItem.location,
        to_location: toLocation,
        quantity: stockItem.quantity || 0,
        unit: stockItem.quantity ? 'm²' : 'm',
        transfer_date: transferDate,
        reason: 'Production',
        transferred_by: 'User',
        status: 'Completed'
      });
      
      // Update stock location
      await base44.entities.Stock.update(stockId, { location: toLocation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setTransferDialogOpen(false);
      setTransferringStock(null);
      toast.success('Stock transferred successfully');
    },
    onError: () => toast.error('Failed to transfer stock'),
  });

  const resetForm = () => {
    setFormData({
      stock_id: '',
      roll_number: '',
      batch_id: '',
      batch_number: '',
      material_id: '',
      material_name: '',
      description: '',
      material_type: '',
      location: 'Freezer A',
      quantity: '',
      width_mm: '',
      length_m: '',
      manufacture_date: '',
      expiry_date: '',
      out_life: '',
      notes: '',
      attachments: []
    });
    setEditingStock(null);
    setBatchesWithRolls([{
      material_id: '',
      batch_number: '',
      manufacture_date: '',
      expiry_date: '',
      supplier: '',
      rolls: [{ roll_number: '', location: '', measurement_type: 'm2', value: '', width_mm: '' }]
    }]);
    setMaterialPopoverOpen({});
    setLocationPopoverOpen({});
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleRowClick = (item) => {
    setIsEditing(false);
    setEditingStock(item);
    if (window.innerWidth < 768) setMobileViewOpen(true);
    setFormData({ stock_id: item.stock_id || '', roll_number: item.roll_number || '', batch_id: item.batch_id || '', batch_number: item.batch_number || '', material_id: item.material_id || '', material_name: item.material_name || '', description: item.description || '', material_type: item.material_type || '', location: item.location || 'Freezer A', quantity: item.quantity || '', width_mm: item.width_mm || '', length_m: item.length_m || '', manufacture_date: item.manufacture_date || '', expiry_date: item.expiry_date || '', out_life: item.out_life || '', notes: item.notes || '', attachments: item.attachments || [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingStock) {
      const data = {
        ...formData,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        width_mm: formData.width_mm ? Number(formData.width_mm) : null,
        length_m: formData.length_m ? Number(formData.length_m) : null,
        out_life: formData.out_life ? Number(formData.out_life) : null,
      };
      updateMutation.mutate({ id: editingStock.id, data });
      return;
    }

    // Process batches and create stock items
    const allStockItems = [];
    
    for (const batchData of batchesWithRolls) {
      if (!batchData.material_id) {
        toast.error('Material is required for all batches.');
        return;
      }
      if (!batchData.batch_number) {
        toast.error('Batch Number is required for all batches.');
        return;
      }
      if (batchData.rolls.length === 0) {
        toast.error('At least one roll is required for each batch.');
        return;
      }
      
      const material = materials.find(m => m.id === batchData.material_id);
      if (!material) {
        toast.error(`Material not found for the selected material in batch ${batchData.batch_number}.`);
        return;
      }
      
      // Create new batch
      let newBatch;
      try {
        newBatch = await createBatchMutation.mutateAsync({
          batch_number: batchData.batch_number,
          material_id: batchData.material_id,
          material_name: material?.part_number || '',
          manufacture_date: batchData.manufacture_date || null,
          expiry_date: batchData.expiry_date || null,
          supplier: batchData.supplier || '',
          status: 'Quarantine' // Default status for new batches
        });
        queryClient.invalidateQueries({ queryKey: ['batches'] }); // Invalidate immediately to update cache
      } catch (error) {
        toast.error(`Failed to create batch ${batchData.batch_number}: ${error.message}`);
        return; // Stop processing if batch creation fails
      }
      
      // Create stock items for each roll
      batchData.rolls.forEach((roll, idx) => {
        if (!roll.location) {
          toast.error(`Location is required for roll ${roll.roll_number || (idx + 1)} in batch ${batchData.batch_number}.`);
          return;
        }

        let quantity = null;
        let length_m = null;
        
        if (roll.measurement_type === 'm2') {
          quantity = roll.value ? Number(roll.value) : null;
        } else { // 'lm'
          length_m = roll.value ? Number(roll.value) : null;
        }
        
        allStockItems.push({
          stock_id: `${batchData.batch_number}-${roll.roll_number || (idx + 1)}-${Date.now().toString(36).toUpperCase()}`,
          roll_number: roll.roll_number || `${idx + 1}`,
          batch_id: newBatch.id,
          batch_number: batchData.batch_number,
          material_id: batchData.material_id,
          material_name: material?.part_number || '',
          description: material?.description || '',
          material_type: material?.category || '',
          location: roll.location,
          quantity: quantity,
          width_mm: roll.width_mm ? Number(roll.width_mm) : null,
          length_m: length_m,
          manufacture_date: batchData.manufacture_date || null,
          expiry_date: batchData.expiry_date || null,
          out_life: material?.default_out_life || null,
          status: 'Available', // Default status for new stock items
        });
      });
    }
    
    if (allStockItems.length > 0) {
      createMultipleMutation.mutate(allStockItems);
    } else {
      toast.error('No valid stock items to create. Please ensure all required fields are filled.');
    }
  };

  const handleSave = () => {
    if (editingStock) {
      const data = {
        ...formData,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        width_mm: formData.width_mm ? Number(formData.width_mm) : null,
        length_m: formData.length_m ? Number(formData.length_m) : null,
        out_life: formData.out_life ? Number(formData.out_life) : null,
      };
      updateMutation.mutate({ id: editingStock.id, data });
    }
  };

  const handleArchiveStock = () => {
    archiveMutation.mutate({ id: editingStock.id });
    setArchiveConfirmOpen(false);
  };

  const handleTransferClick = (stockItem) => {
    setTransferringStock(stockItem);
    setTransferFormData({
      to_location: '',
      transfer_date: new Date().toISOString().slice(0, 16)
    });
    setTransferDialogOpen(true);
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    transferMutation.mutate({
      stockId: transferringStock.id,
      toLocation: transferFormData.to_location,
      transferDate: transferFormData.transfer_date
    });
  };

  const handleReLifeClick = (stockItem) => {
    setReLifeStock(stockItem);
    setReLifeFormData({
      new_expiry_date: stockItem.expiry_date || '',
      apply_to_batch: false,
      attachment_url: '',
      attachment_type: 'upload'
    });
    setReLifeDialogOpen(true);
  };

  const handleReLifeSubmit = (e) => {
    e.preventDefault();
    if (!reLifeFormData.new_expiry_date) {
      toast.error('Please select a new expiry date');
      return;
    }
    reLifeMutation.mutate({
      stockItem: reLifeStock,
      newExpiryDate: reLifeFormData.new_expiry_date,
      applyToBatch: reLifeFormData.apply_to_batch,
      attachmentUrl: reLifeFormData.attachment_url
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReLifeFormData({ ...reLifeFormData, attachment_url: file_url });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const getMaterialDescription = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    return material?.description || '-';
  };

  const getManufactureDate = (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    return batch?.manufacture_date || null;
  };

  // Build traceability timeline for selected stock
  const getStockTimeline = (stockItem) => {
    if (!stockItem) return [];
    
    const events = [];
    
    // Created event
    if (stockItem.created_date) {
      events.push({
        date: stockItem.created_date,
        type: 'created',
        quantity: stockItem.quantity || 0,
        icon: 'plus',
        description: 'Stock created'
      });
    }
    
    // Transfer events
    const stockTransfers = transfers.filter(t => t.stock_id === stockItem.id);
    stockTransfers.forEach(transfer => {
      events.push({
        date: transfer.transfer_date || transfer.created_date,
        type: 'transfer',
        quantity: stockItem.quantity || 0,
        icon: 'move',
        description: `Moved to ${transfer.to_location}`,
        from: transfer.from_location,
        to: transfer.to_location
      });
    });
    
    // Re-life events (check if expiry was updated)
    if (stockItem.updated_date && stockItem.updated_date !== stockItem.created_date) {
      // Check attachments for re-life documentation
      if (stockItem.attachments && stockItem.attachments.length > 0) {
        events.push({
          date: stockItem.updated_date,
          type: 'relife',
          quantity: stockItem.quantity || 0,
          icon: 'refresh',
          description: 'Re-lifed'
        });
      }
    }
    
    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Transform to chart data
    return events.map((event, idx) => ({
      ...event,
      index: idx,
      dateFormatted: format(new Date(event.date), 'dd/MM/yy HH:mm')
    }));
  };

  const filteredStock = stock.filter((s) => {
    // Filter archived items
    if (!showArchived && s.archived) return false;
    if (showArchived && !s.archived) return false;
    
    // Filter by category using the material's current category
    if (typeFilter !== 'all') {
      const material = materials.find(m => m.id === s.material_id);
      const currentCategory = material?.category || s.material_type;
      if (currentCategory !== typeFilter) return false;
    }
    if (locationFilter.length > 0 && !locationFilter.includes(s.location)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(s.status)) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (searchCriteria === 'part_number' && !s.material_name?.toLowerCase().includes(searchLower)) return false;
      if (searchCriteria === 'batch' && !s.batch_number?.toLowerCase().includes(searchLower)) return false;
      if (searchCriteria === 'material' && !s.material_name?.toLowerCase().includes(searchLower)) return false;
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
    } else if (aVal instanceof Date) {
      comparison = aVal - bVal;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const defaultColumnOrder = [
    { key: 'part_number', header: 'Part Number', accessor: 'material_name' },
    { key: 'description', header: 'Description', cell: (row) => getMaterialDescription(row.material_id) },
    { key: 'batch_number', header: 'Batch', accessor: 'batch_number' },
    { key: 'roll_number', header: 'Roll', accessor: 'roll_number', cell: (row) => row.roll_number || '-' },
    { key: 'length_m', header: 'Linear Metres', cell: (row) => row.length_m ? `${row.length_m} m` : '-' },
    { key: 'width_mm', header: 'Width', cell: (row) => row.width_mm ? `${row.width_mm} mm` : '-' },
    { key: 'quantity', header: 'M²', cell: (row) => row.quantity ? `${row.quantity} m²` : '-' },
    { key: 'manufacture_date', header: 'DoM', cell: (row) => {
      const dom = row.manufacture_date || getManufactureDate(row.batch_id);
      return dom ? format(new Date(dom), 'dd/MM/yyyy') : '-';
    }},
    { key: 'expiry_date', header: 'Expiry', cell: (row) => row.expiry_date ? format(new Date(row.expiry_date), 'dd/MM/yyyy') : '-' },
    { key: 'out_life', header: 'Out Life', cell: (row) => row.out_life ? `${row.out_life} hrs` : '-' },
    { key: 'location', header: 'Location', accessor: 'location' },
    { key: 'attachments', header: 'Attachments', cell: (row) => row.attachments?.length || 0 },
    { key: 'notes', header: 'Notes', cell: (row) => row.notes ? '✓' : '-' },
  ];

  const [columnOrder, setColumnOrder] = React.useState(() => {
    const saved = localStorage.getItem('stock_column_order');
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
    localStorage.setItem('stock_column_order', JSON.stringify(items.map(col => col.key)));
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
    if (!categoriesLoading) {
      if (categoriesSettings?.value && categoriesSettings.value.length > 0) {
        setCategories(categoriesSettings.value);
      } else {
        // If no categories exist, use default categories
        setCategories(defaultCategories);
      }
    }
  }, [categoriesSettings, categoriesLoading]);

  React.useEffect(() => {
    const handleCategoriesUpdate = async () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'material_categories'] });
    };
    window.addEventListener('categoriesUpdated', handleCategoriesUpdate);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdate);
  }, []);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setLocations(getLocations());
      setStatusOptions(getStatusOptions());
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
    if (filteredStock.length > 0 && !editingStock) {
      const firstStock = filteredStock[0];
      setEditingStock(firstStock);
      setFormData({
        stock_id: firstStock.stock_id || '',
        roll_number: firstStock.roll_number || '',
        batch_id: firstStock.batch_id || '',
        batch_number: firstStock.batch_number || '',
        material_id: firstStock.material_id || '',
        material_name: firstStock.material_name || '',
        description: firstStock.description || '',
        material_type: firstStock.material_type || '',
        location: firstStock.location || 'Freezer A',
        quantity: firstStock.quantity || '',
        width_mm: firstStock.width_mm || '',
        length_m: firstStock.length_m || '',
        manufacture_date: firstStock.manufacture_date || '',
        expiry_date: firstStock.expiry_date || '',
        out_life: firstStock.out_life || '',
        notes: firstStock.notes || '',
        attachments: firstStock.attachments || []
      });
    }
  }, [stock]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && !e.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const [mobileViewOpen, setMobileViewOpen] = React.useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex-col md:flex-row">

      <MobileDetailSheet
        open={mobileViewOpen}
        onClose={() => { setMobileViewOpen(false); setIsEditing(false); }}
        title={editingStock ? editingStock.stock_id : 'Stock Details'}
        navItems={[
          { icon: <FileText className="h-3.5 w-3.5" />, label: 'Details', active: sidebarView === 'details', onClick: () => setSidebarView('details') },
          { icon: <History className="h-3.5 w-3.5" />, label: 'History', active: sidebarView === 'logs', onClick: () => setSidebarView('logs') },
        ]}
      >
        {sidebarView === 'details' && !isEditing && editingStock ? (
          <div className="space-y-3">
            <div><Label className="text-slate-400 text-xs">Stock ID</Label><p className="text-slate-200 mt-1">{editingStock.stock_id}</p></div>
            <div><Label className="text-slate-400 text-xs">Part Number</Label><p className="text-slate-200 mt-1">{editingStock.material_name}</p></div>
            <div><Label className="text-slate-400 text-xs">Batch / Roll</Label><p className="text-slate-200 mt-1">{editingStock.batch_number} / {editingStock.roll_number || '-'}</p></div>
            <div><Label className="text-slate-400 text-xs">M²</Label><p className="text-slate-200 mt-1">{editingStock.quantity ? `${editingStock.quantity} m²` : '-'}</p></div>
            <div><Label className="text-slate-400 text-xs">Expiry</Label><p className="text-slate-200 mt-1">{editingStock.expiry_date ? format(new Date(editingStock.expiry_date), 'dd/MM/yyyy') : '-'}</p></div>
            <div><Label className="text-slate-400 text-xs">Location</Label><p className="text-slate-200 mt-1">{editingStock.location}</p></div>
            {editingStock.notes && <div><Label className="text-slate-400 text-xs">Notes</Label><p className="text-slate-200 mt-1 text-sm">{editingStock.notes}</p></div>}
            <div className="flex gap-2 pt-4 flex-wrap">
              <Button onClick={() => setIsEditing(true)} className="bg-[--primary] hover:bg-[--primary-hover] text-white flex-1">Edit</Button>
              {!showArchived && <Button size="sm" variant="outline" onClick={() => { setMobileViewOpen(false); handleTransferClick(editingStock); }} className="border-slate-600 text-slate-300">Transfer</Button>}
              {!showArchived && <Button size="sm" variant="outline" onClick={() => { setMobileViewOpen(false); setArchiveConfirmOpen(true); }} className="border-red-800 text-red-400">Archive</Button>}
            </div>
          </div>
        ) : sidebarView === 'details' && isEditing ? (
          <div className="space-y-3">
            <div><Label className="text-slate-300 text-xs">Location *</Label><Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-slate-700">{locations.filter(l => l.value !== 'all').map(l => <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50">{l.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-slate-300 text-xs">M²</Label><Input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
            <div><Label className="text-slate-300 text-xs">Expiry</Label><Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
            <div><Label className="text-slate-300 text-xs">Notes</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1" /></div>
            <div className="flex gap-2 pt-4"><Button onClick={() => { handleSave(); setMobileViewOpen(false); }} className="bg-[--primary] hover:bg-[--primary-hover] text-white flex-1">Save</Button><Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-600 text-slate-300">Cancel</Button></div>
          </div>
        ) : (
          <div className="space-y-2">
            {editingStock && getStockTimeline(editingStock).length > 0 ? getStockTimeline(editingStock).map((event, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg border ${event.type === 'created' ? 'bg-emerald-500/5 border-emerald-500/20' : event.type === 'transfer' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-purple-500/5 border-purple-500/20'}`}>
                <p className="text-slate-200 text-xs font-medium">{event.description}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{format(new Date(event.date), 'dd/MM HH:mm')}</p>
              </div>
            )) : <p className="text-slate-500 text-sm text-center py-8">No events yet</p>}
          </div>
        )}
      </MobileDetailSheet>

      {/* Sidebar Navigation */}
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

      {/* Details/Settings Sidebar - desktop only */}
      <div className="hidden md:relative md:flex bg-[--bg-card] border-r border-[--border-color] overflow-hidden flex-col shadow-2xl" style={{ width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`, transition: 'width 0.3s ease' }}>
        {!sidebarCollapsed && (
         <div className="p-6 overflow-y-auto flex-1 bg-[--bg-card]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {sidebarView === 'settings' ? 'Column Settings' : sidebarView === 'logs' ? 'Traceability' : 'Stock Details'}
          </h2>
          <div className="flex gap-2">
            {sidebarView === 'details' && editingStock && !isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)} className="bg-[--primary] hover:bg-[--primary-hover] text-white">Edit</Button>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); if (editingStock) { setFormData({ stock_id: editingStock.stock_id || '', roll_number: editingStock.roll_number || '', batch_id: editingStock.batch_id || '', batch_number: editingStock.batch_number || '', material_id: editingStock.material_id || '', material_name: editingStock.material_name || '', description: editingStock.description || '', material_type: editingStock.material_type || '', location: editingStock.location || 'Freezer A', quantity: editingStock.quantity || '', width_mm: editingStock.width_mm || '', length_m: editingStock.length_m || '', manufacture_date: editingStock.manufacture_date || '', expiry_date: editingStock.expiry_date || '', out_life: editingStock.out_life || '', notes: editingStock.notes || '', attachments: editingStock.attachments || [] }); } }} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">Cancel</Button>
              <Button size="sm" onClick={handleSave} className="bg-[--primary] hover:bg-[--primary-hover] text-white">Save</Button>
            </div>
          )}
        </div>

        <StockSidebarContent
          sidebarView={sidebarView}
          editingStock={editingStock}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          locations={locations}
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          handleColumnDragEnd={handleColumnDragEnd}
          handleSave={handleSave}
          getStockTimeline={getStockTimeline}
          getMaterialDescription={getMaterialDescription}
          getManufactureDate={getManufactureDate}
          onViewTraceability={() => setTraceabilityDialogOpen(true)}
          stock={stock}
          transfers={transfers}
          kits={kits}
        />
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
      <div className="flex-1 p-4 md:p-6 overflow-auto bg-[--bg-dark] w-full md:flex-1">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAdd}
              size="sm"
              className="bg-[--primary] hover:bg-[--primary-hover] text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {editingStock && !showArchived && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setArchiveConfirmOpen(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-700"
                title="Archive Stock"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {editingStock && showArchived && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => restoreMutation.mutate({ id: editingStock.id })}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-slate-700"
                title="Restore Stock"
              >
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowArchived(!showArchived)}
              className={`${showArchived ? 'text-[--primary] bg-[--primary]/10' : 'text-slate-400'} hover:text-white hover:bg-slate-700/50 border border-slate-700`}
              title={showArchived ? "Show Active" : "Show Archived"}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
          </div>

          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search by ${searchCriteria === 'part_number' ? 'Part Number' : searchCriteria === 'batch' ? 'Batch Number' : 'Material'}`} className="w-64 bg-slate-800/50 border-[--border-color] text-slate-200 h-9 focus:border-[--primary] focus:ring-1 focus:ring-[--primary]/20" />
            </div>
            <div className="relative dropdown-container">
              <button onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')} className="w-40 bg-slate-800/50 border border-slate-600 text-slate-200 h-9 px-3 rounded-lg text-sm flex items-center justify-between hover:bg-slate-700/50">
                <span>{locationFilter.length === 0 ? 'Locations' : `${locationFilter.length} selected`}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {openDropdown === 'location' && (
                <div className="absolute z-50 mt-1 w-48 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {locations.filter(l => l.value !== 'all').map((loc) => (
                    <label key={loc.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" checked={locationFilter.includes(loc.value)} onChange={(e) => { if (e.target.checked) { setLocationFilter([...locationFilter, loc.value]); } else { setLocationFilter(locationFilter.filter(l => l !== loc.value)); } }} className="w-4 h-4" />
                      <span className="text-slate-300 text-sm">{loc.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="relative dropdown-container">
              <button onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')} className="w-40 bg-slate-800/50 border border-slate-600 text-slate-200 h-9 px-3 rounded-lg text-sm flex items-center justify-between hover:bg-slate-700/50">
                <span>{statusFilter.length === 0 ? 'Status' : `${statusFilter.length} selected`}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {openDropdown === 'status' && (
                <div className="absolute z-50 mt-1 w-48 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {statusOptions.filter(s => s.value !== 'all').map((status) => (
                    <label key={status.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 cursor-pointer">
                      <input type="checkbox" checked={statusFilter.includes(status.value)} onChange={(e) => { if (e.target.checked) { setStatusFilter([...statusFilter, status.value]); } else { setStatusFilter(statusFilter.filter(s => s !== status.value)); } }} className="w-4 h-4" />
                      <span className="text-slate-300 text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-slate-200 h-9"><SelectValue placeholder="Group By" /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-slate-700">
                <SelectItem value="none" className="text-slate-300 focus:bg-slate-700/50">No Grouping</SelectItem>
                <SelectItem value="part_number" className="text-slate-300 focus:bg-slate-700/50">Part Number</SelectItem>
                <SelectItem value="expiry" className="text-slate-300 focus:bg-slate-700/50">Expiry Date</SelectItem>
                <SelectItem value="location" className="text-slate-300 focus:bg-slate-700/50">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-1">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="part_number" checked={searchCriteria === 'part_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-xs text-slate-400">Part Number</span></label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="batch" checked={searchCriteria === 'batch'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-xs text-slate-400">Batch Number</span></label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="material" checked={searchCriteria === 'material'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-xs text-slate-400">Material</span></label>
          </div>

          {categories.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              <button onClick={() => { setTypeFilter('all'); localStorage.setItem('selected_category_filter', 'all'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${typeFilter === 'all' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-[--border-color]'}`}>All</button>
              {categories.map((category) => (
                <button key={category} onClick={() => { setTypeFilter(category); localStorage.setItem('selected_category_filter', category); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${typeFilter === category ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-[--border-color]'}`}>{category}</button>
              ))}
            </div>
          )}

          {/* Mobile: search + filter button */}
          <div className="flex md:hidden items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-slate-800/50 border-[--border-color] text-slate-200 h-9" />
            <Button size="sm" variant="ghost" onClick={() => setMobileFilterOpen(true)} className={`border h-9 px-3 ${(locationFilter.length > 0 || statusFilter.length > 0 || typeFilter !== 'all' || sortBy) ? 'text-[--primary] border-[--primary]' : 'border-slate-700 text-slate-400'}`}>
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filter{(locationFilter.length + statusFilter.length) > 0 ? ` (${locationFilter.length + statusFilter.length})` : ''}
            </Button>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent" /></div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No stock items found</div>
          ) : filteredStock.map((row) => (
            <div key={row.id} onClick={() => handleRowClick(row)} className={`rounded-xl border p-4 cursor-pointer transition-all ${editingStock?.id === row.id ? 'border-blue-500 bg-blue-500/10' : 'border-[--border-color] bg-[--bg-card]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm truncate">{row.material_name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Batch: {row.batch_number} / Roll: {row.roll_number || '-'}</p>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs whitespace-nowrap">{row.location}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                {row.quantity && <span>{row.quantity} m²</span>}
                {row.length_m && <span>{row.length_m} m</span>}
                {row.expiry_date && <span>Exp: {format(new Date(row.expiry_date), 'dd/MM/yy')}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6 overflow-x-auto hidden md:block">
        <div className="rounded-xl border border-[--border-color] overflow-x-auto shadow-xl bg-[--bg-card] min-w-full">
          <table className="w-full min-w-full">
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
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-slate-500 bg-slate-900/50">
                    No stock items found
                  </td>
                </tr>
              ) : groupBy === 'none' ? (
                filteredStock.map((row, rowIdx) => (
                  <ContextMenu key={row.id || rowIdx}>
                    <ContextMenuTrigger asChild>
                        <tr
                         onClick={() => handleRowClick(row)}
                           className={`border-b transition-all duration-200 cursor-pointer ${
                           editingStock?.id === row.id 
                             ? 'bg-blue-500/15 border-l-4 border-l-blue-500 border-b-transparent hover:bg-blue-500/20'
                             : row.expiry_date && new Date(row.expiry_date) < new Date()
                               ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
                               : row.expiry_date && (new Date(row.expiry_date) - new Date()) < 30 * 24 * 60 * 60 * 1000
                                 ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                                 : 'border-slate-800/50 hover:bg-slate-800 hover:border-slate-700'
                           }`}
                         >
                        {columns.map((col, colIdx) => (
                          <td key={colIdx} className={`py-4 px-4 text-sm first:pl-6 ${
                            editingStock?.id === row.id ? 'text-slate-100' : 'text-slate-200'
                          }`}>
                            {col.cell ? col.cell(row) : row[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-[#1e293b] border-slate-700 shadow-xl">
                      <ContextMenuItem
                        onClick={() => {
                          localStorage.setItem('selected_material_id', row.material_id);
                          navigate(createPageUrl('Materials'));
                        }}
                        className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Material
                      </ContextMenuItem>
                      {!showArchived && (
                        <>
                          <ContextMenuItem
                            onClick={() => handleTransferClick(row)}
                            className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Transfer
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleReLifeClick(row)}
                            className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Re-Life
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => {
                              setEditingStock(row);
                              setArchiveConfirmOpen(true);
                            }}
                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </ContextMenuItem>
                        </>
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
              ) : (
                (() => {
                  const grouped = filteredStock.reduce((acc, item) => {
                    let key;
                    if (groupBy === 'part_number') key = item.material_name || 'Unknown';
                    else if (groupBy === 'expiry') key = item.expiry_date ? format(new Date(item.expiry_date), 'yyyy-MM') : 'No Expiry';
                    else if (groupBy === 'location') key = item.location || 'Unknown';
                    
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  }, {});

                  return Object.entries(grouped).map(([groupKey, items]) => (
                    <React.Fragment key={groupKey}>
                      <tr className="bg-slate-800/70 border-b border-slate-700">
                        <td colSpan={columns.length} className="py-3 px-6 font-semibold text-slate-200 text-sm">
                          {groupBy === 'part_number' && `Part Number: ${groupKey}`}
                          {groupBy === 'expiry' && `Expiry: ${groupKey}`}
                          {groupBy === 'location' && `Location: ${groupKey}`}
                          <span className="ml-2 text-slate-400 font-normal">({items.length} items)</span>
                        </td>
                      </tr>
                      {items.map((row, rowIdx) => (
                        <ContextMenu key={row.id || rowIdx}>
                          <ContextMenuTrigger asChild>
                            <tr
                             onClick={() => handleRowClick(row)}
                              className={`border-b transition-all duration-200 cursor-pointer ${
                               editingStock?.id === row.id 
                                 ? "bg-blue-500/15 border-l-4 border-l-blue-500 border-b-transparent hover:bg-blue-500/20" 
                                 : "border-slate-800/50 hover:bg-slate-800 hover:border-slate-700"
                              }`}
                            >
                              {columns.map((col, colIdx) => (
                                <td key={colIdx} className={`py-4 px-4 text-sm first:pl-6 ${
                                  editingStock?.id === row.id ? 'text-slate-100' : 'text-slate-200'
                                }`}>
                                  {col.cell ? col.cell(row) : row[col.accessor]}
                                </td>
                              ))}
                            </tr>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="bg-[#1e293b] border-slate-700 shadow-xl">
                            <ContextMenuItem
                              onClick={() => {
                                localStorage.setItem('selected_material_id', row.material_id);
                                navigate(createPageUrl('Materials'));
                              }}
                              className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Material
                            </ContextMenuItem>
                            {!showArchived && (
                              <>
                                <ContextMenuItem
                                  onClick={() => handleTransferClick(row)}
                                  className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Transfer
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => handleReLifeClick(row)}
                                  className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Re-Life
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => {
                                    setEditingStock(row);
                                    setArchiveConfirmOpen(true);
                                  }}
                                  className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </ContextMenuItem>
                              </>
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
                      ))}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
        </div>
        </div>{/* closes hidden md:block desktop table wrapper */}

      {/* Mobile Filter Dialog */}
      <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Filter & Sort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Search by</Label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="part_number" checked={searchCriteria === 'part_number'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-sm text-slate-300">Part Number</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="batch" checked={searchCriteria === 'batch'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-sm text-slate-300">Batch</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" value="material" checked={searchCriteria === 'material'} onChange={(e) => setSearchCriteria(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" /><span className="text-sm text-slate-300">Material</span></label>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Location</Label>
              <div className="flex flex-wrap gap-2">
                {locations.filter(l => l.value !== 'all').map((loc) => (
                  <button key={loc.value} onClick={() => { if (locationFilter.includes(loc.value)) { setLocationFilter(locationFilter.filter(l => l !== loc.value)); } else { setLocationFilter([...locationFilter, loc.value]); } }} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${locationFilter.includes(loc.value) ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>{loc.label}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.filter(s => s.value !== 'all').map((s) => (
                  <button key={s.value} onClick={() => { if (statusFilter.includes(s.value)) { setStatusFilter(statusFilter.filter(f => f !== s.value)); } else { setStatusFilter([...statusFilter, s.value]); } }} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${statusFilter.includes(s.value) ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>{s.label}</button>
                ))}
              </div>
            </div>
            {categories.length > 0 && (
              <div>
                <Label className="text-slate-300 text-xs mb-2 block">Category</Label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setTypeFilter('all'); localStorage.setItem('selected_category_filter', 'all'); }} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${typeFilter === 'all' ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>All</button>
                  {categories.map((c) => (
                    <button key={c} onClick={() => { setTypeFilter(c); localStorage.setItem('selected_category_filter', c); }} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${typeFilter === c ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Sort By</Label>
              <Select value={sortBy || 'none'} onValueChange={(v) => setSortBy(v === 'none' ? null : v)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  <SelectItem value="none" className="text-slate-300 focus:bg-slate-700/50">None</SelectItem>
                  <SelectItem value="material_name" className="text-slate-300 focus:bg-slate-700/50">Part Number</SelectItem>
                  <SelectItem value="batch_number" className="text-slate-300 focus:bg-slate-700/50">Batch Number</SelectItem>
                  <SelectItem value="expiry_date" className="text-slate-300 focus:bg-slate-700/50">Expiry Date</SelectItem>
                  <SelectItem value="location" className="text-slate-300 focus:bg-slate-700/50">Location</SelectItem>
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
              <Button variant="outline" onClick={() => { setLocationFilter([]); setStatusFilter([]); setTypeFilter('all'); setSortBy(null); setSortOrder('asc'); }} className="flex-1 border-slate-600 text-slate-300">Reset</Button>
              <Button onClick={() => setMobileFilterOpen(false)} className="flex-1 bg-[--primary] hover:bg-[--primary-hover] text-white">Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Traceability Dialog */}
      <Dialog open={traceabilityDialogOpen} onOpenChange={setTraceabilityDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#1e293b] border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white max-w-4xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Stock Traceability Graph</DialogTitle>
          </DialogHeader>
          {editingStock && (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/30 rounded-lg p-3 border border-slate-300 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">Stock ID: <span className="text-slate-900 dark:text-slate-200 font-medium">{editingStock.stock_id}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Material: <span className="text-slate-900 dark:text-slate-200 font-medium">{editingStock.material_name}</span></p>
              </div>
              
              {getStockTimeline(editingStock).length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getStockTimeline(editingStock)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#cbd5e1" : "#64748b"} opacity={isLightMode ? 1 : 0.3} />
                      <XAxis 
                        dataKey="dateFormatted" 
                        stroke={isLightMode ? "#64748b" : "#cbd5e1"}
                        tick={{ fill: isLightMode ? '#475569' : '#e2e8f0', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke={isLightMode ? "#64748b" : "#cbd5e1"}
                        tick={{ fill: isLightMode ? '#475569' : '#e2e8f0', fontSize: 12 }}
                        label={{ value: 'Quantity (m²)', angle: -90, position: 'insideLeft', fill: isLightMode ? '#475569' : '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isLightMode ? '#ffffff' : '#0f172a', 
                          border: '2px solid #06b6d4',
                          borderRadius: '8px',
                          color: isLightMode ? '#0f172a' : '#f1f5f9'
                        }}
                        labelStyle={{ color: isLightMode ? '#475569' : '#e2e8f0', fontWeight: '600' }}
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="quantity" 
                        stroke={isLightMode ? "#2563eb" : "#3b82f6"} 
                        strokeWidth={3}
                        dot={false}
                      />
                      {getStockTimeline(editingStock).map((event, idx) => (
                        <ReferenceDot
                          key={idx}
                          x={event.dateFormatted}
                          y={event.quantity}
                          r={8}
                          fill={
                            event.type === 'created' ? (isLightMode ? '#10b981' : '#34d399') :
                            event.type === 'transfer' ? (isLightMode ? '#f59e0b' : '#fbbf24') :
                            event.type === 'relife' ? (isLightMode ? '#8b5cf6' : '#a78bfa') :
                            (isLightMode ? '#2563eb' : '#3b82f6')
                          }
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No traceability events recorded yet</p>
                </div>
              )}
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-700 dark:text-slate-400">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-slate-700 dark:text-slate-400">Transfer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-slate-700 dark:text-slate-400">Re-Life</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Transfer Stock</DialogTitle>
        </DialogHeader>
          {transferringStock && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Stock Item</Label>
                <p className="text-slate-400 text-sm mt-1">{transferringStock.stock_id}</p>
                <p className="text-slate-200 text-sm">{transferringStock.material_name}</p>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">From Location</Label>
                <p className="text-slate-200 mt-1">{transferringStock.location}</p>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">To Location *</Label>
                <Select 
                  value={transferFormData.to_location} 
                  onValueChange={(v) => setTransferFormData({ ...transferFormData, to_location: v })}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    {locations.filter(l => l.value !== 'all' && l.value !== transferringStock.location).map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Transfer Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={transferFormData.transfer_date}
                  onChange={(e) => setTransferFormData({ ...transferFormData, transfer_date: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransferDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[--primary] hover:bg-[--primary-hover] text-white"
                  disabled={!transferFormData.to_location}
                >
                  Transfer
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Re-Life Dialog */}
      <Dialog open={reLifeDialogOpen} onOpenChange={setReLifeDialogOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Re-Life Stock</DialogTitle>
          </DialogHeader>
          {reLifeStock && (
            <form onSubmit={handleReLifeSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Stock Item</Label>
                <p className="text-slate-400 text-sm mt-1">{reLifeStock.stock_id}</p>
                <p className="text-slate-200 text-sm">{reLifeStock.material_name}</p>
                {reLifeStock.expiry_date && (
                  <p className="text-slate-400 text-xs mt-1">
                    Current Expiry: {format(new Date(reLifeStock.expiry_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-slate-300 text-sm">New Expiry Date *</Label>
                <Input
                  type="date"
                  value={reLifeFormData.new_expiry_date}
                  onChange={(e) => setReLifeFormData({ ...reLifeFormData, new_expiry_date: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                  required
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <Checkbox
                  id="apply-to-batch"
                  checked={reLifeFormData.apply_to_batch}
                  onCheckedChange={(checked) => setReLifeFormData({ ...reLifeFormData, apply_to_batch: checked })}
                  className="border-slate-600 data-[state=checked]:bg-[--primary]"
                />
                <Label htmlFor="apply-to-batch" className="text-slate-300 text-sm cursor-pointer">
                  Apply to all rolls in batch {reLifeStock.batch_number}
                  <span className="block text-xs text-slate-400 mt-0.5">
                    ({stock.filter(s => s.batch_id === reLifeStock.batch_id && !s.archived).length} items)
                  </span>
                </Label>
              </div>
              <div>
                <Label className="text-slate-300 text-sm mb-2 block">Re-Life Documentation</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReLifeFormData({ ...reLifeFormData, attachment_type: 'upload' })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        reLifeFormData.attachment_type === 'upload'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setReLifeFormData({ ...reLifeFormData, attachment_type: 'link' })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        reLifeFormData.attachment_type === 'link'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      Link
                    </button>
                  </div>
                  {reLifeFormData.attachment_type === 'upload' ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="relife-file-upload"
                        disabled={uploadingFile}
                      />
                      <label
                        htmlFor="relife-file-upload"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/50 hover:border-cyan-500 transition-all ${
                          uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingFile ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
                            <span className="text-slate-400 text-sm">Uploading...</span>
                          </>
                        ) : reLifeFormData.attachment_url && reLifeFormData.attachment_type === 'upload' ? (
                          <>
                            <Upload className="h-4 w-4 text-emerald-500" />
                            <span className="text-emerald-400 text-sm">File uploaded ✓</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Upload PDF or Image</span>
                          </>
                        )}
                      </label>
                    </div>
                  ) : (
                    <Input
                      type="url"
                      value={reLifeFormData.attachment_url}
                      onChange={(e) => setReLifeFormData({ ...reLifeFormData, attachment_url: e.target.value })}
                      placeholder="https://example.com/document.pdf"
                      className="bg-slate-800/50 border-slate-700 text-slate-200"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReLifeDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[--primary] hover:bg-[--primary-hover] text-white"
                  disabled={reLifeMutation.isPending || uploadingFile}
                >
                  {reLifeMutation.isPending ? 'Processing...' : 'Re-Life'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Archive Stock Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Are you sure you want to archive <strong>{editingStock?.stock_id}</strong>?
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
                onClick={handleArchiveStock}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingStock ? 'Edit Stock Item' : 'Add Batches & Stock'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {editingStock ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Roll Number</Label>
                    <Input
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Location *</Label>
                    <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-slate-700">
                        {locations.filter(l => l.value !== 'all').map((l) => (
                          <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50">
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">M²</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Width (mm)</Label>
                    <Input
                      type="number"
                      value={formData.width_mm}
                      onChange={(e) => setFormData({ ...formData, width_mm: e.target.value })}
                      className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Length (m)</Label>
                    <Input
                      type="number"
                      value={formData.length_m}
                      onChange={(e) => setFormData({ ...formData, length_m: e.target.value })}
                      className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {batchesWithRolls.map((batch, batchIdx) => {
                  const material = materials.find(m => m.id === batch.material_id);
                  
                  return (
                    <div key={batchIdx} className="border border-slate-700 rounded-lg p-4 space-y-4 bg-slate-800/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-200">Material {batchIdx + 1}</h3>
                        {batchesWithRolls.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setBatchesWithRolls(batchesWithRolls.filter((_, i) => i !== batchIdx))}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Material Selection */}
                      <div>
                        <Label className="text-slate-300">Material *</Label>
                        <Popover open={materialPopoverOpen[batchIdx]} onOpenChange={(open) => setMaterialPopoverOpen({...materialPopoverOpen, [batchIdx]: open})}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between bg-slate-800/50 border-slate-700 text-slate-200 mt-1 hover:bg-slate-700/50"
                            >
                              {batch.material_id
                                ? `${material?.part_number} - ${material?.description || ''}`
                                : "Select material..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-[#1e293b] border-slate-700">
                            <Command className="bg-[#1e293b]">
                              <CommandInput placeholder="Search material..." className="text-white" />
                              <CommandEmpty className="text-slate-400 py-6 text-center text-sm">No material found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {materials.map((m) => (
                                  <CommandItem
                                    key={m.id}
                                    value={m.part_number + ' ' + (m.description || '')}
                                    onSelect={() => {
                                      const updated = [...batchesWithRolls];
                                      updated[batchIdx] = {
                                        ...updated[batchIdx],
                                        material_id: m.id,
                                        rolls: updated[batchIdx].rolls.map(r => ({
                                          ...r,
                                          width_mm: r.width_mm || m.default_width || ''
                                        }))
                                      };
                                      setBatchesWithRolls(updated);
                                      setMaterialPopoverOpen({...materialPopoverOpen, [batchIdx]: false});
                                    }}
                                    className="text-slate-300 aria-selected:bg-slate-700/50 cursor-pointer"
                                  >
                                    {m.part_number} - {m.description}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {batch.material_id && (
                        <>
                          {/* Batch Info */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded border border-slate-700">
                            <div className="col-span-2">
                              <Label className="text-slate-300 text-xs">Batch Number *</Label>
                              <Input
                                value={batch.batch_number}
                                onChange={(e) => {
                                  const updated = [...batchesWithRolls];
                                  updated[batchIdx].batch_number = e.target.value;
                                  setBatchesWithRolls(updated);
                                }}
                                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1 h-8"
                                placeholder="Batch number"
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-slate-300 text-xs">Manufacture Date</Label>
                              <Input
                                type="date"
                                value={batch.manufacture_date}
                                onChange={(e) => {
                                  const updated = [...batchesWithRolls];
                                  updated[batchIdx].manufacture_date = e.target.value;
                                  setBatchesWithRolls(updated);
                                }}
                                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1 h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-300 text-xs">Expiry Date</Label>
                              <Input
                                type="date"
                                value={batch.expiry_date}
                                onChange={(e) => {
                                  const updated = [...batchesWithRolls];
                                  updated[batchIdx].expiry_date = e.target.value;
                                  setBatchesWithRolls(updated);
                                }}
                                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1 h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-slate-300 text-xs">Supplier</Label>
                              <Input
                                value={batch.supplier}
                                onChange={(e) => {
                                  const updated = [...batchesWithRolls];
                                  updated[batchIdx].supplier = e.target.value;
                                  setBatchesWithRolls(updated);
                                }}
                                className="bg-slate-800/50 border-slate-700 text-slate-200 mt-1 h-8"
                                placeholder="Supplier name"
                              />
                            </div>
                          </div>

                          {/* Rolls Table */}
                          <div>
                            <Label className="text-slate-300 text-sm mb-2 block">Rolls</Label>
                            <RollsTable
                              rolls={batch.rolls}
                              batchIdx={batchIdx}
                              batchesWithRolls={batchesWithRolls}
                              setBatchesWithRolls={setBatchesWithRolls}
                              locations={locations}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = [...batchesWithRolls];
                                updated[batchIdx].rolls.push({ 
                                  roll_number: '', 
                                  location: '', 
                                  measurement_type: 'm2', 
                                  value: '', 
                                  width_mm: material?.default_width || '' 
                                });
                                setBatchesWithRolls(updated);
                              }}
                              className="border-[#444] text-gray-300 hover:bg-[#333] w-full mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Roll
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBatchesWithRolls([...batchesWithRolls, {
                    material_id: '',
                    batch_number: '',
                    manufacture_date: '',
                    expiry_date: '',
                    supplier: '',
                    rolls: [{ roll_number: '', location: '', measurement_type: 'm2', value: '', width_mm: '' }]
                  }])}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Material
                </Button>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">
                Cancel
              </Button>
              <Button type="submit" className="bg-[--primary] hover:bg-[--primary-hover] text-white">
                {editingStock ? 'Update' : 'Create Stock'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}