import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, PoundSterling, Calendar, Building } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-[#DBEAFE] text-[#0F64A8]" },
  { value: "completed", label: "Completed", color: "bg-slate-100 text-slate-700" },
  { value: "on_hold", label: "On Hold", color: "bg-amber-100 text-amber-700" }
];

const initialFormData = {
  name: "",
  client: "",
  budget: "",
  start_date: "",
  end_date: "",
  description: "",
  status: "active"
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`);
      setContracts(response.data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const fetchContractDetail = async (contractId) => {
    try {
      const response = await axios.get(`${API}/contracts/${contractId}`);
      setSelectedContract(response.data);
      setShowDetailDialog(true);
    } catch (error) {
      console.error("Error fetching contract detail:", error);
      toast.error("Failed to load contract details");
    }
  };

  const handleOpenDialog = (contract = null) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        name: contract.name,
        client: contract.client,
        budget: contract.budget.toString(),
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        description: contract.description || "",
        status: contract.status
      });
    } else {
      setEditingContract(null);
      setFormData(initialFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingContract(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      budget: parseFloat(formData.budget),
      end_date: formData.end_date || null,
      description: formData.description || null
    };

    try {
      if (editingContract) {
        await axios.put(`${API}/contracts/${editingContract.id}`, payload);
        toast.success("Contract updated successfully");
      } else {
        await axios.post(`${API}/contracts`, payload);
        toast.success("Contract created successfully");
      }
      handleCloseDialog();
      fetchContracts();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast.error(error.response?.data?.detail || "Failed to save contract");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contract) => {
    if (!window.confirm(`Are you sure you want to delete "${contract.name}"? Employees will be unassigned.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/contracts/${contract.id}`);
      toast.success("Contract deleted successfully");
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return (
      <span className={`badge ${statusOption.color}`}>
        {statusOption.label}
      </span>
    );
  };

  // Calculate totals
  const totalBudget = contracts.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalLaborCost = contracts.reduce((sum, c) => sum + (c.labor_cost || 0), 0);
  const activeContracts = contracts.filter(c => c.status === "active").length;

  if (loading) {
    return (
      <div className="p-8" data-testid="contracts-loading">
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
    <div className="p-8" data-testid="contracts-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">FINANCE</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Contracts & Budget
          </h1>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#0F64A8] hover:bg-[#0D5590] text-white"
          data-testid="add-contract-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover" data-testid="stat-total-contracts">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL CONTRACTS</p>
                <p className="stat-value">{contracts.length}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Building className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-active-contracts">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">ACTIVE</p>
                <p className="stat-value">{activeContracts}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-total-budget">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL BUDGET</p>
                <p className="stat-value currency">{formatCurrency(totalBudget)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <PoundSterling className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-labor-cost">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">LABOR COST (ANNUAL)</p>
                <p className="stat-value currency">{formatCurrency(totalLaborCost)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="contracts-grid">
        {contracts.length > 0 ? (
          contracts.map((contract) => (
            <Card key={contract.id} className="card-hover cursor-pointer" data-testid={`contract-card-${contract.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => fetchContractDetail(contract.id)}>
                    <CardTitle className="font-heading text-lg font-semibold mb-1">
                      {contract.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{contract.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(contract.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`contract-actions-${contract.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(contract)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(contract)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => fetchContractDetail(contract.id)}>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-mono font-medium">{formatCurrency(contract.budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Labor Cost</span>
                    <span className="font-mono font-medium">{formatCurrency(contract.labor_cost || 0)}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Budget Utilization</span>
                      <span className="font-mono">{(contract.budget_utilization || 0).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(contract.budget_utilization || 0, 100)} 
                      className="h-2"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Users className="w-4 h-4" />
                    <span>{contract.employee_count || 0} employee{(contract.employee_count || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No contracts yet</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-[#0F64A8]"
              >
                Create your first contract
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Contract Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" data-testid="contract-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingContract ? "Edit Contract" : "New Contract"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Contract Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Website Redesign Project"
                  required
                  data-testid="contract-name-input"
                />
              </div>

              <div>
                <Label htmlFor="client">Client *</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="e.g., ABC Corporation"
                  required
                  data-testid="contract-client-input"
                />
              </div>

              <div>
                <Label htmlFor="budget">Total Budget (£) *</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  required
                  data-testid="contract-budget-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    data-testid="contract-start-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    data-testid="contract-end-date-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="contract-status-select">
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes..."
                  data-testid="contract-description-input"
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
                data-testid="save-contract-btn"
              >
                {submitting ? "Saving..." : editingContract ? "Update Contract" : "Create Contract"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl" data-testid="contract-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Contract Details</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold">{selectedContract.name}</h2>
                  <p className="text-muted-foreground">{selectedContract.client}</p>
                </div>
                {getStatusBadge(selectedContract.status)}
              </div>

              {selectedContract.description && (
                <p className="text-sm text-muted-foreground">{selectedContract.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="stat-label mb-1">BUDGET</p>
                    <p className="font-mono text-2xl font-bold">{formatCurrency(selectedContract.budget)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="stat-label mb-1">LABOR COST (ANNUAL)</p>
                    <p className="font-mono text-2xl font-bold">{formatCurrency(selectedContract.labor_cost || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Utilization</span>
                  <span className="font-mono font-medium">
                    {(selectedContract.budget_utilization || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(selectedContract.budget_utilization || 0, 100)} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Remaining: {formatCurrency(selectedContract.budget_remaining || 0)}</span>
                  <span>Monthly: {formatCurrency(selectedContract.monthly_labor_cost || 0)}/mo</span>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold mb-3">Assigned Employees ({selectedContract.employee_count || 0})</h3>
                {selectedContract.employees && selectedContract.employees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContract.employees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.position} - {emp.department}</p>
                        </div>
                        <p className="font-mono text-sm text-[#0F64A8]">{formatCurrency(emp.annual_salary)}/yr</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No employees assigned. Assign employees from the Employees page.
                  </p>
                )}
              </div>

              <div className="flex gap-4 text-sm text-muted-foreground border-t pt-4">
                <span>Start: {selectedContract.start_date}</span>
                {selectedContract.end_date && <span>End: {selectedContract.end_date}</span>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowDetailDialog(false);
                handleOpenDialog(selectedContract);
              }}
              className="bg-[#0F64A8] hover:bg-[#0D5590]"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
