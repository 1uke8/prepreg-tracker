import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Mail, MapPin } from 'lucide-react';

export default function ServerSettings() {
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // ── Users (stubbed — Supabase auth.users not exposed via public schema) ─────
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // ── Locations (Supabase locations table) ────────────────────────────────────
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    staleTime: 30 * 60 * 1000,
  });

  const addLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location added');
    },
    onError: () => toast.error('Failed to add location'),
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
    onError: () => toast.error('Failed to update location'),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location removed');
    },
    onError: () => toast.error('Failed to remove location'),
  });

  const [newLocation, setNewLocation] = useState('');
  const [newLocationIsFreezer, setNewLocationIsFreezer] = useState(false);

  const addLocation = () => {
    if (!newLocation.trim()) return;
    if (locations.some(l => l.name === newLocation.trim())) {
      toast.error('Location already exists');
      return;
    }
    addLocationMutation.mutate({
      name: newLocation.trim(),
      is_freezer: newLocationIsFreezer,
      type: newLocationIsFreezer ? 'Freezer' : 'Storage',
    });
    setNewLocation('');
    setNewLocationIsFreezer(false);
  };

  const toggleFreezer = (loc) => {
    const newIsFreezer = !loc.is_freezer;
    updateLocationMutation.mutate({
      id: loc.id,
      data: { is_freezer: newIsFreezer, type: newIsFreezer ? 'Freezer' : 'Storage' },
    });
  };

  // ── Transfer reasons (localStorage — no dedicated DB table) ─────────────────
  const [transferReasons, setTransferReasons] = useState(() => {
    const saved = localStorage.getItem('server_transfer_reasons');
    return saved ? JSON.parse(saved) : ['Production', 'Inspection', 'Rework', 'Return to Freezer', 'Disposal'];
  });
  const [newTransferReason, setNewTransferReason] = useState('');

  const saveTransferReasons = () => {
    localStorage.setItem('server_transfer_reasons', JSON.stringify(transferReasons));
    window.dispatchEvent(new Event('settingsUpdated'));
    toast.success('Transfer reasons saved');
  };

  const addTransferReason = () => {
    if (!newTransferReason.trim()) return;
    if (transferReasons.includes(newTransferReason.trim())) {
      toast.error('Transfer reason already exists');
      return;
    }
    setTransferReasons([...transferReasons, newTransferReason.trim()]);
    setNewTransferReason('');
  };

  const removeTransferReason = (index) => {
    if (transferReasons.length <= 1) { toast.error('Must have at least one transfer reason'); return; }
    setTransferReasons(transferReasons.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Server Manager</h1>
          <p className="text-slate-400">Configure global settings and manage users</p>
        </div>

        <Tabs defaultValue="locations" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="locations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
              Locations
            </TabsTrigger>
            <TabsTrigger value="reasons" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
              Transfer Reasons
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
              Users
            </TabsTrigger>
          </TabsList>

          {/* Locations Tab — backed by Supabase */}
          <TabsContent value="locations">
            <Card className="bg-[#1e293b] border-slate-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  Storage Locations
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage storage locations. Mark freezers to track out-life correctly.
                  Changes save immediately to the database and are shared across all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add form */}
                <div className="flex gap-2 items-center">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="New location name"
                    className="bg-slate-800/50 border-slate-600 text-slate-200"
                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Checkbox
                      id="new-loc-freezer"
                      checked={newLocationIsFreezer}
                      onCheckedChange={(v) => setNewLocationIsFreezer(!!v)}
                      className="border-slate-600 data-[state=checked]:bg-cyan-600"
                    />
                    <Label htmlFor="new-loc-freezer" className="text-slate-400 text-xs cursor-pointer whitespace-nowrap">
                      Is Freezer
                    </Label>
                  </div>
                  <Button
                    onClick={addLocation}
                    disabled={addLocationMutation.isPending}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* List */}
                {locationsLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading locations…</div>
                ) : (
                  <div className="space-y-2">
                    {locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <span className="flex-1 text-slate-200 text-sm">{loc.name}</span>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`freezer-${loc.id}`} className="text-slate-400 text-xs cursor-pointer">Freezer</Label>
                          <Checkbox
                            id={`freezer-${loc.id}`}
                            checked={!!loc.is_freezer}
                            onCheckedChange={() => toggleFreezer(loc)}
                            className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (locations.length <= 1) { toast.error('Must have at least one location'); return; }
                            deleteLocationMutation.mutate(loc.id);
                          }}
                          disabled={deleteLocationMutation.isPending}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfer Reasons Tab — localStorage */}
          <TabsContent value="reasons">
            <Card className="bg-[#1e293b] border-slate-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100">Transfer Reasons</CardTitle>
                <CardDescription className="text-slate-400">
                  Reasons available when creating a transfer. Click Save to apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTransferReason}
                    onChange={(e) => setNewTransferReason(e.target.value)}
                    placeholder="New transfer reason"
                    className="bg-slate-800/50 border-slate-600 text-slate-200"
                    onKeyPress={(e) => e.key === 'Enter' && addTransferReason()}
                  />
                  <Button onClick={addTransferReason} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {transferReasons.map((reason, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <span className="flex-1 text-slate-200 text-sm">{reason}</span>
                      <Button
                        onClick={() => removeTransferReason(index)}
                        variant="ghost" size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={saveTransferReasons}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                >
                  Save Transfer Reasons
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-[#1e293b] border-slate-700 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-100">User Management</CardTitle>
                    <CardDescription className="text-slate-400">
                      Manage users who can access the application
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setInviteDialogOpen(true)}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usersLoading ? (
                    <div className="text-center py-8 text-slate-400">Loading users…</div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      User management via the app is not yet configured.
                      Add users directly in <span className="text-cyan-400">Supabase → Authentication → Users</span>.
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-sm font-semibold">
                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-slate-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invite User Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="bg-[#1e293b] border-slate-700 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Invite User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-300 font-medium mb-1">How to invite users:</p>
                    <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Open your <span className="text-cyan-400">Supabase project dashboard</span></li>
                      <li>Go to <strong>Authentication → Users</strong></li>
                      <li>Click <strong>Invite user</strong> and enter their email</li>
                      <li>They will receive a magic-link to set their password</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setInviteDialogOpen(false)}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400"
                >
                  Got it
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
