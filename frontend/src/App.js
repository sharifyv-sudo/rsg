import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, FileCheck, Plus, Pencil, Trash2, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";

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
    valid: "bg-green-100 text-green-800 border-green-200",
    expired: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    not_checked: "bg-gray-100 text-gray-800 border-gray-200",
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

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rtwRecords, setRtwRecords] = useState([]);
  const [siaRecords, setSiaRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Compliance Manager</h1>
                <p className="text-sm text-slate-500">Right to Work & SIA License Tracking</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="gap-2">
              <Users className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="rtw" data-testid="tab-rtw" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Right to Work
            </TabsTrigger>
            <TabsTrigger value="sia" data-testid="tab-sia" className="gap-2">
              <Shield className="h-4 w-4" />
              SIA Licenses
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" data-testid="dashboard-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total RTW Checks</CardTitle>
                  <FileCheck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.rtw?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Valid RTW</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.rtw?.valid || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total SIA Licenses</CardTitle>
                  <Shield className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.sia?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Pending RTW</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats?.rtw?.pending || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts Section */}
            {(stats?.rtw?.expired > 0 || stats?.sia?.expiring_soon > 0) && (
              <Card className="border-orange-200 bg-orange-50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-orange-700">
                  {stats?.rtw?.expired > 0 && (
                    <p>{stats.rtw.expired} Right to Work check(s) have expired.</p>
                  )}
                  {stats?.sia?.expiring_soon > 0 && (
                    <p>{stats.sia.expiring_soon} SIA license(s) are expiring soon.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Records Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent RTW Checks</CardTitle>
                  <CardDescription>Latest 5 Right to Work checks</CardDescription>
                </CardHeader>
                <CardContent>
                  {rtwRecords.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No RTW records yet</p>
                  ) : (
                    <div className="space-y-3">
                      {rtwRecords.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{record.employee_name}</p>
                            <p className="text-sm text-slate-500">
                              {RTW_DOCUMENT_TYPES.find((t) => t.value === record.document_type)?.label}
                            </p>
                          </div>
                          <Badge className={getStatusBadge(record.status)}>
                            {RTW_STATUS_OPTIONS.find((s) => s.value === record.status)?.label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent SIA Licenses</CardTitle>
                  <CardDescription>Latest 5 SIA license records</CardDescription>
                </CardHeader>
                <CardContent>
                  {siaRecords.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No SIA records yet</p>
                  ) : (
                    <div className="space-y-3">
                      {siaRecords.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{record.employee_name}</p>
                            <p className="text-sm text-slate-500">{record.license_number}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={record.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {record.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {isExpired(record.expiry_date) && (
                              <p className="text-xs text-red-600 mt-1">Expired</p>
                            )}
                            {isExpiringSoon(record.expiry_date) && !isExpired(record.expiry_date) && (
                              <p className="text-xs text-orange-600 mt-1">Expiring Soon</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Right to Work Tab */}
          <TabsContent value="rtw" data-testid="rtw-content">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Right to Work Checks</CardTitle>
                  <CardDescription>Manage and track employee Right to Work verification status</CardDescription>
                </div>
                <Dialog open={rtwDialogOpen} onOpenChange={(open) => { setRtwDialogOpen(open); if (!open) resetRtwForm(); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-rtw-btn" className="gap-2">
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
                        <Label htmlFor="rtw-name">Employee Name</Label>
                        <Input
                          id="rtw-name"
                          data-testid="rtw-name-input"
                          value={rtwForm.employee_name}
                          onChange={(e) => setRtwForm({ ...rtwForm, employee_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rtw-doc-type">Document Type</Label>
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
                        <Label htmlFor="rtw-doc-number">Document Number</Label>
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
                          <Label htmlFor="rtw-check-date">Check Date</Label>
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
                        <Label htmlFor="rtw-status">Status</Label>
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
                        <Button type="submit" data-testid="rtw-submit-btn">
                          {editingRtw ? "Update" : "Add"} Record
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : rtwRecords.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileCheck className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No Right to Work checks recorded yet.</p>
                    <p className="text-sm">Click "Add RTW Check" to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Document Number</TableHead>
                        <TableHead>Check Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rtwRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`rtw-row-${record.id}`}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>
                            {RTW_DOCUMENT_TYPES.find((t) => t.value === record.document_type)?.label}
                          </TableCell>
                          <TableCell>{record.document_number}</TableCell>
                          <TableCell>{record.check_date}</TableCell>
                          <TableCell>
                            {record.expiry_date || "-"}
                            {record.expiry_date && isExpired(record.expiry_date) && (
                              <span className="ml-2 text-red-600 text-xs">(Expired)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(record.status)}>
                              {RTW_STATUS_OPTIONS.find((s) => s.value === record.status)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRtw(record)}
                                data-testid={`rtw-edit-${record.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRtw(record.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`rtw-delete-${record.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SIA Licenses Tab */}
          <TabsContent value="sia" data-testid="sia-content">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>SIA Licenses</CardTitle>
                  <CardDescription>Track and manage SIA license numbers and expiry dates</CardDescription>
                </div>
                <Dialog open={siaDialogOpen} onOpenChange={(open) => { setSiaDialogOpen(open); if (!open) resetSiaForm(); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-sia-btn" className="gap-2">
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
                        <Label htmlFor="sia-name">Employee Name</Label>
                        <Input
                          id="sia-name"
                          data-testid="sia-name-input"
                          value={siaForm.employee_name}
                          onChange={(e) => setSiaForm({ ...siaForm, employee_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sia-license-number">License Number</Label>
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
                        <Label htmlFor="sia-license-type">License Type</Label>
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
                        <Label htmlFor="sia-expiry-date">Expiry Date</Label>
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
                        <Button type="submit" data-testid="sia-submit-btn">
                          {editingSia ? "Update" : "Add"} License
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : siaRecords.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No SIA licenses recorded yet.</p>
                    <p className="text-sm">Click "Add SIA License" to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>License Number</TableHead>
                        <TableHead>License Type</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siaRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`sia-row-${record.id}`}>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell className="font-mono">{record.license_number}</TableCell>
                          <TableCell>
                            {SIA_LICENSE_TYPES.find((t) => t.value === record.license_type)?.label}
                          </TableCell>
                          <TableCell>
                            {record.expiry_date}
                            {isExpired(record.expiry_date) && (
                              <span className="ml-2 text-red-600 text-xs">(Expired)</span>
                            )}
                            {isExpiringSoon(record.expiry_date) && !isExpired(record.expiry_date) && (
                              <span className="ml-2 text-orange-600 text-xs">(Expiring Soon)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={record.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {record.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSia(record)}
                                data-testid={`sia-edit-${record.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSia(record.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`sia-delete-${record.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
