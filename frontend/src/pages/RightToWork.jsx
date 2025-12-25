import { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { 
  FileCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  FileUp,
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

const getStatusBadge = (status) => {
  const variants = {
    valid: "bg-green-100 text-green-700 border-green-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    not_checked: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return variants[status] || variants.not_checked;
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
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
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
    const content = 'employee_name,document_type,document_number,check_date,expiry_date,status,notes\nJohn Smith,passport,AB123456,2025-01-15,2030-01-15,valid,Verified in person';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rtw_import_template.csv';
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
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <FileUp className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
        <p className="text-gray-600 mb-2">{isLoading ? 'Processing...' : 'Drag and drop your CSV file here'}</p>
        <p className="text-sm text-gray-400 mb-4">or</p>
        <label className="cursor-pointer">
          <span className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Browse Files</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} disabled={isLoading} />
        </label>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Supported format: CSV</span>
        <button onClick={downloadTemplate} className="text-primary hover:underline flex items-center gap-1">
          <Download className="h-4 w-4" /> Download Template
        </button>
      </div>
    </div>
  );
};

const RightToWork = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState({
    employee_name: "",
    document_type: "",
    document_number: "",
    check_date: "",
    expiry_date: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rtwRes, statsRes] = await Promise.all([
        axios.get(`${API}/rtw`),
        axios.get(`${API}/compliance/stats`),
      ]);
      setRecords(rtwRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await axios.put(`${API}/rtw/${editingRecord.id}`, form);
        toast.success("RTW record updated");
      } else {
        await axios.post(`${API}/rtw`, form);
        toast.success("RTW record created");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving RTW record:", error);
      toast.error("Failed to save record");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setForm({
      employee_name: record.employee_name,
      document_type: record.document_type,
      document_number: record.document_number,
      check_date: record.check_date,
      expiry_date: record.expiry_date || "",
      status: record.status,
      notes: record.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await axios.delete(`${API}/rtw/${id}`);
        toast.success("Record deleted");
        fetchData();
      } catch (error) {
        console.error("Error deleting RTW record:", error);
        toast.error("Failed to delete record");
      }
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setForm({
      employee_name: "",
      document_type: "",
      document_number: "",
      check_date: "",
      expiry_date: "",
      status: "pending",
      notes: "",
    });
  };

  const handleFileAccepted = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      if (data.length > 0) {
        setIsImporting(true);
        try {
          const response = await axios.post(`${API}/rtw/bulk-import`, { items: data });
          toast.success(`Import complete: ${response.data.created} created, ${response.data.updated} updated`);
          if (response.data.errors?.length > 0) {
            toast.warning(`${response.data.errors.length} rows had errors`);
          }
          fetchData();
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Import failed");
        } finally {
          setIsImporting(false);
        }
      } else {
        toast.error('No valid data found in the CSV file');
      }
    };
    reader.readAsText(file);
  };

  const filteredRecords = records.filter(record =>
    record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">COMPLIANCE</p>
        <h1 className="text-3xl font-bold text-foreground">Right to Work Checks</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TOTAL CHECKS</p>
                <p className="text-3xl font-bold mt-1">{stats?.rtw?.total || 0}</p>
              </div>
              <FileCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">VALID</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.rtw?.valid || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PENDING</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.rtw?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">EXPIRED</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats?.rtw?.expired || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Bulk Import
          </CardTitle>
          <CardDescription>Upload a CSV file to import multiple RTW checks at once. Existing employees will be updated.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropZone onFileAccepted={handleFileAccepted} isLoading={isImporting} />
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10 w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="add-rtw-btn"><Plus className="h-4 w-4" /> Add RTW Check</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingRecord ? "Edit RTW Check" : "Add RTW Check"}</DialogTitle>
                  <DialogDescription>{editingRecord ? "Update the Right to Work check details" : "Add a new Right to Work check record"}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee Name *</Label>
                    <Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type *</Label>
                    <Select value={form.document_type} onValueChange={(value) => setForm({ ...form, document_type: value })}>
                      <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                      <SelectContent>
                        {RTW_DOCUMENT_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Document Number *</Label>
                    <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check Date *</Label>
                      <Input type="date" value={form.check_date} onChange={(e) => setForm({ ...form, check_date: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {RTW_STATUS_OPTIONS.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingRecord ? "Update" : "Add"} Record</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">All RTW Checks ({filteredRecords.length})</p>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No Right to Work checks recorded yet.</p>
                <p className="text-sm">Upload a CSV or click "Add RTW Check" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NAME</TableHead>
                    <TableHead>DOCUMENT TYPE</TableHead>
                    <TableHead>DOCUMENT NUMBER</TableHead>
                    <TableHead>CHECK DATE</TableHead>
                    <TableHead>EXPIRY DATE</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {RTW_DOCUMENT_TYPES.find((t) => t.value === record.document_type)?.label || record.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{record.document_number}</TableCell>
                      <TableCell>{record.check_date}</TableCell>
                      <TableCell>
                        {record.expiry_date ? (
                          <span className={isExpired(record.expiry_date) ? "text-red-600" : ""}>
                            {record.expiry_date}{isExpired(record.expiry_date) && <span className="ml-1 text-xs">(Expired)</span>}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>
                          {RTW_STATUS_OPTIONS.find((s) => s.value === record.status)?.label || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
  );
};

export default RightToWork;
