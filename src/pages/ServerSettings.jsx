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
import { Plus, Trash2, Save, UserPlus, Mail, Snowflake } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ServerSettings() {
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed');
    },
    onError: () => toast.error('Failed to remove user'),
  });

  const [locations, setLocations] = useState(() => {
    const saved = localStorage.getItem('server_locations');
    const defaultLocations = [
      { name: 'Freezer A', isFreezer: true },
      { name: 'Freezer B', isFreezer: true },
      { name: 'Freezer C', isFreezer: true },
      { name: 'Clean Room', isFreezer: false },
      { name: 'Layup Area', isFreezer: false },
      { name: 'Cure Area', isFreezer: false }
    ];
    return saved ? JSON.parse(saved) : defaultLocations;
  });
  
  const [statuses, setStatuses] = useState(() => {
    const saved = localStorage.getItem('server_statuses');
    return saved ? JSON.parse(saved) : ['Available', 'In Use', 'Depleted', 'Expired', 'Quarantine'];
  });

  const [batchStatuses, setBatchStatuses] = useState(() => {
    const saved = localStorage.getItem('server_batch_statuses');
    return saved ? JSON.parse(saved) : ['Quarantine', 'Released', 'Expired', 'Rejected'];
  });

  const [transferReasons, setTransferReasons] = useState(() => {
    const saved = localStorage.getItem('server_transfer_reasons');
    return saved ? JSON.parse(saved) : ['Production', 'Inspection', 'Rework', 'Return to Freezer', 'Disposal'];
  });

  const [newLocation, setNewLocation] = useState('');
  const [newLocationIsFreezer, setNewLocationIsFreezer] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newBatchStatus, setNewBatchStatus] = useState('');
  const [newTransferReason, setNewTransferReason] = useState('');

  const saveLocations = () => {
    localStorage.setItem('server_locations', JSON.stringify(locations));
    window.dispatchEvent(new Event('settingsUpdated'));
    toast.success('Locations saved');
  };

  const saveStatuses = () => {
    localStorage.setItem('server_statuses', JSON.stringify(statuses));
    window.dispatchEvent(new Event('settingsUpdated'));
    toast.success('Stock statuses saved');
  };

  const saveBatchStatuses = () => {
    localStorage.setItem('server_batch_statuses', JSON.stringify(batchStatuses));
    window.dispatchEvent(new Event('settingsUpdated'));
    toast.success('Batch statuses saved');
  };

  const saveTransferReasons = () => {
    localStorage.setItem('server_transfer_reasons', JSON.stringify(transferReasons));
    window.dispatchEvent(new Event('settingsUpdated'));
    toast.success('Transfer reasons saved');
  };

  const addLocation = () => {
    if (!newLocation.trim()) return;
    const locationExists = locations.some(l => l.name === newLocation.trim());
    if (locationExists) {
      toast.error('Location already exists');
      return;
    }
    setLocations([...locations, { name: newLocation.trim(), isFreezer: newLocationIsFreezer }]);
    setNewLocation('');
    setNewLocationIsFreezer(false);
  };

  const removeLocation = (index) => {
    if (locations.length <= 1) {
      toast.error('Must have at least one location');
      return;
    }
    setLocations(locations.filter((_, i) => i !== index));
  };

  const toggleFreezer = (index) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], isFreezer: !updated[index].isFreezer };
    setLocations(updated);
  };

  const addStatus = () => {
    if (!newStatus.trim()) return;
    if (statuses.includes(newStatus.trim())) {
      toast.error('Status already exists');
      return;
    }
    setStatuses([...statuses, newStatus.trim()]);
    setNewStatus('');
  };

  const removeStatus = (index) => {
    if (statuses.length <= 1) {
      toast.error('Must have at least one status');
      return;
    }
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const addBatchStatus = () => {
    if (!newBatchStatus.trim()) return;
    if (batchStatuses.includes(newBatchStatus.trim())) {
      toast.error('Batch status already exists');
      return;
    }
    setBatchStatuses([...batchStatuses, newBatchStatus.trim()]);
    setNewBatchStatus('');
  };

  const removeBatchStatus = (index) => {
    if (batchStatuses.length <= 1) {
      toast.error('Must have at least one batch status');
      return;
    }
    setBatchStatuses(batchStatuses.filter((_, i) => i !== index));
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
    if (transferReasons.length <= 1) {
      toast.error('Must have at least one transfer reason');
      return;
    }
    setTransferReasons(transferReasons.filter((_, i) => i !== index));
  };

  const handleLocationDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocations(items);
  };

  const handleStatusDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(statuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setStatuses(items);
  };

  const handleBatchStatusDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(batchStatuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBatchStatuses(items);
  };

  const handleTransferReasonDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(transferReasons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setTransferReasons(items);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Server Manager</h1>
          <p className="text-slate-400">Configure global settings and manage users</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
              Users
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
              Locations
            </TabsTrigger>
          </TabsList>

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
                    <div className="text-center py-8 text-slate-400">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No users found</div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-sm font-semibold shadow-lg shadow-cyan-500/20">
                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-slate-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                            user.role === 'admin' 
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {user.role}
                          </span>
                          <Button
                            onClick={() => {
                              if (confirm(`Remove ${user.email} from the application?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card className="bg-[#1e293b] border-slate-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100">Storage Locations</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage storage locations. Mark freezers to track out-life properly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="New location name"
                    className="bg-slate-800/50 border-slate-600 text-slate-200"
                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  />
                  <Button
                    onClick={addLocation}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <DragDropContext onDragEnd={handleLocationDragEnd}>
                  <Droppable droppableId="locations">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {locations.map((location, index) => (
                          <Draggable key={location.name} draggableId={location.name} index={index}>
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
                                <span className="flex-1 text-slate-200 text-sm">{typeof location === 'string' ? location : location.name}</span>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`freezer-${index}`} className="text-slate-400 text-xs cursor-pointer">Freezer</Label>
                                  <Checkbox
                                    id={`freezer-${index}`}
                                    checked={location.isFreezer}
                                    onCheckedChange={() => toggleFreezer(index)}
                                    className="border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-cyan-600 data-[state=checked]:to-cyan-500"
                                    title="Mark as freezer location"
                                  />
                                </div>
                                <Button
                                  onClick={() => removeLocation(index)}
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

                <Button
                  onClick={saveLocations}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Locations
                </Button>
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
              <p className="text-sm text-slate-400">
                To invite a user, please contact your system administrator. User invitations must be sent from the Base44 dashboard.
              </p>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-300 font-medium mb-1">How to invite users:</p>
                    <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Go to the Base44 dashboard</li>
                      <li>Navigate to your app settings</li>
                      <li>Click "Invite Users"</li>
                      <li>Enter the email address and select a role</li>
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