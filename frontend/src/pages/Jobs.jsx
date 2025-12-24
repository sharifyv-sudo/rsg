import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Calendar, MapPin, Clock, Download, Printer, FileText } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JOB_TYPES = ["Steward", "Security", "Event Staff", "Hospitality", "Cleaning", "Parking", "Other"];
const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" }
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const initialFormData = {
  name: "",
  client: "",
  date: "",
  location: "",
  latitude: "",
  longitude: "",
  require_location: false,
  start_time: "09:00",
  end_time: "17:00",
  job_type: "Steward",
  staff_required: "1",
  hourly_rate: "",
  notes: "",
  status: "upcoming"
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [exportData, setExportData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/jobs`),
        axios.get(`${API}/employees`)
      ]);
      setJobs(jobsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (job = null) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        name: job.name,
        client: job.client,
        date: job.date,
        location: job.location,
        latitude: job.latitude?.toString() || "",
        longitude: job.longitude?.toString() || "",
        start_time: job.start_time,
        end_time: job.end_time,
        job_type: job.job_type,
        staff_required: job.staff_required.toString(),
        hourly_rate: job.hourly_rate.toString(),
        notes: job.notes || "",
        status: job.status
      });
    } else {
      setEditingJob(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingJob(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      staff_required: parseInt(formData.staff_required),
      hourly_rate: parseFloat(formData.hourly_rate),
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      notes: formData.notes || null
    };

    try {
      if (editingJob) {
        await axios.put(`${API}/jobs/${editingJob.id}`, payload);
        toast.success("Job updated successfully");
      } else {
        await axios.post(`${API}/jobs`, payload);
        toast.success("Job created successfully");
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error(error.response?.data?.detail || "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Are you sure you want to delete "${job.name}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/jobs/${job.id}`);
      toast.success("Job deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    }
  };

  const handleOpenAssignDialog = async (job) => {
    setSelectedJob(job);
    // Pre-select already assigned employees
    const assignedIds = job.assigned_employees?.map(e => e.employee_id) || [];
    setSelectedEmployees(assignedIds);
    
    // Fetch availability for this date
    try {
      const response = await axios.get(`${API}/employees/available?job_date=${job.date}`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
    
    setShowAssignDialog(true);
  };

  const handleAssignEmployees = async () => {
    if (!selectedJob) return;
    setSubmitting(true);

    try {
      await axios.post(`${API}/jobs/${selectedJob.id}/assign`, {
        employee_ids: selectedEmployees
      });
      toast.success("Staff assigned successfully");
      setShowAssignDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast.error("Failed to assign staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (job) => {
    try {
      const response = await axios.get(`${API}/jobs/${job.id}/export`);
      setExportData(response.data);
      setShowExportDialog(true);
    } catch (error) {
      console.error("Error fetching export data:", error);
      toast.error("Failed to generate export");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return (
      <span className={`badge ${statusOption.color}`}>
        {statusOption.label}
      </span>
    );
  };

  // Stats
  const upcomingJobs = jobs.filter(j => j.status === "upcoming").length;
  const totalStaffRequired = jobs.filter(j => j.status === "upcoming").reduce((sum, j) => sum + j.staff_required, 0);
  const totalAssigned = jobs.filter(j => j.status === "upcoming").reduce((sum, j) => sum + (j.assigned_employees?.length || 0), 0);

  if (loading) {
    return (
      <div className="p-8" data-testid="jobs-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="jobs-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">STAFFING</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Job Assignments
          </h1>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
          data-testid="add-job-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover" data-testid="stat-upcoming-jobs">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">UPCOMING JOBS</p>
                <p className="stat-value">{upcomingJobs}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-staff-required">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">STAFF REQUIRED</p>
                <p className="stat-value">{totalStaffRequired}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-staff-assigned">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">STAFF ASSIGNED</p>
                <p className="stat-value">{totalAssigned} / {totalStaffRequired}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#E0F2FE] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#3AB09E]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card data-testid="jobs-list-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            All Jobs ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table" data-testid="jobs-table">
                <thead>
                  <tr>
                    <th>Job Details</th>
                    <th>Client</th>
                    <th>Date & Time</th>
                    <th>Staff</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th className="w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} data-testid={`job-row-${job.id}`}>
                      <td>
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </div>
                        </div>
                      </td>
                      <td>{job.client}</td>
                      <td>
                        <div className="font-mono text-sm">
                          <p>{formatDate(job.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.start_time} - {job.end_time}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${(job.assigned_employees?.length || 0) >= job.staff_required ? 'text-[#3AB09E]' : 'text-amber-600'}`}>
                            {job.assigned_employees?.length || 0} / {job.staff_required}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(job)}
                            className="h-7 px-2 text-xs"
                            data-testid={`assign-staff-${job.id}`}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                      </td>
                      <td className="font-mono">{formatCurrency(job.hourly_rate)}/hr</td>
                      <td>{getStatusBadge(job.status)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExport(job)}
                            disabled={!job.assigned_employees?.length}
                            data-testid={`export-job-${job.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`job-actions-${job.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(job)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(job)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No jobs created yet</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-[#0F64A8]"
              >
                Create your first job
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Job Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" data-testid="job-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingJob ? "Edit Job" : "New Job"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="name">Job Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Arsenal vs Chelsea - Emirates Stadium"
                  required
                  data-testid="job-name-input"
                />
              </div>

              <div>
                <Label htmlFor="client">Client *</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="Client name"
                  required
                  data-testid="job-client-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="job-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="job_type">Job Type *</Label>
                  <Select
                    value={formData.job_type}
                    onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                  >
                    <SelectTrigger data-testid="job-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Venue address"
                  required
                  data-testid="job-location-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">GPS Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., 51.5549"
                    required
                    data-testid="job-latitude-input"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">GPS Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., -0.1084"
                    required
                    data-testid="job-longitude-input"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Get coordinates from Google Maps (right-click on location → "What's here?")
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    data-testid="job-start-time-input"
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    data-testid="job-end-time-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff_required">Staff Required *</Label>
                  <Input
                    id="staff_required"
                    type="number"
                    min="1"
                    value={formData.staff_required}
                    onChange={(e) => setFormData({ ...formData, staff_required: e.target.value })}
                    required
                    data-testid="job-staff-input"
                  />
                </div>
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate (£) *</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.50"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    required
                    data-testid="job-rate-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="job-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional instructions..."
                  data-testid="job-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0F64A8] hover:bg-[#0D5590]"
                disabled={submitting}
                data-testid="save-job-btn"
              >
                {submitting ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl" data-testid="assign-staff-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Assign Staff to Job</DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div>
              <div className="bg-muted p-4 rounded-md mb-4">
                <h3 className="font-medium">{selectedJob.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedJob.date)} | {selectedJob.start_time} - {selectedJob.end_time} | {selectedJob.location}
                </p>
                <p className="text-sm mt-2">
                  Staff required: <span className="font-medium">{selectedJob.staff_required}</span> | 
                  Selected: <span className={`font-medium ${selectedEmployees.length >= selectedJob.staff_required ? 'text-[#3AB09E]' : 'text-amber-600'}`}>
                    {selectedEmployees.length}
                  </span>
                </p>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {employees.map((employee) => {
                  const isSelected = selectedEmployees.includes(employee.id);
                  const isAssignedElsewhere = employee.is_assigned_on_date && !selectedJob.assigned_employees?.some(e => e.employee_id === employee.id);
                  const isUnavailable = employee.availability !== 'available';
                  
                  return (
                    <div
                      key={employee.id}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        isSelected ? 'border-[#0F64A8] bg-[#E0F2FE]' : 'border-border'
                      } ${(isAssignedElsewhere || isUnavailable) ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                          disabled={isAssignedElsewhere || isUnavailable}
                          data-testid={`select-employee-${employee.id}`}
                        />
                        <div>
                          <p className="font-medium text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.position} | {employee.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isAssignedElsewhere && (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">Already assigned</span>
                        )}
                        {isUnavailable && (
                          <span className="badge bg-red-100 text-red-700 text-xs">Unavailable</span>
                        )}
                        {!isAssignedElsewhere && !isUnavailable && (
                          <span className="badge bg-green-100 text-green-700 text-xs">Available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignEmployees}
              className="bg-[#0F64A8] hover:bg-[#0D5590]"
              disabled={submitting}
              data-testid="confirm-assign-btn"
            >
              {submitting ? "Saving..." : `Assign ${selectedEmployees.length} Staff`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export/Print Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl" data-testid="export-dialog">
          <DialogHeader className="no-print">
            <DialogTitle className="font-heading">Staff List for Client</DialogTitle>
          </DialogHeader>
          
          {exportData && (
            <div ref={printRef} className="staff-export-document p-6 bg-white">
              {/* Header with Logo */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#0F64A8]">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_payroll-gbp/artifacts/3i59dflc_Picture1.jpg" 
                    alt="Right Service Group Logo" 
                    className="w-16 h-16 object-contain"
                  />
                  <div>
                    <h1 className="font-heading text-2xl font-bold text-[#0F64A8]">Right Service Group</h1>
                    <p className="text-sm text-muted-foreground">Staff Assignment Sheet</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Generated:</p>
                  <p className="font-mono text-sm">{new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-[#F8FAFC] p-4 rounded-md mb-6">
                <h2 className="font-heading text-xl font-bold mb-3">{exportData.job.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{exportData.job.client}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(exportData.job.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-medium">{exportData.job.start_time} - {exportData.job.end_time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{exportData.job.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Job Type</p>
                    <p className="font-medium">{exportData.job.job_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Staff</p>
                    <p className="font-medium">{exportData.staff_list.length}</p>
                  </div>
                </div>
                {exportData.job.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm">{exportData.job.notes}</p>
                  </div>
                )}
              </div>

              {/* Staff List */}
              <div>
                <h3 className="font-heading font-semibold mb-3 text-[#0F64A8]">Assigned Staff</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#0F64A8] text-white">
                      <th className="text-left p-3 text-sm font-medium">#</th>
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Position</th>
                      <th className="text-left p-3 text-sm font-medium">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportData.staff_list.map((staff, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 text-sm">{index + 1}</td>
                        <td className="p-3 text-sm font-medium">{staff.name}</td>
                        <td className="p-3 text-sm">{staff.position}</td>
                        <td className="p-3 text-sm font-mono">{staff.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
                <p>Right Service Group | Professional Staffing Solutions</p>
                <p>This document is confidential and intended for the named client only.</p>
              </div>
            </div>
          )}

          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-[#0F64A8] hover:bg-[#0D5590]">
              <Printer className="w-4 h-4 mr-2" />
              Print / Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
