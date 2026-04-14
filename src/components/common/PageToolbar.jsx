import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Settings2, 
  Columns3, 
  X, 
  ArrowRight, 
  Printer,
  Search
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function PageToolbar({ 
  onAdd,
  filters = [],
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  typeFilters = [],
  activeType,
  onTypeChange,
  actions = []
}) {
  return (
    <div className="space-y-4 mb-6">
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onAdd && (
          <Button 
            onClick={onAdd}
            size="sm"
            className="bg-transparent border border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button 
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#333]"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#333]"
        >
          <Columns3 className="h-4 w-4" />
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#333]"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#333]"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#333]"
        >
          <Printer className="h-4 w-4" />
        </Button>
        {actions.map((action, idx) => (
          <Button
            key={idx}
            onClick={action.onClick}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-[#333]"
            title={action.tooltip}
          >
            {action.icon}
          </Button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        {filters.map((filter, idx) => (
          <Select 
            key={idx} 
            value={filter.value} 
            onValueChange={filter.onChange}
          >
            <SelectTrigger className="w-40 bg-[#2a2a2a] border-[#444] text-gray-300 h-9">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a2a] border-[#444]">
              {filter.options.map((opt) => (
                <SelectItem 
                  key={opt.value} 
                  value={opt.value}
                  className="text-gray-300 focus:bg-[#333] focus:text-white"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-48 bg-[#2a2a2a] border-[#444] text-gray-300 h-9 pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>

      {/* Type Filter Buttons */}
      {typeFilters.length > 0 && (
        <div className="flex items-center gap-2">
          {typeFilters.map((type) => (
            <button
              key={type.value}
              onClick={() => onTypeChange(type.value)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-all duration-200",
                activeType === type.value
                  ? "bg-[#00857c] text-white"
                  : "bg-[#333] text-gray-300 hover:bg-[#3a3a3a]"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}