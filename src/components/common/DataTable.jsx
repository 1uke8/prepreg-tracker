import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

export default function DataTable({ 
  columns, 
  data, 
  isLoading, 
  onRowClick,
  emptyMessage = "No data found",
  selectedRowId = null
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-slate-700/50 shadow-xl backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl backdrop-blur-sm bg-slate-900/30">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-slate-800 to-slate-800/80 hover:from-slate-800 hover:to-slate-800/80 border-b border-slate-700/50">
            {columns.map((col, idx) => (
              <TableHead 
                key={idx} 
                className="text-slate-300 font-semibold text-xs uppercase tracking-wider py-4 px-4 first:pl-6"
                style={{ width: col.width }}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center py-16 text-slate-500 bg-slate-900/50"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow 
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-slate-800/50 transition-all duration-150",
                  selectedRowId === row.id 
                    ? "bg-cyan-500/15" 
                    : rowIdx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/20",
                  onRowClick && "cursor-pointer hover:bg-slate-800/40"
                )}
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className="py-4 px-4 text-sm text-slate-200 first:pl-6">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}