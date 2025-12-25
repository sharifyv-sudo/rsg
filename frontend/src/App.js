import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  FileCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  LayoutDashboard,
  Briefcase,
  Clock,
  FileText,
  Users,
  Receipt,
  FileSpreadsheet,
  LogOut,
  Search,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileUp,
  X,
  Download
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// RTW Status options
const RTW_STATUS_OPTIONS = [
  { value: "valid", label: "Valid" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Pending" },
  { value: "not_checked", label: "Not Checked" },
];

// RTW Document Type options
const RTW_DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "brp", label: "Biometric Residence Permit (BRP)" },
  { value: "share_code", label: "Share Code" },
  { value: "visa", label: "Visa" },
  { value: "settled_status", label: "Settled Status" },
  { value: "pre_settled_status", label: "Pre-Settled Status" },
  { value: "other", label: "Other" },
];

// SIA License Type options
const SIA_LICENSE_TYPES = [
  { value: "door_supervisor", label: "Door Supervisor" },
  { value: "security_guard", label: "Security Guard" },
  { value: "cctv", label: "CCTV Operator" },
  { value: "close_protection", label: "Close Protection" },
  { value: "key_holding", label: "Key Holding" },
  { value: "vehicle_immobiliser", label: "Vehicle Immobiliser" },
];

const getStatusBadge = (status) => {
  const variants = {
    valid: "bg-green-100 text-green-700 border-green-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    not_checked: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return variants[status] || variants.not_checked;
};

const isExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry <= thirtyDaysFromNow && expiry >= today;
};

const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry < today;
};

// CSV Parser function
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Get headers from first line
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length >= 2) {  // At least 2 values
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }
  }
  return data;
};

// Sidebar Navigation Item Component
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
      active 
        ? "bg-[#0066B3] text-white" 
        : "text-gray-600 hover:bg-gray-100"
    }`}
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </button>
);

// File Drop Zone Component
const FileDropZone = ({ onFileAccepted, type, isLoading }) => {
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
        alert('Please upload a CSV file');
      }
    }
  }, [onFileAccepted]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        onFileAccepted(file);
      } else {
        alert('Please upload a CSV file');
      }
    }
  };

  const templateHeaders = type === 'rtw' 
    ? 'employee_name,document_type,document_number,check_date,expiry_date,status,notes'
    : 'employee_name,license_number,license_type,expiry_date,is_active,notes';

  const sampleRow = type === 'rtw'
    ? 'John Smith,passport,AB123456,2025-01-15,2030-01-15,valid,Verified in person'
    : 'John Smith,1234567890123456,door_supervisor,2026-08-01,true,Front of house';

  const downloadTemplate = () => {
    const content = `${templateHeaders}\n${sampleRow}`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_import_template.csv`;
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
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-[#0066B3] bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <FileUp className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-[#0066B3]' : 'text-gray-400'}`} />
        <p className="text-gray-600 mb-2">
          {isLoading ? 'Processing...' : 'Drag and drop your CSV file here'}
        </p>
        <p className="text-sm text-gray-400 mb-4">or</p>
        <label className="cursor-pointer">
          <span className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:bg-[#005299] transition-colors">
            Browse Files
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
            disabled={isLoading}
          />
        </label>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Supported format: CSV</span>
        <button 
          onClick={downloadTemplate}
          className="text-[#0066B3] hover:underline flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>
    </div>
  );
};

