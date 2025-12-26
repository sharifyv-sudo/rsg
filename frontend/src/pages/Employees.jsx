import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Clock, Upload, FileUp, Download, Users, CheckCircle, FileDown } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// CSV Export Helper
const exportToCSV = (data, filename, columns) => {
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(item => 
    columns.map(col => {
      const value = col.accessor(item);
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}.csv`);
};

const DEPARTMENTS = [
  "Stewarding",
  "Security",
  "Event Staff",
  "Hospitality",
  "Cleaning",
  "Parking",
  "Operations",
  "Management",
  "Other"
];

const formatCurrency = (amount) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  hourly_rate: "",
  contract_id: "",
  bank_account: "",
  sort_code: "",
  tax_code: "1257L",
  ni_number: "",
  availability: "available"
};

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-700" },
  { value: "unavailable", label: "Unavailable", color: "bg-red-100 text-red-700" },
  { value: "on_leave", label: "On Leave", color: "bg-amber-100 text-amber-700" }
];

// CSV Parser function
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^['"']|['"']$/g, ''));
    if (values.length >= 2) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }
  }
  return data;
};

// File Drop Zone Component
const FileDropZone = ({ onFileAccepted, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        onFileAccepted(file);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  }, [onFileAccepted]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        onFileAccepted(file);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const downloadTemplate = () => {
    const content = 'name,email,phone,department,position,hourly_rate,bank_account,sort_code,tax_code,ni_number,availability\nJohn Smith,john.smith@email.com,07123456789,Security,Door Supervisor,15.50,12345678,12-34-56,1257L,AB123456C,available\nJane Doe,jane.doe@email.com,07987654321,Stewarding,Team Leader,18.00,87654321,65-43-21,1257L,CD789012E,available';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-[#0F64A8] bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <FileUp className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-[#0F64A8]' : 'text-gray-400'}`} />
        <p className="text-gray-600 mb-2 text-sm">{isLoading ? 'Processing...' : 'Drag and drop your CSV file here'}</p>
        <p className="text-xs text-gray-400 mb-3">or</p>
        <label className="cursor-pointer">
          <span className="bg-[#0F64A8] text-white px-4 py-2 rounded-lg hover:bg-[#0D5590] transition-colors text-sm">Browse Files</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} disabled={isLoading} />
        </label>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Supported format: CSV</span>
        <button onClick={downloadTemplate} className="text-[#0F64A8] hover:underline flex items-center gap-1">
          <Download className="h-3 w-3" /> Download Template
        </button>
      </div>
    </div>
  );
};

