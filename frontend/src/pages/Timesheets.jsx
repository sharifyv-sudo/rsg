import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Clock, Calendar, MapPin, Users, TrendingUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getWeekRange = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  };
};

const initialFormData = {
  employee_id: "",
  hours_worked: "",
  location: "",
  date: new Date().toISOString().split('T')[0],
  notes: ""
};

export default function Timesheets() {
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // all, weekly, monthly
  const [selectedPeriod, setSelectedPeriod] = useState(getWeekRange(new Date()).start);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [timesheetsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/timesheets`),
        axios.get(`${API}/employees`)
      ]);
      setTimesheets(timesheetsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (timesheet = null) => {
    if (timesheet) {
      setEditingTimesheet(timesheet);
      setFormData({
        employee_id: timesheet.employee_id,
        hours_worked: timesheet.hours_worked?.toString() || "",
        location: timesheet.location || "",
        date: timesheet.date,
        notes: timesheet.notes || ""
      });
    } else {
      setEditingTimesheet(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTimesheet(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const employee = employees.find(emp => emp.id === formData.employee_id);
    if (!employee) {
      toast.error("Please select an employee");
      setSubmitting(false);
      return;
    }

    const payload = {
      employee_id: formData.employee_id,
      employee_name: employee.name,
      hours_worked: parseFloat(formData.hours_worked) || 0,
      location: formData.location,
      date: formData.date,
      notes: formData.notes || null,
      hourly_rate: employee.hourly_rate || 0
    };

    try {
      if (editingTimesheet) {
        await axios.put(`${API}/timesheets/${editingTimesheet.id}`, payload);
        toast.success("Timesheet updated successfully");
      } else {
        await axios.post(`${API}/timesheets`, payload);
        toast.success("Timesheet entry added successfully");
      }
      handleCloseDialog();
      await fetchData();  // Ensure data is refreshed
    } catch (error) {
      console.error("Error saving timesheet:", error);
      toast.error(error.response?.data?.detail || "Failed to save timesheet");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (timesheet) => {
    if (!window.confirm(`Are you sure you want to delete this timesheet entry?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/timesheets/${timesheet.id}`);
      toast.success("Timesheet entry deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting timesheet:", error);
      toast.error("Failed to delete timesheet");
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Unknown';
  };

  // Calculate summaries
  const calculateSummary = () => {
    const now = new Date();
    const currentWeek = getWeekRange(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filtered = timesheets;
    
    if (viewMode === "weekly") {
      filtered = timesheets.filter(t => {
        const tDate = new Date(t.date);
        const tWeek = getWeekRange(tDate);
        return tWeek.start === selectedPeriod;
      });
    } else if (viewMode === "monthly") {
      const [year, month] = selectedPeriod.split('-').map(Number);
      filtered = timesheets.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month - 1 && tDate.getFullYear() === year;
      });
    }

    const totalHours = filtered.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const totalEarnings = filtered.reduce((sum, t) => sum + ((t.hours_worked || 0) * (t.hourly_rate || 0)), 0);
    const uniqueEmployees = new Set(filtered.map(t => t.employee_id)).size;
    const uniqueLocations = new Set(filtered.map(t => t.location).filter(Boolean)).size;

    // Group by employee
    const byEmployee = {};
    filtered.forEach(t => {
      if (!byEmployee[t.employee_id]) {
        byEmployee[t.employee_id] = {
          name: t.employee_name || getEmployeeName(t.employee_id),
          hours: 0,
          earnings: 0,
          entries: 0
        };
      }
      byEmployee[t.employee_id].hours += t.hours_worked || 0;
      byEmployee[t.employee_id].earnings += (t.hours_worked || 0) * (t.hourly_rate || 0);
      byEmployee[t.employee_id].entries += 1;
    });

    return {
      filtered,
      totalHours,
      totalEarnings,
      uniqueEmployees,
      uniqueLocations,
      byEmployee: Object.values(byEmployee).sort((a, b) => b.hours - a.hours)
    };
  };

  const summary = calculateSummary();

  // Generate period options
  const getWeekOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const week = getWeekRange(d);
      options.push({ value: week.start, label: week.label });
    }
    return options;
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="p-8" data-testid="timesheets-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="timesheets-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">TIME TRACKING</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Timesheets
          </h1>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
          data-testid="add-timesheet-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* View Mode & Period Selector */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "all" ? "default" : "outline"}
            onClick={() => setViewMode("all")}
            className={viewMode === "all" ? "bg-[#0F64A8]" : ""}
          >
            All Time
          </Button>
          <Button
            variant={viewMode === "weekly" ? "default" : "outline"}
            onClick={() => {
              setViewMode("weekly");
              setSelectedPeriod(getWeekRange(new Date()).start);
            }}
            className={viewMode === "weekly" ? "bg-[#0F64A8]" : ""}
          >
            Weekly
          </Button>
          <Button
            variant={viewMode === "monthly" ? "default" : "outline"}
            onClick={() => {
              setViewMode("monthly");
              const now = new Date();
              setSelectedPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
            }}
            className={viewMode === "monthly" ? "bg-[#0F64A8]" : ""}
          >
            Monthly
          </Button>
        </div>

        {viewMode === "weekly" && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {getWeekOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {viewMode === "monthly" && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL HOURS</p>
                <p className="stat-value text-2xl">{summary.totalHours.toFixed(1)} hrs</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL EARNINGS</p>
                <p className="stat-value text-2xl text-green-600">{formatCurrency(summary.totalEarnings)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">EMPLOYEES</p>
                <p className="stat-value text-2xl">{summary.uniqueEmployees}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">LOCATIONS</p>
                <p className="stat-value text-2xl">{summary.uniqueLocations}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Summary */}
      {summary.byEmployee.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold">
              Employee Summary {viewMode !== "all" && `(${viewMode === "weekly" ? "This Week" : "This Month"})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.byEmployee.map((emp, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-sm text-muted-foreground">{emp.entries} entries</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-[#0F64A8]">{emp.hours.toFixed(1)} hrs</p>
                    <p className="text-sm text-green-600">{formatCurrency(emp.earnings)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timesheet Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            Timesheet Entries ({summary.filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summary.filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Hours</th>
                    <th>Rate</th>
                    <th>Earnings</th>
                    <th>Notes</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.filtered.map((entry) => (
                    <tr key={entry.id} data-testid={`timesheet-row-${entry.id}`}>
                      <td>
                        <span className="font-medium">{entry.employee_name || getEmployeeName(entry.employee_id)}</span>
                      </td>
                      <td className="font-mono text-sm">{formatDate(entry.date)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{entry.location || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono font-medium text-[#0F64A8]">
                          {(entry.hours_worked || 0).toFixed(1)} hrs
                        </span>
                      </td>
                      <td className="font-mono text-sm text-muted-foreground">
                        {formatCurrency(entry.hourly_rate || 0)}/hr
                      </td>
                      <td>
                        <span className="font-mono font-medium text-green-600">
                          {formatCurrency((entry.hours_worked || 0) * (entry.hourly_rate || 0))}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {entry.notes || '-'}
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(entry)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(entry)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No timesheet entries found</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-[#0F64A8]"
              >
                Add your first entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Timesheet Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingTimesheet ? "Edit Timesheet Entry" : "Add Timesheet Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="employee_id">Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger data-testid="employee-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="date-input"
                />
              </div>

              <div>
                <Label htmlFor="hours_worked">Hours Worked *</Label>
                <Input
                  id="hours_worked"
                  type="number"
                  min="0"
                  step="any"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                  placeholder="e.g., 8, 7.5, 4.25"
                  required
                  data-testid="hours-input"
                />
              </div>

              <div>
                <Label htmlFor="location">Work Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Emirates Stadium, Old Trafford"
                  required
                  data-testid="location-input"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  data-testid="notes-input"
                />
              </div>

              {formData.employee_id && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Hourly rate: <span className="font-medium text-foreground">
                      {formatCurrency(employees.find(e => e.id === formData.employee_id)?.hourly_rate || 0)}/hr
                    </span>
                  </p>
                  {formData.hours_worked && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimated earnings: <span className="font-medium text-green-600">
                        {formatCurrency((parseFloat(formData.hours_worked) || 0) * (employees.find(e => e.id === formData.employee_id)?.hourly_rate || 0))}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0F64A8] hover:bg-[#0D5590]"
                disabled={submitting}
                data-testid="save-timesheet-btn"
              >
                {submitting ? "Saving..." : editingTimesheet ? "Update Entry" : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
