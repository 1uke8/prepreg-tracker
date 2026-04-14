import React from 'react';
import { Button } from "@/components/ui/button";

export default function DetailsSidebar({ 
  title, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  hasItem,
  children 
}) {
  return (
    <div className="w-80 bg-[#2a2a2a] border-r border-[#333] p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hasItem && !isEditing && (
          <Button
            size="sm"
            onClick={onEdit}
            className="bg-[#00857c] hover:bg-[#006b64]"
          >
            Edit
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="border-[#444] text-gray-300 hover:bg-[#333]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              className="bg-[#00857c] hover:bg-[#006b64]"
            >
              Save
            </Button>
          </div>
        )}
      </div>

      {!hasItem ? (
        <div className="text-center text-gray-500 mt-20">
          <p>Select an item to view details</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}