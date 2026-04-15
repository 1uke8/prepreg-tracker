import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/common/DataTable';
import PageToolbar from '../components/common/PageToolbar';
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileText, Settings, FolderTree, Plus, Trash2, Archive, ChevronLeft, ChevronRight, SlidersHorizontal, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileDetailSheet from '../components/common/MobileDetailSheet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const defaultCategories = ['Composite', 'Resin Film', 'Elastomer', 'Adhesive', 'Core']; // This default is now mostly illustrative, actual defaults come from settings if present

export default function Materials() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState(() => {
    return localStorage.getItem('selected_category_filter') || 'all';
  });
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [sidebarView, setSidebarView] = useState('details');
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const { data: categoriesSettings, isLoading: categoriesLoading } = useQuery({
    queryKey: ['settings', 'material_categories'],
    queryFn: async () => {
      const settings = await base44.entities.Settings.filter({ key: 'material_categories' });
      return settings[0] || null;
    },
  });

  const [categories, setCategories] = useState([]); // Initialized as empty, populated by useEffect
  const [newCategory, setNewCategory] = useState('');
  const [searchType, setSearchType] = useState('part_number');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('materials_visible_columns');
    return saved ? JSON.parse(saved) : {
      part_number: true,
      description: true,
      category: true,
      consumption: true,
      default_width: true,
      default_out_life: true,
      items_in_stock: true,
      total_length: true,
      total_area: true
    };
  });
  const [formData, setFormData] = useState({
    part_number: '',
    description: '',
    category: '', // Changed to empty string, as categories are dynamic
    consumption: '',
    can_re_life: false,
    track_hours: false,
    track_expiry: false,
    is_logged: false,
    default_width: '',
    default_preparation_time: '',
    default_out_life: '',
    out_life_remaining_short: '',
    out_life_remaining_critical: '',
    expiry_days_short: '',
    expiry_days_critical: ''
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['stock'],
    queryFn: () => base44.entities.Stock.list(),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => base44.entities.Batch.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Material.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Material created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Material.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Material updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Material.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material deleted');
      setEditingMaterial(null);
    },
    onError: () => toast.error('Failed to delete material'),
  });

  const resetForm = () => {
    setFormData({
      part_number: '',
      description: '',
      category: categories[0] || '', // Updated default category logic
      consumption: '',
      can_re_life: false,
      track_hours: false,
      track_expiry: false,
      is_logged: false,
      default_width: '',
      default_preparation_time: '',
      default_out_life: '',
      out_life_remaining_short: '',
      out_life_remaining_critical: '',
      expiry_days_short: '',
      expiry_days_critical: ''
    });
    setEditingMaterial(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleRowClick = (material) => {
    setEditingMaterial(material);
    setFormData({
      part_number: material.part_number || '',
      description: material.description || '',
      category: material.category || categories[0] || '', // Updated default category logic
      consumption: material.consumption || '',
      can_re_life: material.can_re_life || false,
      track_hours: material.track_hours || false,
      track_expiry: material.track_expiry || false,
      is_logged: material.is_logged || false,
      default_width: material.default_width || '',
      default_preparation_time: material.default_preparation_time || '',
      default_out_life: material.default_out_life || '',
      out_life_remaining_short: material.out_life_remaining_short || '',
      out_life_remaining_critical: material.out_life_remaining_critical || '',
      expiry_days_short: material.expiry_days_short || '',
      expiry_days_critical: material.expiry_days_critical || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      default_width: formData.default_width ? Number(formData.default_width) : null,
      default_preparation_time: formData.default_preparation_time ? Number(formData.default_preparation_time) : null,
      default_out_life: formData.default_out_life ? Number(formData.default_out_life) : null,
      out_life_remaining_short: formData.out_life_remaining_short ? Number(formData.out_life_remaining_short) : null,
      out_life_remaining_critical: formData.out_life_remaining_critical ? Number(formData.out_life_remaining_critical) : null,
      expiry_days_short: formData.expiry_days_short ? Number(formData.expiry_days_short) : null,
      expiry_days_critical: formData.expiry_days_critical ? Number(formData.expiry_days_critical) : null,
    };

    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Single-pass aggregation over stock — computed once when stock changes,
  // not on every table row render (avoids O(n×m) repeated filter scans).
  const stockByMaterial = React.useMemo(() => {
    return stock.reduce((acc, s) => {
      if (!s.archived) {
        if (!acc[s.material_id]) acc[s.material_id] = { count: 0, length: 0, area: 0 };
        acc[s.material_id].count++;
        acc[s.material_id].length += s.length_m || 0;
        acc[s.material_id].area  += s.quantity  || 0;
      }
      return acc;
    }, {});
  }, [stock]);

  const getItemsInStock = (materialId) => stockByMaterial[materialId]?.count  ?? 0;
  const getTotalLength  = (materialId) => stockByMaterial[materialId]?.length ?? 0;
  const getTotalArea    = (materialId) => stockByMaterial[materialId]?.area   ?? 0;

  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list(),
  });

  // Compute consumption by month for the selected material
  // Consumption = transfers where stock moves OUT of freezer (to a non-freezer location)
  // i.e. to_location is NOT a freezer. We exclude returns to freezer.
  const freezerLocations = ['Freezer A', 'Freezer B', 'Freezer C'];

  const usageChartData = React.useMemo(() => {
    if (!editingMaterial) return [];
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), usage: 0 });
    }
    // Only count transfers where this material moves OUT of freezer (consumption), not moves back in
    transfers.forEach(t => {
      if (t.material_name !== editingMaterial.part_number) return;
      // Must be moving FROM a freezer TO a non-freezer (actual consumption/use)
      const isFromFreezer = freezerLocations.some(f => t.from_location?.includes('Freezer') || t.from_location?.toLowerCase().includes('freezer'));
      const isToFreezer = freezerLocations.some(f => t.to_location?.includes('Freezer') || t.to_location?.toLowerCase().includes('freezer'));
      // Skip if destination is a freezer (it's a return, not consumption)
      if (isToFreezer) return;
      const date = t.transfer_date ? new Date(t.transfer_date) : null;
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find(m => m.key === key);
      if (month) month.usage += t.quantity || 0;
    });
    return months;
  }, [transfers, editingMaterial]);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c }))
  ];

  const filteredMaterials = materials.filter((m) => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (search) {
      if (searchType === 'part_number' && !m.part_number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (searchType === 'description' && !m.description?.toLowerCase().includes(search.toLowerCase())) return false;
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
    { key: 'part_number', header: 'Part Number', accessor: 'part_number', width: '200px' },
    { key: 'description', header: 'Description', accessor: 'description' },
    { key: 'category', header: 'Category', accessor: 'category' },
    { key: 'consumption', header: 'Consumption', accessor: 'consumption' },
    { key: 'can_re_life', header: 'Can Re-Life', cell: (row) => row.can_re_life ? 'Yes' : 'No' },
    { key: 'track_hours', header: 'Track Hours', cell: (row) => row.track_hours ? 'Yes' : 'No' },
    { key: 'track_expiry', header: 'Track Expiry', cell: (row) => row.track_expiry ? 'Yes' : 'No' },
    { key: 'is_logged', header: 'Is Logged', cell: (row) => row.is_logged ? 'Yes' : 'No' },
    { key: 'default_width', header: 'Default Width', cell: (row) => row.default_width ? `${row.default_width} mm` : '-' },
    { key: 'default_preparation_time', header: 'Default Prep Time', cell: (row) => row.default_preparation_time ? `${row.default_preparation_time} min` : '-' },
    { key: 'default_out_life', header: 'Default Out-Life', cell: (row) => row.default_out_life ? `${row.default_out_life} hrs` : '-' },
    { key: 'out_life_remaining_short', header: 'Out-Life Short', cell: (row) => row.out_life_remaining_short ? `${row.out_life_remaining_short} hrs` : '-' },
    { key: 'out_life_remaining_critical', header: 'Out-Life Critical', cell: (row) => row.out_life_remaining_critical ? `${row.out_life_remaining_critical} hrs` : '-' },
    { key: 'expiry_days_short', header: 'Expiry Days Short', cell: (row) => row.expiry_days_short ? `${row.expiry_days_short} days` : '-' },
    { key: 'expiry_days_critical', header: 'Expiry Days Critical', cell: (row) => row.expiry_days_critical ? `${row.expiry_days_critical} days` : '-' },
    { key: 'items_in_stock', header: 'Items In Stock', cell: (row) => { const count = getItemsInStock(row.id); return <span className={count === 0 ? 'text-amber-400 font-medium' : ''}>{count}</span>; } },
    { key: 'total_length', header: 'Total Length', cell: (row) => `${getTotalLength(row.id).toFixed(2)} m` },
    { key: 'total_area', header: 'Total Area', cell: (row) => `${getTotalArea(row.id).toFixed(2)} m²` },
  ];

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('materials_column_order');
    if (saved) {
      const savedKeys = JSON.parse(saved);
      return savedKeys.map(key => defaultColumnOrder.find(col => col.key === key)).filter(Boolean);
    }
    return defaultColumnOrder;
  });

  const allColumns = columnOrder;

  const columns = allColumns.filter(col => visibleColumns[col.key]);

  const [isEditing, setIsEditing] = useState(false);

  const handleDeleteMaterial = () => {
    deleteMutation.mutate(editingMaterial.id);
    setDeleteConfirmOpen(false);
  };

  const updateCategoriesMutation = useMutation({
    mutationFn: async (newCategories) => {
      if (categoriesSettings) {
        if (newCategories.length === 0) {
          // If all categories are removed, delete the settings record
          return base44.entities.Settings.delete(categoriesSettings.id);
        } else {
          return base44.entities.Settings.update(categoriesSettings.id, { value: newCategories });
        }
      } else if (newCategories.length > 0) {
        // If settings don't exist but we have categories, create it
        return base44.entities.Settings.create({ key: 'material_categories', value: newCategories });
      }
      // No action needed if settings don't exist and newCategories is empty
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'material_categories'] });
      window.dispatchEvent(new Event('categoriesUpdated'));
    },
  });

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    const newCategories = [...categories, newCategory.trim()];
    setCategories(newCategories);
    updateCategoriesMutation.mutate(newCategories);
    setNewCategory('');
    toast.success('Category added');
  };

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryConfirmOpen(true);
  };

  const confirmDeleteCategory = () => {
    const newCategories = categories.filter(c => c !== categoryToDelete);
    setCategories(newCategories);
    updateCategoriesMutation.mutate(newCategories);
    
    if (categoryFilter === categoryToDelete) {
      setCategoryFilter('all');
    }
    
    toast.success('Category removed');
    setDeleteCategoryConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const handleColumnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setColumnOrder(items);
    localStorage.setItem('materials_column_order', JSON.stringify(items.map(col => col.key)));
  };

  const handleCategoryDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCategories(items);
    updateCategoriesMutation.mutate(items);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      default_width: formData.default_width ? Number(formData.default_width) : null,
      default_preparation_time: formData.default_preparation_time ? Number(formData.default_preparation_time) : null,
      default_out_life: formData.default_out_life ? Number(formData.default_out_life) : null,
      out_life_remaining_short: formData.out_life_remaining_short ? Number(formData.out_life_remaining_short) : null,
      out_life_remaining_critical: formData.out_life_remaining_critical ? Number(formData.out_life_remaining_critical) : null,
      expiry_days_short: formData.expiry_days_short ? Number(formData.expiry_days_short) : null,
      expiry_days_critical: formData.expiry_days_critical ? Number(formData.expiry_days_critical) : null,
    };

    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data });
    }
    setIsEditing(false);
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 56; // Subtract left sidebar width
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
      if (categoriesSettings?.value) {
        setCategories(categoriesSettings.value);
      } else {
        // If settings record doesn't exist or has no value, initialize with defaultCategories
        setCategories(defaultCategories);
        // And create the settings record with default categories
        updateCategoriesMutation.mutate(defaultCategories);
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
    const selectedMaterialId = localStorage.getItem('selected_material_id');
    if (selectedMaterialId) {
      const material = materials.find(m => m.id === selectedMaterialId);
      if (material) {
        setEditingMaterial(material);
        setFormData({
          part_number: material.part_number || '',
          description: material.description || '',
          category: material.category || '', // Updated default category logic
          consumption: material.consumption || '',
          can_re_life: material.can_re_life || false,
          track_hours: material.track_hours || false,
          track_expiry: material.track_expiry || false,
          is_logged: material.is_logged || false,
          default_width: material.default_width || '',
          default_preparation_time: material.default_preparation_time || '',
          default_out_life: material.default_out_life || '',
          out_life_remaining_short: material.out_life_remaining_short || '',
          out_life_remaining_critical: material.out_life_remaining_critical || '',
          expiry_days_short: material.expiry_days_short || '',
          expiry_days_critical: material.expiry_days_critical || ''
        });
        localStorage.removeItem('selected_material_id');
        return;
      }
    }

    if (filteredMaterials.length > 0 && !editingMaterial) {
      const firstMaterial = filteredMaterials[0];
      setEditingMaterial(firstMaterial);
      setFormData({
        part_number: firstMaterial.part_number || '',
        description: firstMaterial.description || '',
        category: firstMaterial.category || '', // Updated default category logic
        consumption: firstMaterial.consumption || '',
        can_re_life: firstMaterial.can_re_life || false,
        track_hours: firstMaterial.track_hours || false,
        track_expiry: firstMaterial.track_expiry || false,
        is_logged: firstMaterial.is_logged || false,
        default_width: firstMaterial.default_width || '',
        default_preparation_time: firstMaterial.default_preparation_time || '',
        default_out_life: firstMaterial.default_out_life || '',
        out_life_remaining_short: firstMaterial.out_life_remaining_short || '',
        out_life_remaining_critical: firstMaterial.out_life_remaining_critical || '',
        expiry_days_short: firstMaterial.expiry_days_short || '',
        expiry_days_critical: firstMaterial.expiry_days_critical || ''
      });
    }
  }, [materials, categories]); // Added categories to dependency array to ensure formData update gets latest categories

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
          onClick={() => setSidebarView('stock')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            sidebarView === 'stock' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
          title="Stock Levels Summary"
        >
          <Archive className="h-4 w-4" />
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
            {sidebarView === 'settings' ? 'Column Settings' : sidebarView === 'stock' ? 'Stock Levels Summary' : 'Material Details'}
          </h2>
          <div className="flex gap-2">
            {sidebarView === 'details' && editingMaterial && !isEditing && (
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
                  if (editingMaterial) {
                    setFormData({
                      part_number: editingMaterial.part_number || '',
                      description: editingMaterial.description || '',
                      category: editingMaterial.category || '', // Updated default category logic
                      consumption: editingMaterial.consumption || '',
                      can_re_life: editingMaterial.can_re_life || false,
                      track_hours: editingMaterial.track_hours || false,
                      track_expiry: editingMaterial.track_expiry || false,
                      is_logged: editingMaterial.is_logged || false,
                      default_width: editingMaterial.default_width || '',
                      default_preparation_time: editingMaterial.default_preparation_time || '',
                      default_out_life: editingMaterial.default_out_life || '',
                      out_life_remaining_short: editingMaterial.out_life_remaining_short || '',
                      out_life_remaining_critical: editingMaterial.out_life_remaining_critical || '',
                      expiry_days_short: editingMaterial.expiry_days_short || '',
                      expiry_days_critical: editingMaterial.expiry_days_critical || ''
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

        {sidebarView === 'settings' ? (
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
                            className={`flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors ${
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
                                localStorage.setItem('materials_visible_columns', JSON.stringify(newVisibleColumns));
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
        ) : sidebarView === 'stock' ? (
         !editingMaterial ? (
           <div className="text-center text-slate-500 mt-20">
             <p>Select a material to view stock levels</p>
           </div>
         ) : (
           <div className="space-y-4">
             {(() => {
               const materialStock = stock.filter(s => s.material_id === editingMaterial.id && !s.archived);
               const batchGroups = materialStock.reduce((acc, item) => {
                 if (!acc[item.batch_id]) {
                   acc[item.batch_id] = {
                     batch_number: item.batch_number,
                     batch_id: item.batch_id,
                     items: [],
                     total_length: 0,
                     total_quantity: 0
                   };
                 }
                 acc[item.batch_id].items.push(item);
                 acc[item.batch_id].total_length += item.length_m || 0;
                 acc[item.batch_id].total_quantity += item.quantity || 0;
                 return acc;
               }, {});

               const batchList = Object.values(batchGroups);

               if (batchList.length === 0) {
                 return (
                   <div className="text-center text-slate-500 mt-10">
                     <p>No stock items available for this material</p>
                   </div>
                 );
               }

               const chartData = batchList.map(batch => ({
                 name: batch.batch_number || 'N/A',
                 quantity: parseFloat(batch.total_quantity.toFixed(2))
               }));

               return (
                 <>
                   <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                     <Label className="text-slate-400 text-xs mb-3 block">Stock Levels by Batch</Label>
                     <ResponsiveContainer width="100%" height={200}>
                       <BarChart data={chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                         <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                         <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                         <Tooltip 
                           contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }}
                           labelStyle={{ color: '#f1f5f9' }}
                         />
                         <Bar dataKey="quantity" fill="#2563eb" radius={[4, 4, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                   {batchList.map((batch) => {
                     const batchData = batches.find(b => b.id === batch.batch_id);
                     return (
                       <div key={batch.batch_id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
                         <div className="flex items-start justify-between mb-3">
                           <div>
                             <Label className="text-slate-400 text-xs">Batch Number</Label>
                             <p className="text-slate-100 font-medium">{batch.batch_number}</p>
                           </div>
                           <div className="text-right">
                             <Label className="text-slate-400 text-xs">Items</Label>
                             <p className="text-slate-200">{batch.items.length}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <Label className="text-slate-400 text-xs">Quantity (m²)</Label>
                             <p className="text-slate-200">{batch.total_quantity.toFixed(2)}</p>
                           </div>
                           <div>
                             <Label className="text-slate-400 text-xs">Total Length</Label>
                             <p className="text-slate-200">{batch.total_length.toFixed(2)} m</p>
                           </div>
                           <div>
                             <Label className="text-slate-400 text-xs">Expiry Date</Label>
                             <p className="text-slate-200">{batchData?.expiry_date ? new Date(batchData.expiry_date).toLocaleDateString() : '-'}</p>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </>
               );
             })()}
           </div>
         )
        ) : !editingMaterial ? (
          <div className="text-center text-slate-500 mt-20">
            <p>Select a material to view details</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300 text-xs">Part Number *</Label>
              <Input
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
                rows={3}
              />
            </div>
            {categories.length > 0 && ( // Conditional render for category select
              <div>
                <Label className="text-slate-300 text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-slate-300 focus:bg-slate-700/50">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-xs">Consumption</Label>
              <Input
                value={formData.consumption}
                onChange={(e) => setFormData({ ...formData, consumption: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.can_re_life}
                onCheckedChange={(checked) => setFormData({ ...formData, can_re_life: checked })}
                className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
              />
              <Label className="text-slate-300 text-xs">Can Re-Life</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.track_hours}
                onCheckedChange={(checked) => setFormData({ ...formData, track_hours: checked })}
                className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
              />
              <Label className="text-slate-300 text-xs">Track Hours</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.track_expiry}
                onCheckedChange={(checked) => setFormData({ ...formData, track_expiry: checked })}
                className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
              />
              <Label className="text-slate-300 text-xs">Track Expiry</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.is_logged}
                onCheckedChange={(checked) => setFormData({ ...formData, is_logged: checked })}
                className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
              />
              <Label className="text-slate-300 text-xs">Is Logged</Label>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Default Width (mm)</Label>
              <Input
                type="number"
                value={formData.default_width}
                onChange={(e) => setFormData({ ...formData, default_width: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Default Preparation Time (min)</Label>
              <Input
                type="number"
                value={formData.default_preparation_time}
                onChange={(e) => setFormData({ ...formData, default_preparation_time: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Default Out-Life (hrs)</Label>
              <Input
                type="number"
                value={formData.default_out_life}
                onChange={(e) => setFormData({ ...formData, default_out_life: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Out-Life Remaining Short (hrs)</Label>
              <Input
                type="number"
                value={formData.out_life_remaining_short}
                onChange={(e) => setFormData({ ...formData, out_life_remaining_short: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Out-Life Remaining Critical (hrs)</Label>
              <Input
                type="number"
                value={formData.out_life_remaining_critical}
                onChange={(e) => setFormData({ ...formData, out_life_remaining_critical: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Expiry Days Short</Label>
              <Input
                type="number"
                value={formData.expiry_days_short}
                onChange={(e) => setFormData({ ...formData, expiry_days_short: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Expiry Days Critical</Label>
              <Input
                type="number"
                value={formData.expiry_days_critical}
                onChange={(e) => setFormData({ ...formData, expiry_days_critical: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[['Part Number', editingMaterial.part_number || '-'], ['Description', editingMaterial.description || '-'], ['Category', editingMaterial.category || '-'], ['Consumption', editingMaterial.consumption || '-']].map(([label, value]) => (
              <div key={label}>
                <Label className="text-slate-400 text-xs">{label}</Label>
                <div onClick={() => { navigator.clipboard.writeText(value); }} className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors">
                  <p className="text-slate-200">{value}</p>
                  <svg className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </div>
              </div>
            ))}
            <div><Label className="text-slate-400 text-xs">Can Re-Life</Label><p className="text-slate-200 mt-1">{editingMaterial.can_re_life ? 'Yes' : 'No'}</p></div>
            <div><Label className="text-slate-400 text-xs">Track Hours</Label><p className="text-slate-200 mt-1">{editingMaterial.track_hours ? 'Yes' : 'No'}</p></div>
            <div><Label className="text-slate-400 text-xs">Track Expiry</Label><p className="text-slate-200 mt-1">{editingMaterial.track_expiry ? 'Yes' : 'No'}</p></div>
            <div><Label className="text-slate-400 text-xs">Is Logged</Label><p className="text-slate-200 mt-1">{editingMaterial.is_logged ? 'Yes' : 'No'}</p></div>
            {[['Default Width', editingMaterial.default_width ? `${editingMaterial.default_width} mm` : '-'], ['Default Prep Time', editingMaterial.default_preparation_time ? `${editingMaterial.default_preparation_time} min` : '-'], ['Default Out-Life', editingMaterial.default_out_life ? `${editingMaterial.default_out_life} hrs` : '-'], ['Out-Life Remaining Short', editingMaterial.out_life_remaining_short ? `${editingMaterial.out_life_remaining_short} hrs` : '-'], ['Out-Life Remaining Critical', editingMaterial.out_life_remaining_critical ? `${editingMaterial.out_life_remaining_critical} hrs` : '-'], ['Expiry Days Short', editingMaterial.expiry_days_short ? `${editingMaterial.expiry_days_short} days` : '-'], ['Expiry Days Critical', editingMaterial.expiry_days_critical ? `${editingMaterial.expiry_days_critical} days` : '-']].map(([label, value]) => (
              <div key={label}>
                <Label className="text-slate-400 text-xs">{label}</Label>
                <div onClick={() => { navigator.clipboard.writeText(value); }} className="flex items-center gap-2 mt-1 cursor-pointer group/copy hover:text-cyan-400 transition-colors">
                  <p className="text-slate-200">{value}</p>
                  <svg className="h-3 w-3 text-slate-500 opacity-0 group-hover/copy:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </div>
              </div>
            ))}
            <div>
              <Label className="text-slate-400 text-xs">Items In Stock</Label>
              <p className={`mt-1 font-medium ${getItemsInStock(editingMaterial.id) === 0 ? 'text-amber-400' : 'text-slate-200'}`}>{getItemsInStock(editingMaterial.id)}</p>
            </div>
            <div><Label className="text-slate-400 text-xs">Total Length</Label><p className="text-slate-200 mt-1">{getTotalLength(editingMaterial.id).toFixed(2)} m</p></div>
            <div><Label className="text-slate-400 text-xs">Total Area</Label><p className="text-slate-200 mt-1">{getTotalArea(editingMaterial.id).toFixed(2)} m²</p></div>
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
      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden bg-[--bg-dark]">
        {/* Custom Toolbar */}
        <div className="space-y-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAdd}
              size="sm"
              className="bg-[--primary] hover:bg-[--primary-hover] text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700"
              onClick={() => setCategoryManagementOpen(true)}
              title="Category Management"
            >
              <FolderTree className="h-4 w-4" />
            </Button>
            {editingMaterial && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-700"
                title="Delete Material"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowUsage(v => !v)}
              className={`border ${showUsage ? 'bg-[--primary] text-white border-[--primary]' : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Material Usage"
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop filters */}
          <div className="hidden md:block">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search by ${searchType === 'part_number' ? 'Part Number' : 'Description'}`}
                className="w-64 bg-slate-800/50 border-[--border-color] text-slate-200 h-9 focus:border-[--primary] focus:ring-1 focus:ring-[--primary]/20"
              />
            </div>
            <div className="flex items-center gap-3 mt-2 ml-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="part_number" checked={searchType === 'part_number'} onChange={(e) => setSearchType(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-xs text-slate-400">Part Number</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="description" checked={searchType === 'description'} onChange={(e) => setSearchType(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-xs text-slate-400">Description</span>
              </label>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              <button onClick={() => { setCategoryFilter('all'); localStorage.setItem('selected_category_filter', 'all'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${categoryFilter === 'all' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-[--border-color]'}`}>All</button>
              {categoryOptions.filter(c => c.value !== 'all').map((type) => (
                <button key={type.value} onClick={() => { setCategoryFilter(type.value); localStorage.setItem('selected_category_filter', type.value); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${categoryFilter === type.value ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-[--border-color]'}`}>{type.label}</button>
              ))}
            </div>
          )}

          {/* Mobile: search + filter button */}
          <div className="flex md:hidden items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-slate-800/50 border-[--border-color] text-slate-200 h-9"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMobileFilterOpen(true)}
              className={`border border-slate-700 h-9 px-3 ${(categoryFilter !== 'all' || sortBy) ? 'text-[--primary] border-[--primary]' : 'text-slate-400'}`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Table + Chart area */}
        <div className="flex flex-col flex-1 overflow-hidden gap-3">

        {/* Mobile card list */}
        <div className="md:hidden flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--primary] border-t-transparent" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No materials found</div>
          ) : filteredMaterials.map((row) => (
            <div
              key={row.id}
              onClick={() => { setIsEditing(false); setEditingMaterial(row); setFormData({ part_number: row.part_number || '', description: row.description || '', category: row.category || '', consumption: row.consumption || '', can_re_life: row.can_re_life || false, track_hours: row.track_hours || false, track_expiry: row.track_expiry || false, is_logged: row.is_logged || false, default_width: row.default_width || '', default_preparation_time: row.default_preparation_time || '', default_out_life: row.default_out_life || '', out_life_remaining_short: row.out_life_remaining_short || '', out_life_remaining_critical: row.out_life_remaining_critical || '', expiry_days_short: row.expiry_days_short || '', expiry_days_critical: row.expiry_days_critical || '' }); setDetailsModalOpen(true); }}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${editingMaterial?.id === row.id ? 'border-blue-500 bg-blue-500/10' : 'border-[--border-color] bg-[--bg-card]'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm truncate">{row.part_number}</p>
                  {row.description && <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{row.description}</p>}
                </div>
                {row.category && <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs whitespace-nowrap">{row.category}</span>}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span>{getItemsInStock(row.id)} in stock</span>
                {row.default_out_life && <span>Out-life: {row.default_out_life}h</span>}
                {row.consumption && <span>{row.consumption}</span>}
              </div>
            </div>
          ))}
        </div>{/* closes mobile card list */}

        {/* Desktop table */}
        <div className="hidden md:block flex-1 overflow-hidden rounded-xl border border-[--border-color] shadow-xl bg-[--bg-card]">
          <div className="overflow-auto h-full">
          <table className="w-full min-w-max">
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
                    style={{ width: col.width }}
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
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-slate-500 bg-slate-900/50">
                    No materials found
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((row, rowIdx) => (
                  <ContextMenu key={row.id || rowIdx}>
                    <ContextMenuTrigger asChild>
                      <tr
                       onClick={() => {
                          setIsEditing(false);
                          setEditingMaterial(row);
                          if (isMobile) setDetailsModalOpen(true);
                          setFormData({
                           part_number: row.part_number || '',
                           description: row.description || '',
                           category: row.category || '', // Updated default category logic
                           consumption: row.consumption || '',
                           can_re_life: row.can_re_life || false,
                           track_hours: row.track_hours || false,
                           track_expiry: row.track_expiry || false,
                           is_logged: row.is_logged || false,
                           default_width: row.default_width || '',
                           default_preparation_time: row.default_preparation_time || '',
                           default_out_life: row.default_out_life || '',
                           out_life_remaining_short: row.out_life_remaining_short || '',
                           out_life_remaining_critical: row.out_life_remaining_critical || '',
                           expiry_days_short: row.expiry_days_short || '',
                           expiry_days_critical: row.expiry_days_critical || ''
                         });
                       }}
                        className={`border-b transition-all duration-200 cursor-pointer ${
                         editingMaterial?.id === row.id 
                           ? "bg-blue-500/15 border-l-4 border-l-blue-500 border-b-transparent hover:bg-blue-500/20" 
                           : "border-slate-800/50 hover:bg-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {columns.map((col, colIdx) => (
                          <td key={colIdx} className={`py-4 px-4 text-sm first:pl-6 ${
                            editingMaterial?.id === row.id ? 'text-slate-100' : 'text-slate-200'
                          }`}>
                            {col.cell ? col.cell(row) : row[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-[#1e293b] border-slate-700 shadow-xl">
                      <ContextMenuItem
                        onClick={() => {
                          setEditingMaterial(row);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </tbody>
          </table>
          </div>{/* closes overflow-auto */}
        </div>{/* closes desktop table wrapper */}

        {/* Usage Chart Panel */}
        {showUsage && (
          <div className="flex-shrink-0 h-52 rounded-xl border border-[--border-color] bg-[--bg-card] shadow-xl px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-200">
                Consumption by Month{editingMaterial ? ` — ${editingMaterial.part_number}` : ''}
              </h3>
              <span className="text-xs text-slate-500">Qty moved out of freezer to production (last 12 months)</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={usageChartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9', fontSize: 12 }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="usage" fill="#2563eb" radius={[4, 4, 0, 0]} name="Usage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        </div>{/* closes table+chart flex column */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#2a2a2a] border-[#444] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add Material'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Part Number *</Label>
                <Input
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                  required
                />
              </div>
              {categories.length > 0 && ( // Conditional render for category select
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="bg-[#1e1e1e] border-[#444] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#444]">
                      {categories.map((c) => (
                        <SelectItem key={c} value={c} className="text-gray-300 focus:bg-[#333]">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-gray-300">Consumption</Label>
                <Input
                  value={formData.consumption}
                  onChange={(e) => setFormData({ ...formData, consumption: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Default Width (mm)</Label>
                <Input
                  type="number"
                  value={formData.default_width}
                  onChange={(e) => setFormData({ ...formData, default_width: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Default Prep Time (min)</Label>
                <Input
                  type="number"
                  value={formData.default_preparation_time}
                  onChange={(e) => setFormData({ ...formData, default_preparation_time: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Default Out-Life (hrs)</Label>
                <Input
                  type="number"
                  value={formData.default_out_life}
                  onChange={(e) => setFormData({ ...formData, default_out_life: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Out-Life Short (hrs)</Label>
                <Input
                  type="number"
                  value={formData.out_life_remaining_short}
                  onChange={(e) => setFormData({ ...formData, out_life_remaining_short: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Out-Life Critical (hrs)</Label>
                <Input
                  type="number"
                  value={formData.out_life_remaining_critical}
                  onChange={(e) => setFormData({ ...formData, out_life_remaining_critical: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Expiry Days Short</Label>
                <Input
                  type="number"
                  value={formData.expiry_days_short}
                  onChange={(e) => setFormData({ ...formData, expiry_days_short: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Expiry Days Critical</Label>
                <Input
                  type="number"
                  value={formData.expiry_days_critical}
                  onChange={(e) => setFormData({ ...formData, expiry_days_critical: e.target.value })}
                  className="bg-[#1e1e1e] border-[#444] text-white mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.can_re_life}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_re_life: checked })}
                  className="border-[#444] data-[state=checked]:bg-[#00857c]"
                />
                <Label className="text-gray-300 text-sm">Can Re-Life</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.track_hours}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_hours: checked })}
                  className="border-[#444] data-[state=checked]:bg-[#00857c]"
                />
                <Label className="text-gray-300 text-sm">Track Hours</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.track_expiry}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_expiry: checked })}
                  className="border-[#444] data-[state=checked]:bg-[#00857c]"
                />
                <Label className="text-gray-300 text-sm">Track Expiry</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_logged}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_logged: checked })}
                  className="border-[#444] data-[state=checked]:bg-[#00857c]"
                />
                <Label className="text-gray-300 text-sm">Is Logged</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-[#444] text-gray-300 hover:bg-[#333]">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#00857c] hover:bg-[#006b64]">
                {editingMaterial ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={categoryManagementOpen} onOpenChange={setCategoryManagementOpen}>
        <DialogContent className="bg-[#2a2a2a] border-[#444] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Category Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Category */}
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="bg-[#1e1e1e] border-[#444] text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button
                onClick={handleAddCategory}
                className="bg-[#00857c] hover:bg-[#006b64]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <DragDropContext onDragEnd={handleCategoryDragEnd}>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {categories.map((category, index) => (
                        <Draggable key={category} draggableId={category} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 bg-[#1e1e1e] p-3 rounded border border-[#444] ${
                                snapshot.isDragging ? 'opacity-50' : ''
                              }`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                                </svg>
                              </div>
                              <span className="flex-1 text-gray-200">{category}</span>
                              <Button
                                onClick={() => handleDeleteCategory(category)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation Dialog */}
      <Dialog open={deleteCategoryConfirmOpen} onOpenChange={setDeleteCategoryConfirmOpen}>
        <DialogContent className="bg-[#2a2a2a] border-[#444] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Category Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete the category <strong>{categoryToDelete}</strong>?
            </p>
            <p className="text-sm text-gray-400">
              This action cannot be undone. If no categories remain, the category filter will be removed.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteCategoryConfirmOpen(false)}
                className="border-[#444] text-gray-300 hover:bg-[#333]"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteCategory}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Details Sheet (Mobile) */}
      <MobileDetailSheet
        open={detailsModalOpen}
        onClose={() => { setDetailsModalOpen(false); setIsEditing(false); }}
        title={editingMaterial?.part_number || 'Material Details'}
        navItems={[
          { icon: <FileText className="h-3.5 w-3.5" />, label: 'Details', active: sidebarView === 'details', onClick: () => setSidebarView('details') },
          { icon: <Archive className="h-3.5 w-3.5" />, label: 'Stock', active: sidebarView === 'stock', onClick: () => setSidebarView('stock') },
          { icon: <Settings className="h-3.5 w-3.5" />, label: 'Columns', active: sidebarView === 'settings', onClick: () => setSidebarView('settings') },
        ]}
      >
        {!editingMaterial ? (
          <div className="text-center text-slate-500 mt-10">Select a material to view details</div>
        ) : sidebarView === 'details' ? (
          !isEditing ? (
            <div className="space-y-3">
              <div><Label className="text-slate-400 text-xs">Part Number</Label><p className="text-slate-200 mt-1">{editingMaterial.part_number || '-'}</p></div>
              {editingMaterial.description && <div><Label className="text-slate-400 text-xs">Description</Label><p className="text-slate-200 mt-1 text-sm">{editingMaterial.description}</p></div>}
              <div><Label className="text-slate-400 text-xs">Category</Label><p className="text-slate-200 mt-1">{editingMaterial.category || '-'}</p></div>
              <div><Label className="text-slate-400 text-xs">Consumption</Label><p className="text-slate-200 mt-1">{editingMaterial.consumption || '-'}</p></div>
              <div><Label className="text-slate-400 text-xs">Can Re-Life</Label><p className="text-slate-200 mt-1">{editingMaterial.can_re_life ? 'Yes' : 'No'}</p></div>
              <div><Label className="text-slate-400 text-xs">Track Hours</Label><p className="text-slate-200 mt-1">{editingMaterial.track_hours ? 'Yes' : 'No'}</p></div>
              <div><Label className="text-slate-400 text-xs">Track Expiry</Label><p className="text-slate-200 mt-1">{editingMaterial.track_expiry ? 'Yes' : 'No'}</p></div>
              <div><Label className="text-slate-400 text-xs">Is Logged</Label><p className="text-slate-200 mt-1">{editingMaterial.is_logged ? 'Yes' : 'No'}</p></div>
              <div><Label className="text-slate-400 text-xs">Default Width</Label><p className="text-slate-200 mt-1">{editingMaterial.default_width ? `${editingMaterial.default_width} mm` : '-'}</p></div>
              <div><Label className="text-slate-400 text-xs">Default Prep Time</Label><p className="text-slate-200 mt-1">{editingMaterial.default_preparation_time ? `${editingMaterial.default_preparation_time} min` : '-'}</p></div>
              <div><Label className="text-slate-400 text-xs">Default Out-Life</Label><p className="text-slate-200 mt-1">{editingMaterial.default_out_life ? `${editingMaterial.default_out_life} hrs` : '-'}</p></div>
              <div><Label className="text-slate-400 text-xs">Items In Stock</Label><p className="text-slate-200 mt-1">{getItemsInStock(editingMaterial.id)}</p></div>
              <div><Label className="text-slate-400 text-xs">Total Length</Label><p className="text-slate-200 mt-1">{getTotalLength(editingMaterial.id).toFixed(2)} m</p></div>
              <div><Label className="text-slate-400 text-xs">Total Area</Label><p className="text-slate-200 mt-1">{getTotalArea(editingMaterial.id).toFixed(2)} m²</p></div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setIsEditing(true)} className="bg-[--primary] hover:bg-[--primary-hover] text-white flex-1">Edit</Button>
                <Button variant="outline" onClick={() => { setDetailsModalOpen(false); setEditingMaterial(m => m); setDeleteConfirmOpen(true); }} className="border-red-800 text-red-400 hover:bg-red-500/10">Delete</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { handleSubmit(e); setDetailsModalOpen(false); }} className="space-y-3">
              <div><Label className="text-slate-300 text-xs">Part Number *</Label><Input value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1" required /></div>
              {categories.length > 0 && <div><Label className="text-slate-300 text-xs">Category</Label><Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}><SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-slate-700">{categories.map(c => <SelectItem key={c} value={c} className="text-slate-300 focus:bg-slate-700/50">{c}</SelectItem>)}</SelectContent></Select></div>}
              <div><Label className="text-slate-300 text-xs">Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1" rows={2} /></div>
              <div><Label className="text-slate-300 text-xs">Consumption</Label><Input value={formData.consumption} onChange={(e) => setFormData({ ...formData, consumption: e.target.value })} className="bg-slate-800/50 border-slate-600 text-slate-200 mt-1" /></div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-[--primary] hover:bg-[--primary-hover] text-white flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="border-slate-600 text-slate-300">Cancel</Button>
              </div>
            </form>
          )
        ) : sidebarView === 'stock' ? (
          <div className="space-y-3">
            {(() => {
              const materialStock = stock.filter(s => s.material_id === editingMaterial.id && !s.archived);
              if (materialStock.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No available stock</p>;
              return materialStock.map((s, idx) => (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-slate-200 text-sm font-medium">Batch: {s.batch_number}</p>
                  <p className="text-slate-400 text-xs">Roll: {s.roll_number} | {s.quantity ? `${s.quantity} m²` : s.length_m ? `${s.length_m} m` : '-'}</p>
                  <p className="text-slate-400 text-xs">{s.location}</p>
                </div>
              ));
            })()}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Column settings are available on desktop.</p>
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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value="part_number" checked={searchType === 'part_number'} onChange={(e) => setSearchType(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-sm text-slate-300">Part Number</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value="description" checked={searchType === 'description'} onChange={(e) => setSearchType(e.target.value)} className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-sm text-slate-300">Description</span>
                </label>
              </div>
            </div>
            {categories.length > 0 && (
              <div>
                <Label className="text-slate-300 text-xs mb-2 block">Category</Label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setCategoryFilter('all'); localStorage.setItem('selected_category_filter', 'all'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 border border-slate-600'}`}>All</button>
                  {categories.map((c) => (
                    <button key={c} onClick={() => { setCategoryFilter(c); localStorage.setItem('selected_category_filter', c); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${categoryFilter === c ? 'bg-[--primary] text-white' : 'bg-slate-800/50 text-slate-300 border border-slate-600'}`}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-xs mb-2 block">Sort By</Label>
              <Select value={sortBy || 'none'} onValueChange={(v) => setSortBy(v === 'none' ? null : v)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-slate-700">
                  <SelectItem value="none" className="text-slate-300 focus:bg-slate-700/50">None</SelectItem>
                  <SelectItem value="part_number" className="text-slate-300 focus:bg-slate-700/50">Part Number</SelectItem>
                  <SelectItem value="category" className="text-slate-300 focus:bg-slate-700/50">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sortBy && (
              <div>
                <Label className="text-slate-300 text-xs mb-2 block">Sort Order</Label>
                <div className="flex gap-2">
                  <button onClick={() => setSortOrder('asc')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sortOrder === 'asc' ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>A → Z</button>
                  <button onClick={() => setSortOrder('desc')} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${sortOrder === 'desc' ? 'bg-[--primary] text-white border-[--primary]' : 'bg-slate-800/50 text-slate-300 border-slate-600'}`}>Z → A</button>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCategoryFilter('all'); setSortBy(null); setSortOrder('asc'); localStorage.setItem('selected_category_filter', 'all'); }} className="flex-1 border-slate-600 text-slate-300">Reset</Button>
              <Button onClick={() => setMobileFilterOpen(false)} className="flex-1 bg-[--primary] hover:bg-[--primary-hover] text-white">Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#2a2a2a] border-[#444] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <strong>{editingMaterial?.part_number}</strong>?
            </p>
            <p className="text-sm text-gray-400">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border-[#444] text-gray-300 hover:bg-[#333]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteMaterial}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>{/* closes main content flex-col */}
    </div>
  );
}