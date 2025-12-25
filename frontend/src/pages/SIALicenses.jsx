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
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileUp,
  Download
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SIA License Type options
const SIA_LICENSE_TYPES = [
  { value: "door_supervisor", label: "Door Supervisor" },
  { value: "security_guard", label: "Security Guard" },
  { value: "cctv", label: "CCTV Operator" },
  { value: "close_protection", label: "Close Protection" },
  { value: "key_holding", label: "Key Holding" },
  { value: "vehicle_immobiliser", label: "Vehicle Immobiliser" },
];

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
    const content = 'employee_name,license_number,license_type,expiry_date,is_active,notes\nJohn Smith,1234567890123456,door_supervisor,2026-08-01,true,Front of house';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sia_import_template.csv';
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

const SIALicenses = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState({
    employee_name: "",
    license_number: "",
    license_type: "",
    expiry_date: "",
    is_active: true,
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [siaRes, statsRes] = await Promise.all([
        axios.get(`${API}/sia`),
        axios.get(`${API}/compliance/stats`),
      ]);
      setRecords(siaRes.data);
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
        await axios.put(`${API}/sia/${editingRecord.id}`, form);
        toast.success("SIA license updated");
      } else {
        await axios.post(`${API}/sia`, form);
        toast.success("SIA license created");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving SIA record:", error);
      toast.error("Failed to save license");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setForm({
      employee_name: record.employee_name,
      license_number: record.license_number,
      license_type: record.license_type,
      expiry_date: record.expiry_date,
      is_active: record.is_active,
      notes: record.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this license record?")) {
      try {
        await axios.delete(`${API}/sia/${id}`);
        toast.success("License deleted");
        fetchData();
      } catch (error) {
        console.error("Error deleting SIA record:", error);
        toast.error("Failed to delete license");
      }
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setForm({
      employee_name: "",
      license_number: "",
      license_type: "",
      expiry_date: "",
      is_active: true,
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
          const response = await axios.post(`${API}/sia/bulk-import`, { items: data });
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
    record.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">COMPLIANCE</p>
        <h1 className="text-3xl font-bold text-foreground">SIA Licenses</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TOTAL LICENSES</p>
                <p className="text-3xl font-bold mt-1">{stats?.sia?.total || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ACTIVE</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.sia?.active || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">EXPIRING SOON</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats?.sia?.expiring_soon || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
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
          <CardDescription>Upload a CSV file to import multiple SIA licenses at once. Existing employees will be updated.</CardDescription>
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
                placeholder="Search licenses..."
                className="pl-10 w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="add-sia-btn"><Plus className="h-4 w-4" /> Add SIA License</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingRecord ? "Edit SIA License" : "Add SIA License"}</DialogTitle>
                  <DialogDescription>{editingRecord ? "Update the SIA license details" : "Add a new SIA license record"}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee Name *</Label>
                    <Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number *</Label>
                    <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} required placeholder="e.g., 1234567890123456" />
                  </div>
                  <div className="space-y-2">
                    <Label>License Type *</Label>
                    <Select value={form.license_type} onValueChange={(value) => setForm({ ...form, license_type: value })}>
                      <SelectTrigger><SelectValue placeholder="Select license type" /></SelectTrigger>
                      <SelectContent>
                        {SIA_LICENSE_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date *</Label>
                    <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} required />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sia-active"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="sia-active">Active License</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingRecord ? "Update" : "Add"} License</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">All SIA Licenses ({filteredRecords.length})</p>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No SIA licenses recorded yet.</p>
                <p className="text-sm">Upload a CSV or click "Add SIA License" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NAME</TableHead>
                    <TableHead>LICENSE NUMBER</TableHead>
                    <TableHead>LICENSE TYPE</TableHead>
                    <TableHead>EXPIRY DATE</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell className="font-mono">{record.license_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {SIA_LICENSE_TYPES.find((t) => t.value === record.license_type)?.label || record.license_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`${
                          isExpired(record.expiry_date) ? "text-red-600" : isExpiringSoon(record.expiry_date) ? "text-orange-600" : ""
                        }`}>
                          {record.expiry_date}
                          {isExpired(record.expiry_date) && <span className="ml-1 text-xs">(Expired)</span>}
                          {isExpiringSoon(record.expiry_date) && !isExpired(record.expiry_date) && <span className="ml-1 text-xs">(Expiring Soon)</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={record.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {record.is_active ? "Active" : "Inactive"}
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

export default SIALicenses;