// Import Preview Dialog
const ImportPreviewDialog = ({ open, onClose, data, type, onConfirm, isLoading }) => {
  if (!open) return null;
  
  const headers = type === 'rtw' 
    ? ['Employee Name', 'Document Type', 'Document #', 'Check Date', 'Expiry Date', 'Status']
    : ['Employee Name', 'License #', 'License Type', 'Expiry Date', 'Active'];

  const getRowValues = (row) => {
    if (type === 'rtw') {
      return [
        row.employee_name,
        row.document_type,
        row.document_number,
        row.check_date,
        row.expiry_date || '-',
        row.status || 'pending'
      ];
    }
    return [
      row.employee_name,
      row.license_number,
      row.license_type,
      row.expiry_date,
      row.is_active?.toString() || 'true'
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Import Data</DialogTitle>
          <DialogDescription>
            Review the data before importing. {data.length} record(s) will be processed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {headers.map((h, i) => (
                  <TableHead key={i} className="font-semibold text-gray-600">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((row, idx) => (
                <TableRow key={idx}>
                  {getRowValues(row).map((val, i) => (
                    <TableCell key={i} className="text-sm">{val}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 50 && (
            <p className="text-center py-2 text-gray-500 text-sm">
              ... and {data.length - 50} more rows
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className="bg-[#0066B3] hover:bg-[#005299]"
            disabled={isLoading}
          >
            {isLoading ? 'Importing...' : `Import ${data.length} Records`}
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
                <p className="text-sm text-green-600">Created</p>
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
          <Button onClick={onClose} className="bg-[#0066B3] hover:bg-[#005299]">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function App() {
  const [activePage, setActivePage] = useState("rtw");
  const [rtwRecords, setRtwRecords] = useState([]);
  const [siaRecords, setSiaRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // RTW Form state
  const [rtwDialogOpen, setRtwDialogOpen] = useState(false);
  const [editingRtw, setEditingRtw] = useState(null);
  const [rtwForm, setRtwForm] = useState({
    employee_name: "",
    document_type: "",
    document_number: "",
    check_date: "",
    expiry_date: "",
    status: "pending",
    notes: "",
  });

  // SIA Form state
  const [siaDialogOpen, setSiaDialogOpen] = useState(false);
  const [editingSia, setEditingSia] = useState(null);
  const [siaForm, setSiaForm] = useState({
    employee_name: "",
    license_number: "",
    license_type: "",
    expiry_date: "",
    is_active: true,
    notes: "",
  });

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState(null); // 'rtw' or 'sia'
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rtwRes, siaRes, statsRes] = await Promise.all([
        axios.get(`${API}/rtw`),
        axios.get(`${API}/sia`),
        axios.get(`${API}/dashboard/stats`),
      ]);
      setRtwRecords(rtwRes.data);
      setSiaRecords(siaRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // RTW Handlers
  const handleRtwSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRtw) {
        await axios.put(`${API}/rtw/${editingRtw.id}`, rtwForm);
      } else {
        await axios.post(`${API}/rtw`, rtwForm);
      }
      setRtwDialogOpen(false);
      resetRtwForm();
      fetchData();
    } catch (error) {
      console.error("Error saving RTW record:", error);
    }
  };

  const handleEditRtw = (record) => {
    setEditingRtw(record);
    setRtwForm({
      employee_name: record.employee_name,
      document_type: record.document_type,
      document_number: record.document_number,
      check_date: record.check_date,
      expiry_date: record.expiry_date || "",
      status: record.status,
      notes: record.notes || "",
    });
    setRtwDialogOpen(true);
  };

  const handleDeleteRtw = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await axios.delete(`${API}/rtw/${id}`);
        fetchData();
      } catch (error) {
        console.error("Error deleting RTW record:", error);
      }
    }
  };

  const resetRtwForm = () => {
    setEditingRtw(null);
    setRtwForm({
      employee_name: "",
      document_type: "",
      document_number: "",
      check_date: "",
      expiry_date: "",
      status: "pending",
      notes: "",
    });
  };

  // SIA Handlers
  const handleSiaSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSia) {
        await axios.put(`${API}/sia/${editingSia.id}`, siaForm);
      } else {
        await axios.post(`${API}/sia`, siaForm);
      }
      setSiaDialogOpen(false);
      resetSiaForm();
      fetchData();
    } catch (error) {
      console.error("Error saving SIA record:", error);
    }
  };

  const handleEditSia = (record) => {
    setEditingSia(record);
    setSiaForm({
      employee_name: record.employee_name,
      license_number: record.license_number,
      license_type: record.license_type,
      expiry_date: record.expiry_date,
      is_active: record.is_active,
      notes: record.notes || "",
    });
    setSiaDialogOpen(true);
  };

  const handleDeleteSia = async (id) => {
    if (window.confirm("Are you sure you want to delete this license record?")) {
      try {
        await axios.delete(`${API}/sia/${id}`);
        fetchData();
      } catch (error) {
        console.error("Error deleting SIA record:", error);
      }
    }
  };

  const resetSiaForm = () => {
    setEditingSia(null);
    setSiaForm({
      employee_name: "",
      license_number: "",
      license_type: "",
      expiry_date: "",
      is_active: true,
      notes: "",
    });
  };

  // Import Handlers
  const handleFileAccepted = async (file, type) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      if (data.length > 0) {
        setImportType(type);
        setImportPreviewData(data);
        setImportDialogOpen(false);
        setImportPreviewOpen(true);
      } else {
        alert('No valid data found in the CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setIsImporting(true);
    try {
      const endpoint = importType === 'rtw' ? '/rtw/bulk-import' : '/sia/bulk-import';
      const response = await axios.post(`${API}${endpoint}`, { items: importPreviewData });
      setImportResult(response.data);
      setImportPreviewOpen(false);
      setImportResultOpen(true);
      fetchData();
    } catch (error) {
      console.error("Import error:", error);
      alert('Import failed. Please check your data and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Filter records based on search term
  const filteredRtwRecords = rtwRecords.filter(record =>
    record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSiaRecords = siaRecords.filter(record =>
    record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_payroll-gbp/artifacts/3i59dflc_Picture1.jpg" 
              alt="Right Service Group" 
              className="h-10 w-auto"
            />
          </div>
          <div className="mt-2">
            <h1 className="text-lg font-bold text-[#0066B3]">Right Service Group</h1>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activePage === "dashboard"}
            onClick={() => setActivePage("dashboard")}
          />
          <NavItem 
            icon={Briefcase} 
            label="Jobs" 
            active={activePage === "jobs"}
            onClick={() => setActivePage("jobs")}
          />
          <NavItem 
            icon={Clock} 
            label="Timesheets" 
            active={activePage === "timesheets"}
            onClick={() => setActivePage("timesheets")}
          />
          <NavItem 
            icon={FileText} 
            label="Contracts" 
            active={activePage === "contracts"}
            onClick={() => setActivePage("contracts")}
          />
          <NavItem 
            icon={Users} 
            label="Employees" 
            active={activePage === "employees"}
            onClick={() => setActivePage("employees")}
          />
          <NavItem 
            icon={Receipt} 
            label="Invoices" 
            active={activePage === "invoices"}
            onClick={() => setActivePage("invoices")}
          />
          <NavItem 
            icon={FileSpreadsheet} 
            label="Payslips" 
            active={activePage === "payslips"}
            onClick={() => setActivePage("payslips")}
          />
          
          {/* Divider */}
          <div className="my-4 border-t border-gray-200" />
          
          {/* Compliance Section */}
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Compliance</p>
          <NavItem 
            icon={FileCheck} 
            label="Right to Work" 
            active={activePage === "rtw"}
            onClick={() => setActivePage("rtw")}
          />
          <NavItem 
            icon={Shield} 
            label="SIA Licenses" 
            active={activePage === "sia"}
            onClick={() => setActivePage("sia")}
          />
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
          <p className="text-xs text-gray-400 mt-4 text-center">© 2025 Right Service Group</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Right to Work Page */}
        {activePage === "rtw" && (
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">COMPLIANCE</p>
              <h1 className="text-3xl font-bold text-gray-900">Right to Work Checks</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL CHECKS</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.rtw?.total || 0}</p>
                    </div>
                    <FileCheck className="h-8 w-8 text-[#0066B3]" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">VALID</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{stats?.rtw?.valid || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">PENDING</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.rtw?.pending || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">EXPIRED</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">{stats?.rtw?.expired || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Section */}
            <Card className="border-0 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#0066B3]" />
                  Bulk Import
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to import multiple RTW checks at once. Existing employees will be updated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileDropZone 
                  onFileAccepted={(file) => handleFileAccepted(file, 'rtw')}
                  type="rtw"
                  isLoading={isImporting}
                />
              </CardContent>
            </Card>

            {/* Table Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {/* Search and Add */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-10 w-80 border-gray-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Dialog open={rtwDialogOpen} onOpenChange={(open) => { setRtwDialogOpen(open); if (!open) resetRtwForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#0066B3] hover:bg-[#005299] gap-2" data-testid="add-rtw-btn">
                        <Plus className="h-4 w-4" />
                        Add RTW Check
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingRtw ? "Edit RTW Check" : "Add RTW Check"}</DialogTitle>
                        <DialogDescription>
                          {editingRtw ? "Update the Right to Work check details" : "Add a new Right to Work check record"}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleRtwSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="rtw-name">Employee Name *</Label>
                          <Input
                            id="rtw-name"
                            data-testid="rtw-name-input"
                            value={rtwForm.employee_name}
                            onChange={(e) => setRtwForm({ ...rtwForm, employee_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rtw-doc-type">Document Type *</Label>
                          <Select
                            value={rtwForm.document_type}
                            onValueChange={(value) => setRtwForm({ ...rtwForm, document_type: value })}
                          >
                            <SelectTrigger data-testid="rtw-doc-type-select">
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                              {RTW_DOCUMENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rtw-doc-number">Document Number *</Label>
                          <Input
                            id="rtw-doc-number"
                            data-testid="rtw-doc-number-input"
                            value={rtwForm.document_number}
                            onChange={(e) => setRtwForm({ ...rtwForm, document_number: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="rtw-check-date">Check Date *</Label>
                            <Input
                              id="rtw-check-date"
                              type="date"
                              data-testid="rtw-check-date-input"
                              value={rtwForm.check_date}
                              onChange={(e) => setRtwForm({ ...rtwForm, check_date: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rtw-expiry-date">Expiry Date</Label>
                            <Input
                              id="rtw-expiry-date"
                              type="date"
                              data-testid="rtw-expiry-date-input"
                              value={rtwForm.expiry_date}
                              onChange={(e) => setRtwForm({ ...rtwForm, expiry_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rtw-status">Status *</Label>
                          <Select
                            value={rtwForm.status}
                            onValueChange={(value) => setRtwForm({ ...rtwForm, status: value })}
                          >
                            <SelectTrigger data-testid="rtw-status-select">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {RTW_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rtw-notes">Notes</Label>
                          <Textarea
                            id="rtw-notes"
                            data-testid="rtw-notes-input"
                            value={rtwForm.notes}
                            onChange={(e) => setRtwForm({ ...rtwForm, notes: e.target.value })}
                            placeholder="Optional notes..."
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-[#0066B3] hover:bg-[#005299]" data-testid="rtw-submit-btn">
                            {editingRtw ? "Update" : "Add"} Record
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Table */}
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600 mb-4">All RTW Checks ({filteredRtwRecords.length})</p>
                  
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : filteredRtwRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No Right to Work checks recorded yet.</p>
                      <p className="text-sm">Upload a CSV or click "Add RTW Check" to get started.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-600">NAME</TableHead>
                          <TableHead className="font-semibold text-gray-600">DOCUMENT TYPE</TableHead>
                          <TableHead className="font-semibold text-gray-600">DOCUMENT NUMBER</TableHead>
                          <TableHead className="font-semibold text-gray-600">CHECK DATE</TableHead>
                          <TableHead className="font-semibold text-gray-600">EXPIRY DATE</TableHead>
                          <TableHead className="font-semibold text-gray-600">STATUS</TableHead>
                          <TableHead className="font-semibold text-gray-600 text-right">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRtwRecords.map((record) => (
                          <TableRow key={record.id} data-testid={`rtw-row-${record.id}`} className="hover:bg-gray-50">
                            <TableCell>
                              <p className="font-semibold text-gray-900">{record.employee_name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {RTW_DOCUMENT_TYPES.find((t) => t.value === record.document_type)?.label || record.document_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-gray-600">{record.document_number}</TableCell>
                            <TableCell className="text-gray-600">{record.check_date}</TableCell>
                            <TableCell>
                              {record.expiry_date ? (
                                <span className={isExpired(record.expiry_date) ? "text-red-600" : "text-gray-600"}>
                                  {record.expiry_date}
                                  {isExpired(record.expiry_date) && <span className="ml-1 text-xs">(Expired)</span>}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(record.status)}>
                                {RTW_STATUS_OPTIONS.find((s) => s.value === record.status)?.label || record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditRtw(record)}>
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRtw(record.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SIA Licenses Page */}
        {activePage === "sia" && (
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">COMPLIANCE</p>
              <h1 className="text-3xl font-bold text-gray-900">SIA Licenses</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL LICENSES</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.sia?.total || 0}</p>
                    </div>
                    <Shield className="h-8 w-8 text-[#0066B3]" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIVE</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{stats?.sia?.active || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">EXPIRING SOON</p>
                      <p className="text-3xl font-bold text-orange-600 mt-1">{stats?.sia?.expiring_soon || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Section */}
            <Card className="border-0 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#0066B3]" />
                  Bulk Import
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to import multiple SIA licenses at once. Existing employees will be updated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileDropZone 
                  onFileAccepted={(file) => handleFileAccepted(file, 'sia')}
                  type="sia"
                  isLoading={isImporting}
                />
              </CardContent>
            </Card>

            {/* Table Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {/* Search and Add */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search licenses..."
                      className="pl-10 w-80 border-gray-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Dialog open={siaDialogOpen} onOpenChange={(open) => { setSiaDialogOpen(open); if (!open) resetSiaForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#0066B3] hover:bg-[#005299] gap-2" data-testid="add-sia-btn">
                        <Plus className="h-4 w-4" />
                        Add SIA License
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingSia ? "Edit SIA License" : "Add SIA License"}</DialogTitle>
                        <DialogDescription>
                          {editingSia ? "Update the SIA license details" : "Add a new SIA license record"}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSiaSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sia-name">Employee Name *</Label>
                          <Input
                            id="sia-name"
                            data-testid="sia-name-input"
                            value={siaForm.employee_name}
                            onChange={(e) => setSiaForm({ ...siaForm, employee_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sia-license-number">License Number *</Label>
                          <Input
                            id="sia-license-number"
                            data-testid="sia-license-number-input"
                            value={siaForm.license_number}
                            onChange={(e) => setSiaForm({ ...siaForm, license_number: e.target.value })}
                            required
                            placeholder="e.g., 1234567890123456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sia-license-type">License Type *</Label>
                          <Select
                            value={siaForm.license_type}
                            onValueChange={(value) => setSiaForm({ ...siaForm, license_type: value })}
                          >
                            <SelectTrigger data-testid="sia-license-type-select">
                              <SelectValue placeholder="Select license type" />
                            </SelectTrigger>
                            <SelectContent>
                              {SIA_LICENSE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sia-expiry-date">Expiry Date *</Label>
                          <Input
                            id="sia-expiry-date"
                            type="date"
                            data-testid="sia-expiry-date-input"
                            value={siaForm.expiry_date}
                            onChange={(e) => setSiaForm({ ...siaForm, expiry_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="sia-active"
                            data-testid="sia-active-checkbox"
                            checked={siaForm.is_active}
                            onChange={(e) => setSiaForm({ ...siaForm, is_active: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="sia-active">Active License</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sia-notes">Notes</Label>
                          <Textarea
                            id="sia-notes"
                            data-testid="sia-notes-input"
                            value={siaForm.notes}
                            onChange={(e) => setSiaForm({ ...siaForm, notes: e.target.value })}
                            placeholder="Optional notes..."
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-[#0066B3] hover:bg-[#005299]" data-testid="sia-submit-btn">
                            {editingSia ? "Update" : "Add"} License
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Table */}
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600 mb-4">All SIA Licenses ({filteredSiaRecords.length})</p>
                  
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : filteredSiaRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No SIA licenses recorded yet.</p>
                      <p className="text-sm">Upload a CSV or click "Add SIA License" to get started.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-600">NAME</TableHead>
                          <TableHead className="font-semibold text-gray-600">LICENSE NUMBER</TableHead>
                          <TableHead className="font-semibold text-gray-600">LICENSE TYPE</TableHead>
                          <TableHead className="font-semibold text-gray-600">EXPIRY DATE</TableHead>
                          <TableHead className="font-semibold text-gray-600">STATUS</TableHead>
                          <TableHead className="font-semibold text-gray-600 text-right">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSiaRecords.map((record) => (
                          <TableRow key={record.id} data-testid={`sia-row-${record.id}`} className="hover:bg-gray-50">
                            <TableCell>
                              <p className="font-semibold text-gray-900">{record.employee_name}</p>
                            </TableCell>
                            <TableCell className="font-mono text-gray-600">{record.license_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {SIA_LICENSE_TYPES.find((t) => t.value === record.license_type)?.label || record.license_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`${
                                isExpired(record.expiry_date) 
                                  ? "text-red-600" 
                                  : isExpiringSoon(record.expiry_date) 
                                    ? "text-orange-600" 
                                    : "text-gray-600"
                              }`}>
                                {record.expiry_date}
                                {isExpired(record.expiry_date) && <span className="ml-1 text-xs">(Expired)</span>}
                                {isExpiringSoon(record.expiry_date) && !isExpired(record.expiry_date) && (
                                  <span className="ml-1 text-xs">(Expiring Soon)</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={record.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                {record.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditSia(record)}>
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteSia(record.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Placeholder pages for other sections */}
        {activePage === "dashboard" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">OVERVIEW</p>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Dashboard</h1>
            <p className="mt-4 text-gray-600">Dashboard content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "jobs" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">STAFFING</p>
            <h1 className="text-3xl font-bold text-gray-900">Job Assignments</h1>
            <p className="mt-4 text-gray-600">Jobs content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "timesheets" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">TIME TRACKING</p>
            <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
            <p className="mt-4 text-gray-600">Timesheets content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "contracts" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">MANAGEMENT</p>
            <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
            <p className="mt-4 text-gray-600">Contracts content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "employees" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">MANAGEMENT</p>
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="mt-4 text-gray-600">Employees content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "invoices" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">BILLING</p>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-4 text-gray-600">Invoices content - This section is managed in your main payroll app.</p>
          </div>
        )}

        {activePage === "payslips" && (
          <div className="p-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">PAYROLL</p>
            <h1 className="text-3xl font-bold text-gray-900">Payslips</h1>
            <p className="mt-4 text-gray-600">Payslips content - This section is managed in your main payroll app.</p>
          </div>
        )}
      </main>

      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        open={importPreviewOpen}
        onClose={() => setImportPreviewOpen(false)}
        data={importPreviewData}
        type={importType}
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

export default App;
