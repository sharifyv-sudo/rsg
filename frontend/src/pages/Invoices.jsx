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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Send, CheckCircle, FileText, AlertCircle, Clock, PoundSterling, X, FileDown } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// CSV Export Helper
const exportToCSV = (data, filename, columns) => {
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(item => 
    columns.map(col => {
      const value = col.accessor(item);
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700", icon: FileText },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "overdue", label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-500", icon: X }
];

const initialFormData = {
  client_name: "",
  client_email: "",
  job_id: "",
  items: [{ description: "", quantity: 1, unit_price: 0 }],
  tax_rate: 20,
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: ""
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/invoices`),
        axios.get(`${API}/jobs`),
        axios.get(`${API}/invoices/stats/summary`)
      ]);
      setInvoices(invoicesRes.data);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        client_name: invoice.client_name,
        client_email: invoice.client_email || "",
        job_id: invoice.job_id || "",
        items: invoice.items.length > 0 ? invoice.items : [{ description: "", quantity: 1, unit_price: 0 }],
        tax_rate: invoice.tax_rate,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes || ""
      });
    } else {
      setEditingInvoice(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingInvoice(null);
    setFormData(initialFormData);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0
    );
    const tax = subtotal * (formData.tax_rate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      items: formData.items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0
      })),
      tax_rate: parseFloat(formData.tax_rate),
      job_id: formData.job_id || null
    };

    try {
      if (editingInvoice) {
        await axios.put(`${API}/invoices/${editingInvoice.id}`, payload);
        toast.success("Invoice updated successfully");
      } else {
        await axios.post(`${API}/invoices`, payload);
        toast.success("Invoice created successfully");
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error(error.response?.data?.detail || "Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/invoices/${invoice.id}`);
      toast.success("Invoice deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleSendInvoice = async (invoice) => {
    if (!invoice.client_email) {
      toast.error("Please add client email before sending");
      return;
    }

    try {
      await axios.post(`${API}/invoices/${invoice.id}/send`);
      toast.success(`Invoice sent to ${invoice.client_email}`);
      fetchData();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error(error.response?.data?.detail || "Failed to send invoice");
    }
  };

  const handleMarkPaid = async (invoice) => {
    try {
      await axios.post(`${API}/invoices/${invoice.id}/mark-paid`);
      toast.success("Invoice marked as paid");
      fetchData();
    } catch (error) {
      console.error("Error marking invoice paid:", error);
      toast.error("Failed to update invoice");
    }
  };

  const handleGenerateFromJob = async (jobId) => {
    try {
      const res = await axios.post(`${API}/invoices/generate-from-job/${jobId}`);
      toast.success(`Invoice ${res.data.invoice_number} generated`);
      fetchData();
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(error.response?.data?.detail || "Failed to generate invoice");
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = statusOption.icon;
    return (
      <span className={`badge ${statusOption.color} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {statusOption.label}
      </span>
    );
  };

  const filteredInvoices = filterStatus === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === filterStatus);

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="p-8" data-testid="invoices-loading">
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
    <div className="p-8" data-testid="invoices-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">FINANCE</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Invoice Tracker
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(invoices, 'invoices', [
              { header: 'Invoice Number', accessor: (i) => i.invoice_number },
              { header: 'Client Name', accessor: (i) => i.client_name },
              { header: 'Client Email', accessor: (i) => i.client_email || '' },
              { header: 'Job', accessor: (i) => i.job_name || '' },
              { header: 'Issue Date', accessor: (i) => i.issue_date },
              { header: 'Due Date', accessor: (i) => i.due_date },
              { header: 'Subtotal', accessor: (i) => i.subtotal },
              { header: 'Tax Rate', accessor: (i) => i.tax_rate },
              { header: 'Total Amount', accessor: (i) => i.total_amount },
              { header: 'Status', accessor: (i) => i.status },
              { header: 'Notes', accessor: (i) => i.notes || '' },
            ])}
            className="gap-2"
            data-testid="export-invoices-btn"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Generate from Job
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {jobs.filter(j => j.status === 'completed').length > 0 ? (
                jobs.filter(j => j.status === 'completed').map(job => (
                  <DropdownMenuItem key={job.id} onClick={() => handleGenerateFromJob(job.id)}>
                    {job.name} - {formatDate(job.date)}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No completed jobs</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
            data-testid="add-invoice-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL INVOICED</p>
                <p className="stat-value text-2xl">{formatCurrency(stats.total_invoiced)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">PAID</p>
                <p className="stat-value text-2xl text-green-600">{formatCurrency(stats.total_paid)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.paid_count} invoices</p>
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
                <p className="stat-label mb-2">PENDING</p>
                <p className="stat-value text-2xl text-amber-600">{formatCurrency(stats.total_pending)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.pending_count} invoices</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">OVERDUE</p>
                <p className="stat-value text-2xl text-red-600">{formatCurrency(stats.total_overdue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.overdue_count} invoices</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg font-semibold">
              All Invoices ({filteredInvoices.length})
            </CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Job</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <td>
                        <span className="font-mono font-medium text-[#0F64A8]">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{invoice.client_name}</p>
                          <p className="text-xs text-muted-foreground">{invoice.client_email || 'No email'}</p>
                        </div>
                      </td>
                      <td>
                        {invoice.job_name ? (
                          <span className="text-sm">{invoice.job_name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="font-mono text-sm">{formatDate(invoice.issue_date)}</td>
                      <td className="font-mono text-sm">{formatDate(invoice.due_date)}</td>
                      <td>
                        <div>
                          <p className="font-mono font-medium">{formatCurrency(invoice.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            incl. VAT {invoice.tax_rate}%
                          </p>
                        </div>
                      </td>
                      <td>{getStatusBadge(invoice.status)}</td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(invoice)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                <Send className="w-4 h-4 mr-2" />
                                Send to Client
                              </DropdownMenuItem>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(invoice)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice)}
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
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-[#0F64A8]"
              >
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingInvoice ? `Edit Invoice ${editingInvoice.invoice_number}` : "Create New Invoice"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    required
                    placeholder="e.g., Arsenal FC"
                  />
                </div>
                <div>
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="billing@client.com"
                  />
                </div>
              </div>

              {/* Link to Job */}
              <div>
                <Label htmlFor="job_id">Link to Job (Optional)</Label>
                <Select
                  value={formData.job_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, job_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.name} - {formatDate(job.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue_date">Issue Date *</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        {index === 0 && <Label className="text-xs">Description</Label>}
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Service description"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        {index === 0 && <Label className="text-xs">Qty</Label>}
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        {index === 0 && <Label className="text-xs">Unit Price (£)</Label>}
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        {index === 0 && <Label className="text-xs">Total</Label>}
                        <Input
                          value={formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax and Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>VAT</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                        className="w-16 h-7 text-xs"
                      />
                      <span>%:</span>
                    </div>
                    <span className="font-mono">{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="font-mono text-[#0F64A8]">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or payment instructions..."
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
              >
                {submitting ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