// Import Preview Dialog
const ImportPreviewDialog = ({ open, onClose, data, onConfirm, isLoading }) => {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Import Data</DialogTitle>
          <DialogDescription>
            Review the employee data before importing. {data.length} employee(s) will be processed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold">Name</th>
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-left p-3 font-semibold">Phone</th>
                <th className="text-left p-3 font-semibold">Department</th>
                <th className="text-left p-3 font-semibold">Position</th>
                <th className="text-left p-3 font-semibold">Pay Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3 text-muted-foreground">{row.email}</td>
                  <td className="p-3">{row.phone || row.contact || row.mobile || '-'}</td>
                  <td className="p-3">{row.department || 'General'}</td>
                  <td className="p-3">{row.position || 'Security Officer'}</td>
                  <td className="p-3">{row.hourly_rate || row.pay_rate || row.rate ? `£${row.hourly_rate || row.pay_rate || row.rate}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 50 && (
            <p className="text-center py-2 text-gray-500 text-sm">
              ... and {data.length - 50} more employees
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className="bg-[#0F64A8] hover:bg-[#0D5590]"
            disabled={isLoading}
          >
            {isLoading ? 'Importing...' : `Import ${data.length} Employees`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Import Result Dialog
const ImportResultDialog = ({ open, onClose, result }) => {
  if (!open || !result) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Complete</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-sm text-green-600">New Employees</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-sm text-blue-600">Updated</p>
              </CardContent>
            </Card>
          </div>
          
          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-700 mb-2">Errors ({result.errors.length})</p>
              <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-[#0F64A8] hover:bg-[#0D5590]">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [hoursWorked, setHoursWorked] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportSection, setShowImportSection] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, contractsRes] = await Promise.all([
        axios.get(`${API}/employees`),
        axios.get(`${API}/contracts`)
      ]);
      setEmployees(empRes.data);
      setContracts(contractsRes.data);
      
      // Fetch hours worked for each employee (this week)
      const hoursMap = {};
      for (const emp of empRes.data) {
        try {
          const timeRes = await axios.get(`${API}/staff/${emp.id}/timeclock`);
          const thisWeekEntries = timeRes.data.filter(entry => {
            const entryDate = new Date(entry.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            weekStart.setHours(0, 0, 0, 0);
            return entryDate >= weekStart;
          });
          hoursMap[emp.id] = thisWeekEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
        } catch (e) {
          hoursMap[emp.id] = 0;
        }
      }
      setHoursWorked(hoursMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || "",
        department: employee.department,
        position: employee.position,
        hourly_rate: employee.hourly_rate?.toString() || "",
        contract_id: employee.contract_id || "",
        bank_account: employee.bank_account || "",
        sort_code: employee.sort_code || "",
        tax_code: employee.tax_code || "1257L",
        ni_number: employee.ni_number || "",
        availability: employee.availability || "available"
      });
    } else {
      setEditingEmployee(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingEmployee(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      contract_id: formData.contract_id || null
    };

    try {
      if (editingEmployee) {
        await axios.put(`${API}/employees/${editingEmployee.id}`, payload);
        toast.success("Employee updated successfully");
      } else {
        await axios.post(`${API}/employees`, payload);
        toast.success("Employee added successfully");
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error(error.response?.data?.detail || "Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/employees/${employee.id}`);
      toast.success("Employee deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  // Import handlers
  const handleFileAccepted = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      if (data.length > 0) {
        setImportPreviewData(data);
        setImportPreviewOpen(true);
      } else {
        toast.error('No valid data found in the CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setIsImporting(true);
    try {
      const response = await axios.post(`${API}/employees/bulk-import`, { items: importPreviewData });
      setImportResult(response.data);
      setImportPreviewOpen(false);
      setImportResultOpen(true);
      setShowImportSection(false);
      fetchData();
    } catch (error) {
      console.error("Import error:", error);
      toast.error('Import failed. Please check your data and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const getContractName = (contractId) => {
    if (!contractId) return null;
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.name : null;
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8" data-testid="employees-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="employees-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">MANAGEMENT</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Employees
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(employees, 'employees', [
              { header: 'Name', accessor: (e) => e.name },
              { header: 'Email', accessor: (e) => e.email },
              { header: 'Phone', accessor: (e) => e.phone },
              { header: 'Department', accessor: (e) => e.department },
              { header: 'Position', accessor: (e) => e.position },
              { header: 'Hourly Rate', accessor: (e) => e.hourly_rate },
              { header: 'Bank Account', accessor: (e) => e.bank_account },
              { header: 'Sort Code', accessor: (e) => e.sort_code },
              { header: 'Tax Code', accessor: (e) => e.tax_code },
              { header: 'NI Number', accessor: (e) => e.ni_number },
              { header: 'Availability', accessor: (e) => e.availability },
            ])}
            className="gap-2"
            data-testid="export-employees-btn"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportSection(!showImportSection)}
            className="gap-2"
            data-testid="bulk-import-toggle-btn"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
            data-testid="add-employee-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TOTAL EMPLOYEES</p>
                <p className="text-3xl font-bold mt-1">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-[#0F64A8]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AVAILABLE</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {employees.filter(e => e.availability === 'available').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DEPARTMENTS</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {[...new Set(employees.map(e => e.department))].length}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">#</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import Section */}
      {showImportSection && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#0F64A8]" /> Bulk Import Employees
            </CardTitle>
            <CardDescription>
              Upload a CSV file to import multiple employees at once. Existing employees (matched by email) will be updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropZone onFileAccepted={handleFileAccepted} isLoading={isImporting} />
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">CSV Columns:</p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Required:</span> name, email<br />
                <span className="font-medium">Optional:</span> phone, department, position, hourly_rate (or pay_rate), bank_account, sort_code, tax_code, ni_number, availability
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="employee-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">All Employees ({filteredEmployees.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">No employees found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Add your first employee to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">NAME</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">DEPARTMENT</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">POSITION</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">HOURLY RATE</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">HOURS (WEEK)</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground">STATUS</th>
                    <th className="pb-3 font-semibold text-sm text-muted-foreground text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const availabilityOption = AVAILABILITY_OPTIONS.find(o => o.value === employee.availability) || AVAILABILITY_OPTIONS[0];
                    const contractName = getContractName(employee.contract_id);
                    
                    return (
                      <tr key={employee.id} className="border-b hover:bg-muted/50" data-testid={`employee-row-${employee.id}`}>
                        <td className="py-4">
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                            {employee.phone && (
                              <p className="text-xs text-muted-foreground">{employee.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {employee.department}
                          </span>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="text-sm">{employee.position}</p>
                            {contractName && (
                              <p className="text-xs text-muted-foreground">{contractName}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 font-medium">
                          {formatCurrency(employee.hourly_rate)}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{hoursWorked[employee.id]?.toFixed(1) || '0.0'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availabilityOption.color}`}>
                            {availabilityOption.label}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`employee-actions-${employee.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(employee)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(employee)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="employee-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="employee-email-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07123 456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                  placeholder="e.g., Door Supervisor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="15.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_id">Assigned Contract</Label>
                <Select
                  value={formData.contract_id}
                  onValueChange={(value) => setFormData({ ...formData, contract_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contract (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No contract</SelectItem>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>{contract.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Banking & Tax Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account Number</Label>
                  <Input
                    id="bank_account"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_code">Sort Code</Label>
                  <Input
                    id="sort_code"
                    value={formData.sort_code}
                    onChange={(e) => setFormData({ ...formData, sort_code: e.target.value })}
                    placeholder="12-34-56"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_code">Tax Code</Label>
                  <Input
                    id="tax_code"
                    value={formData.tax_code}
                    onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                    placeholder="1257L"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ni_number">NI Number</Label>
                  <Input
                    id="ni_number"
                    value={formData.ni_number}
                    onChange={(e) => setFormData({ ...formData, ni_number: e.target.value })}
                    placeholder="AB123456C"
                  />
                </div>
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
              >
                {submitting ? "Saving..." : (editingEmployee ? "Update Employee" : "Add Employee")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        open={importPreviewOpen}
        onClose={() => setImportPreviewOpen(false)}
        data={importPreviewData}
        onConfirm={handleImportConfirm}
        isLoading={isImporting}
      />

      {/* Import Result Dialog */}
      <ImportResultDialog
        open={importResultOpen}
        onClose={() => setImportResultOpen(false)}
        result={importResult}
      />
    </div>
  );
}
