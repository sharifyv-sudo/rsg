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
import { Plus, MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEPARTMENTS = [
  "Engineering",
  "Marketing",
  "Sales",
  "Finance",
  "Human Resources",
  "Operations",
  "Customer Support",
  "Design",
  "Legal",
  "Other"
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const initialFormData = {
  name: "",
  email: "",
  department: "",
  position: "",
  annual_salary: "",
  contract_id: "",
  bank_account: "",
  sort_code: "",
  tax_code: "1257L",
  ni_number: ""
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
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
        department: employee.department,
        position: employee.position,
        annual_salary: employee.annual_salary.toString(),
        contract_id: employee.contract_id || "",
        bank_account: employee.bank_account || "",
        sort_code: employee.sort_code || "",
        tax_code: employee.tax_code || "1257L",
        ni_number: employee.ni_number || ""
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
      annual_salary: parseFloat(formData.annual_salary),
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
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          data-testid="add-employee-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-0"
              data-testid="search-employees"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card data-testid="employees-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            All Employees ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table" data-testid="employees-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Annual Salary</th>
                    <th>Tax Code</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} data-testid={`employee-row-${employee.id}`}>
                      <td>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-slate">{employee.department}</span>
                      </td>
                      <td>{employee.position}</td>
                      <td className="font-mono text-emerald-600 font-medium">
                        {formatCurrency(employee.annual_salary)}
                      </td>
                      <td className="font-mono text-sm text-muted-foreground">
                        {employee.tax_code || "1257L"}
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`employee-actions-${employee.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(employee)} data-testid={`edit-employee-${employee.id}`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(employee)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-employee-${employee.id}`}
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
              <p className="text-muted-foreground">No employees found</p>
              <Button
                variant="link"
                onClick={() => handleOpenDialog()}
                className="mt-2 text-emerald-600"
              >
                Add your first employee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" data-testid="employee-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="employee-name-input"
                  />
                </div>
                <div>
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
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    required
                  >
                    <SelectTrigger data-testid="employee-department-select">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                    data-testid="employee-position-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="annual_salary">Annual Salary (£) *</Label>
                <Input
                  id="annual_salary"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData({ ...formData, annual_salary: e.target.value })}
                  required
                  data-testid="employee-salary-input"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Optional Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_account">Bank Account</Label>
                    <Input
                      id="bank_account"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      placeholder="12345678"
                      data-testid="employee-bank-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort_code">Sort Code</Label>
                    <Input
                      id="sort_code"
                      value={formData.sort_code}
                      onChange={(e) => setFormData({ ...formData, sort_code: e.target.value })}
                      placeholder="12-34-56"
                      data-testid="employee-sortcode-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="tax_code">Tax Code</Label>
                    <Input
                      id="tax_code"
                      value={formData.tax_code}
                      onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                      placeholder="1257L"
                      data-testid="employee-taxcode-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ni_number">NI Number</Label>
                    <Input
                      id="ni_number"
                      value={formData.ni_number}
                      onChange={(e) => setFormData({ ...formData, ni_number: e.target.value })}
                      placeholder="AB123456C"
                      data-testid="employee-ni-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={submitting}
                data-testid="save-employee-btn"
              >
                {submitting ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
