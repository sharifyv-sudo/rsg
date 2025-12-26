import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Plus, MoreHorizontal, Pencil, Eye, AlertTriangle, CheckCircle, 
  Clock, XCircle, Image, MapPin, User, Calendar
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_CONFIG = {
  low: { label: "Low", color: "bg-blue-100 text-blue-700", icon: "🔵" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700", icon: "🟡" },
  high: { label: "High", color: "bg-orange-100 text-orange-700", icon: "🟠" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700", icon: "🔴" }
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-red-100 text-red-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700" }
};

export default function Defects() {
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [resolveNotes, setResolveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterSeverity]);

  const fetchData = async () => {
    try {
      let url = `${API}/defects?limit=200`;
      if (filterStatus !== "all") url += `&status=${filterStatus}`;
      if (filterSeverity !== "all") url += `&severity=${filterSeverity}`;
      
      const [defectsRes, statsRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API}/defects/stats`)
      ]);
      setDefects(defectsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching defects:", error);
      toast.error("Failed to load defects");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDefect = (defect) => {
    setSelectedDefect(defect);
    setShowViewDialog(true);
  };

  const handleOpenResolve = (defect) => {
    setSelectedDefect(defect);
    setResolveNotes("");
    setShowResolveDialog(true);
  };

  const handleResolve = async () => {
    if (!resolveNotes.trim()) {
      toast.error("Please enter resolution notes");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/defects/${selectedDefect.id}/resolve?resolver_id=admin&resolution_notes=${encodeURIComponent(resolveNotes)}`);
      toast.success("Defect marked as resolved");
      setShowResolveDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error resolving defect:", error);
      toast.error("Failed to resolve defect");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (defect, newStatus) => {
    try {
      await axios.put(`${API}/defects/${defect.id}`, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-md"></div>
            ))}
          </div>
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
            Defects & Incidents
          </h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL DEFECTS</p>
                <p className="stat-value">{stats?.total || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">OPEN</p>
                <p className="stat-value text-red-600">{stats?.by_status?.open || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">IN PROGRESS</p>
                <p className="stat-value text-amber-600">{stats?.by_status?.in_progress || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">RESOLVED</p>
                <p className="stat-value text-green-600">{stats?.by_status?.resolved || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">URGENT</p>
                <p className="stat-value text-orange-600">{stats?.urgent_count || 0}</p>
                <p className="text-xs text-muted-foreground">Critical + High</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Defects Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            All Defects ({defects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {defects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Defect</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defects.map((defect) => (
                  <TableRow key={defect.id}>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <p className="font-medium">{defect.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {defect.description}
                        </p>
                        {defect.photos?.length > 0 && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <Image className="w-3 h-3 mr-1" />
                            {defect.photos.length} photo(s)
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{defect.site_name || "-"}</p>
                        {defect.location && (
                          <p className="text-xs text-muted-foreground">{defect.location}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_CONFIG[defect.severity]?.color}>
                        {SEVERITY_CONFIG[defect.severity]?.icon} {SEVERITY_CONFIG[defect.severity]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[defect.status]?.color}>
                        {STATUS_CONFIG[defect.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{defect.reported_by_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(defect.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDefect(defect)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {defect.status !== 'resolved' && (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(defect, 'in_progress')}>
                                <Clock className="w-4 h-4 mr-2" />
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenResolve(defect)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Resolve
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No defects found</p>
              <p className="text-sm text-muted-foreground">All clear! No issues reported.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Defect Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDefect?.title}</DialogTitle>
            <DialogDescription>
              Defect Details
            </DialogDescription>
          </DialogHeader>
          {selectedDefect && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Badge className={SEVERITY_CONFIG[selectedDefect.severity]?.color}>
                  {SEVERITY_CONFIG[selectedDefect.severity]?.label}
                </Badge>
                <Badge className={STATUS_CONFIG[selectedDefect.status]?.color}>
                  {STATUS_CONFIG[selectedDefect.status]?.label}
                </Badge>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedDefect.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Site</p>
                  <p className="font-medium">{selectedDefect.site_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedDefect.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported By</p>
                  <p className="font-medium">{selectedDefect.reported_by_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported On</p>
                  <p className="font-medium">{formatDate(selectedDefect.created_at)}</p>
                </div>
              </div>

              {selectedDefect.photos?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedDefect.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`}
                        alt={`Defect photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedDefect.resolution_notes && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Resolution Notes</p>
                  <p className="text-sm">{selectedDefect.resolution_notes}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved by {selectedDefect.resolved_by_name} on {formatDate(selectedDefect.resolved_at)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedDefect?.status !== 'resolved' && (
              <Button 
                onClick={() => { setShowViewDialog(false); handleOpenResolve(selectedDefect); }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Defect Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Defect</DialogTitle>
            <DialogDescription>
              Mark "{selectedDefect?.title}" as resolved
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="resolveNotes">Resolution Notes *</Label>
            <Textarea
              id="resolveNotes"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Describe how this defect was resolved..."
              rows={4}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "Saving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
