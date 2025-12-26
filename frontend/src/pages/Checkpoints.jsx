import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, MoreHorizontal, Pencil, Trash2, MapPin, QrCode, Clock, 
  HelpCircle, Download, Eye, CheckCircle, XCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initialFormData = {
  name: "",
  description: "",
  site_name: "",
  latitude: "",
  longitude: "",
  radius_meters: 50,
  check_frequency_minutes: 60,
  questions: []
};

const QUESTION_TYPES = [
  { value: "yes_no", label: "Yes / No" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "text", label: "Text Answer" }
];

export default function Checkpoints() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    try {
      const response = await axios.get(`${API}/checkpoints?active_only=false`);
      setCheckpoints(response.data);
    } catch (error) {
      console.error("Error fetching checkpoints:", error);
      toast.error("Failed to load checkpoints");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (checkpoint = null) => {
    if (checkpoint) {
      setEditingCheckpoint(checkpoint);
      setFormData({
        name: checkpoint.name,
        description: checkpoint.description || "",
        site_name: checkpoint.site_name || "",
        latitude: checkpoint.latitude?.toString() || "",
        longitude: checkpoint.longitude?.toString() || "",
        radius_meters: checkpoint.radius_meters || 50,
        check_frequency_minutes: checkpoint.check_frequency_minutes || 60,
        questions: checkpoint.questions || []
      });
    } else {
      setEditingCheckpoint(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude)
    };

    try {
      if (editingCheckpoint) {
        await axios.put(`${API}/checkpoints/${editingCheckpoint.id}`, payload);
        toast.success("Checkpoint updated successfully");
      } else {
        await axios.post(`${API}/checkpoints`, payload);
        toast.success("Checkpoint created successfully");
      }
      setShowDialog(false);
      fetchCheckpoints();
    } catch (error) {
      console.error("Error saving checkpoint:", error);
      toast.error(error.response?.data?.detail || "Failed to save checkpoint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (checkpoint) => {
    if (!window.confirm(`Are you sure you want to deactivate "${checkpoint.name}"?`)) return;

    try {
      await axios.delete(`${API}/checkpoints/${checkpoint.id}`);
      toast.success("Checkpoint deactivated");
      fetchCheckpoints();
    } catch (error) {
      toast.error("Failed to deactivate checkpoint");
    }
  };

  const handleViewQR = async (checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setShowQRDialog(true);
    
    if (!checkpoint.qr_code) {
      try {
        const response = await axios.get(`${API}/checkpoints/${checkpoint.id}/qr`);
        setSelectedCheckpoint({ ...checkpoint, qr_code: response.data.qr_code });
      } catch (error) {
        toast.error("Failed to load QR code");
      }
    }
  };

  const downloadQR = () => {
    if (!selectedCheckpoint?.qr_code) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${selectedCheckpoint.qr_code}`;
    link.download = `checkpoint_${selectedCheckpoint.name.replace(/\s+/g, '_')}_qr.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { question: "", question_type: "yes_no", options: [], is_mandatory: true, is_random: false }
      ]
    });
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...formData.questions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, questions: updated });
  };

  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">PATROL MANAGEMENT</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Checkpoints
          </h1>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Checkpoint
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL CHECKPOINTS</p>
                <p className="stat-value">{checkpoints.length}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">ACTIVE</p>
                <p className="stat-value text-green-600">
                  {checkpoints.filter(c => c.is_active).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">WITH QUESTIONS</p>
                <p className="stat-value">
                  {checkpoints.filter(c => c.questions?.length > 0).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">UNIQUE SITES</p>
                <p className="stat-value">
                  {new Set(checkpoints.map(c => c.site_name).filter(Boolean)).size}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkpoints Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            All Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {checkpoints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Checkpoint</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkpoints.map((checkpoint) => (
                  <TableRow key={checkpoint.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{checkpoint.name}</p>
                        {checkpoint.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {checkpoint.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{checkpoint.site_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-xs">
                          {checkpoint.latitude?.toFixed(4)}, {checkpoint.longitude?.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Radius: {checkpoint.radius_meters}m
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{checkpoint.check_frequency_minutes} min</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {checkpoint.questions?.length > 0 ? (
                        <Badge variant="outline">{checkpoint.questions.length} questions</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {checkpoint.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewQR(checkpoint)}
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(checkpoint)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewQR(checkpoint)}>
                              <QrCode className="w-4 h-4 mr-2" />
                              View QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(checkpoint)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No checkpoints created yet</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-[#0F64A8]"
              >
                Create your first checkpoint
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Checkpoint Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCheckpoint ? "Edit Checkpoint" : "Add New Checkpoint"}</DialogTitle>
            <DialogDescription>
              Define a patrol checkpoint location with GPS coordinates and optional questions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Checkpoint Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Entrance, Fire Exit A"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this checkpoint..."
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="site_name">Site / Client Name</Label>
                  <Input
                    id="site_name"
                    value={formData.site_name}
                    onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                    placeholder="e.g., London Stadium"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Settings
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude *</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 51.5549"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude *</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., -0.1084"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="radius_meters">GPS Radius (meters)</Label>
                    <Input
                      id="radius_meters"
                      type="number"
                      value={formData.radius_meters}
                      onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                      min={10}
                      max={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Staff must be within this radius to verify location
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="check_frequency_minutes">Check Frequency (minutes)</Label>
                    <Input
                      id="check_frequency_minutes"
                      type="number"
                      value={formData.check_frequency_minutes}
                      onChange={(e) => setFormData({ ...formData, check_frequency_minutes: parseInt(e.target.value) })}
                      min={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How often this checkpoint should be visited
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Checkpoint Questions
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </div>
                
                {formData.questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No questions added. Staff will only need to check in at this location.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {formData.questions.map((q, index) => (
                      <div key={index} className="p-3 bg-muted rounded-md">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Question {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => removeQuestion(index)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          value={q.question}
                          onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                          placeholder="Enter question..."
                          className="mb-2"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={q.question_type}
                            onValueChange={(v) => updateQuestion(index, 'question_type', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={q.is_mandatory}
                              onCheckedChange={(v) => updateQuestion(index, 'is_mandatory', v)}
                            />
                            <span className="text-xs">Required</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={q.is_random}
                              onCheckedChange={(v) => updateQuestion(index, 'is_random', v)}
                            />
                            <span className="text-xs">Random</span>
                          </div>
                        </div>
                        {q.question_type === 'multiple_choice' && (
                          <Input
                            className="mt-2"
                            placeholder="Options (comma-separated)"
                            value={q.options?.join(', ') || ''}
                            onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0F64A8] hover:bg-[#0D5590]">
                {submitting ? "Saving..." : editingCheckpoint ? "Update Checkpoint" : "Create Checkpoint"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Checkpoint QR Code</DialogTitle>
            <DialogDescription>
              {selectedCheckpoint?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {selectedCheckpoint?.qr_code ? (
              <>
                <img
                  src={`data:image/png;base64,${selectedCheckpoint.qr_code}`}
                  alt="Checkpoint QR Code"
                  className="w-64 h-64 border rounded-lg"
                />
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Staff can scan this QR code to check in at this checkpoint
                </p>
              </>
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRDialog(false)}>
              Close
            </Button>
            <Button onClick={downloadQR} className="bg-[#0F64A8] hover:bg-[#0D5590]">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
