import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from 'lucide-react';

export default function RollsTable({ rolls, batchIdx, batchesWithRolls, setBatchesWithRolls, locations }) {
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="text-left text-xs text-slate-400 font-medium px-2 py-2">Roll #</th>
            <th className="text-left text-xs text-slate-400 font-medium px-2 py-2">Location *</th>
            <th className="text-left text-xs text-slate-400 font-medium px-2 py-2">Type</th>
            <th className="text-left text-xs text-slate-400 font-medium px-2 py-2">Value</th>
            <th className="text-left text-xs text-slate-400 font-medium px-2 py-2">Width</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rolls.map((roll, rollIdx) => (
            <tr key={rollIdx} className="border-t border-slate-700/50">
              <td className="px-2 py-1.5">
                <Input
                  value={roll.roll_number}
                  onChange={(e) => {
                    const updated = [...batchesWithRolls];
                    updated[batchIdx].rolls[rollIdx].roll_number = e.target.value;
                    setBatchesWithRolls(updated);
                  }}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 h-7 text-xs w-16"
                  placeholder="R1"
                />
              </td>
              <td className="px-2 py-1.5">
                <Select
                  value={roll.location}
                  onValueChange={(v) => {
                    const updated = [...batchesWithRolls];
                    updated[batchIdx].rolls[rollIdx].location = v;
                    setBatchesWithRolls(updated);
                  }}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-7 text-xs w-28">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    {locations.filter(l => l.value !== 'all').map(l => (
                      <SelectItem key={l.value} value={l.value} className="text-slate-300 focus:bg-slate-700/50 text-xs">{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-2 py-1.5">
                <Select
                  value={roll.measurement_type}
                  onValueChange={(v) => {
                    const updated = [...batchesWithRolls];
                    updated[batchIdx].rolls[rollIdx].measurement_type = v;
                    setBatchesWithRolls(updated);
                  }}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-7 text-xs w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700">
                    <SelectItem value="m2" className="text-slate-300 focus:bg-slate-700/50 text-xs">m²</SelectItem>
                    <SelectItem value="lm" className="text-slate-300 focus:bg-slate-700/50 text-xs">lm</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-2 py-1.5">
                <Input
                  type="number"
                  step="0.01"
                  value={roll.value}
                  onChange={(e) => {
                    const updated = [...batchesWithRolls];
                    updated[batchIdx].rolls[rollIdx].value = e.target.value;
                    setBatchesWithRolls(updated);
                  }}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 h-7 text-xs w-16"
                  placeholder="0.00"
                />
              </td>
              <td className="px-2 py-1.5">
                <Input
                  type="number"
                  step="1"
                  value={roll.width_mm}
                  onChange={(e) => {
                    const updated = [...batchesWithRolls];
                    updated[batchIdx].rolls[rollIdx].width_mm = e.target.value;
                    setBatchesWithRolls(updated);
                  }}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 h-7 text-xs w-16"
                  placeholder="mm"
                />
              </td>
              <td className="px-2 py-1.5">
                {rolls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...batchesWithRolls];
                      updated[batchIdx].rolls = updated[batchIdx].rolls.filter((_, i) => i !== rollIdx);
                      setBatchesWithRolls(updated);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}