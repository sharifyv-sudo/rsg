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
import { Plus, FileText, Eye, Printer, Trash2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Payslips() {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    period_month: (new Date().getMonth() + 1).toString(),
    period_year: currentYear.toString(),
    tax_deduction: "0",
    ni_deduction: "0",
    bonuses: "0"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [payslipsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/payslips`),
        axios.get(`${API}/employees`)
      ]);
      setPayslips(payslipsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      employee_id: formData.employee_id,
      period_month: parseInt(formData.period_month),
      period_year: parseInt(formData.period_year),
      tax_deduction: parseFloat(formData.tax_deduction) || 0,
      ni_deduction: parseFloat(formData.ni_deduction) || 0,
      bonuses: parseFloat(formData.bonuses) || 0,
      other_deductions: []
    };

    try {
      await axios.post(`${API}/payslips`, payload);
      toast.success("Payslip generated successfully");
      setShowGenerateDialog(false);
      setFormData({
        employee_id: "",
        period_month: (new Date().getMonth() + 1).toString(),
        period_year: currentYear.toString(),
        tax_deduction: "0",
        ni_deduction: "0",
        bonuses: "0"
      });
      fetchData();
    } catch (error) {
      console.error("Error generating payslip:", error);
      toast.error(error.response?.data?.detail || "Failed to generate payslip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowViewDialog(true);
  };

  const handleDeletePayslip = async (payslip) => {
    if (!window.confirm("Are you sure you want to delete this payslip?")) {
      return;
    }

    try {
      await axios.delete(`${API}/payslips/${payslip.id}`);
      toast.success("Payslip deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting payslip:", error);
      toast.error("Failed to delete payslip");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const monthlyGross = selectedEmployee ? selectedEmployee.annual_salary / 12 : 0;

  if (loading) {
    return (
      <div className="p-8" data-testid="payslips-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
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
    <div className="p-8" data-testid="payslips-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">PAYROLL</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Payslips
          </h1>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={employees.length === 0}
          data-testid="generate-payslip-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Payslip
        </Button>
      </div>

      {employees.length === 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              No employees found. Please add employees first before generating payslips.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payslips Table */}
      <Card data-testid="payslips-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            All Payslips ({payslips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payslips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table" data-testid="payslips-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th className="w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => {
                    const totalDeductions = payslip.tax_deduction + payslip.ni_deduction +
                      (payslip.other_deductions?.reduce((sum, d) => sum + d.amount, 0) || 0);
                    return (
                      <tr key={payslip.id} data-testid={`payslip-row-${payslip.id}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="font-medium">{payslip.employee_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-sm">
                            {MONTHS[payslip.period_month - 1]} {payslip.period_year}
                          </span>
                        </td>
                        <td className="font-mono">{formatCurrency(payslip.gross_salary)}</td>
                        <td className="font-mono text-destructive">
                          -{formatCurrency(totalDeductions)}
                        </td>
                        <td className="font-mono text-emerald-600 font-medium">
                          {formatCurrency(payslip.net_salary)}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewPayslip(payslip)}
                              data-testid={`view-payslip-${payslip.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeletePayslip(payslip)}
                              data-testid={`delete-payslip-${payslip.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payslips generated yet</p>
              {employees.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => setShowGenerateDialog(true)}
                  className="mt-2 text-emerald-600"
                >
                  Generate your first payslip
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Payslip Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg" data-testid="generate-payslip-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Generate Payslip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGeneratePayslip}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger data-testid="payslip-employee-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Month *</Label>
                  <Select
                    value={formData.period_month}
                    onValueChange={(value) => setFormData({ ...formData, period_month: value })}
                  >
                    <SelectTrigger data-testid="payslip-month-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year *</Label>
                  <Select
                    value={formData.period_year}
                    onValueChange={(value) => setFormData({ ...formData, period_year: value })}
                  >
                    <SelectTrigger data-testid="payslip-year-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedEmployee && (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Gross Salary</p>
                  <p className="font-mono text-xl font-bold text-foreground">
                    {formatCurrency(monthlyGross)}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Deductions & Adjustments (Optional)
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tax (PAYE) £</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.tax_deduction}
                      onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.value })}
                      data-testid="payslip-tax-input"
                    />
                  </div>
                  <div>
                    <Label>NI £</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.ni_deduction}
                      onChange={(e) => setFormData({ ...formData, ni_deduction: e.target.value })}
                      data-testid="payslip-ni-input"
                    />
                  </div>
                  <div>
                    <Label>Bonus £</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.bonuses}
                      onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                      data-testid="payslip-bonus-input"
                    />
                  </div>
                </div>
              </div>

              {selectedEmployee && (
                <div className="p-4 bg-emerald-50 rounded-md border border-emerald-200">
                  <p className="text-sm text-emerald-700 mb-1">Estimated Net Pay</p>
                  <p className="font-mono text-xl font-bold text-emerald-700">
                    {formatCurrency(
                      monthlyGross +
                      parseFloat(formData.bonuses || 0) -
                      parseFloat(formData.tax_deduction || 0) -
                      parseFloat(formData.ni_deduction || 0)
                    )}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={submitting || !formData.employee_id}
                data-testid="submit-payslip-btn"
              >
                {submitting ? "Generating..." : "Generate Payslip"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Payslip Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl" data-testid="view-payslip-dialog">
          <DialogHeader className="no-print">
            <DialogTitle className="font-heading">Payslip Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayslip && (
            <div className="payslip-document">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold">Right Service Group</h2>
                  <p className="text-sm text-muted-foreground">Payslip Document</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold">
                    {MONTHS[selectedPayslip.period_month - 1]} {selectedPayslip.period_year}
                  </p>
                  <p className="text-xs text-muted-foreground">Pay Period</p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="bg-muted p-4 rounded-md mb-4">
                <p className="text-sm text-muted-foreground mb-1">Employee</p>
                <p className="font-medium text-lg">{selectedPayslip.employee_name}</p>
              </div>

              {/* Earnings */}
              <div className="mb-4">
                <h3 className="font-heading font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                  Earnings
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>Basic Salary (Monthly)</span>
                    <span className="font-mono">{formatCurrency(selectedPayslip.gross_salary)}</span>
                  </div>
                  {selectedPayslip.bonuses > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Bonus</span>
                      <span className="font-mono text-emerald-600">+{formatCurrency(selectedPayslip.bonuses)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-medium">
                    <span>Total Earnings</span>
                    <span className="font-mono">{formatCurrency(selectedPayslip.gross_salary + selectedPayslip.bonuses)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-4">
                <h3 className="font-heading font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                  Deductions
                </h3>
                <div className="space-y-2">
                  {selectedPayslip.tax_deduction > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Income Tax (PAYE)</span>
                      <span className="font-mono text-destructive">-{formatCurrency(selectedPayslip.tax_deduction)}</span>
                    </div>
                  )}
                  {selectedPayslip.ni_deduction > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>National Insurance</span>
                      <span className="font-mono text-destructive">-{formatCurrency(selectedPayslip.ni_deduction)}</span>
                    </div>
                  )}
                  {selectedPayslip.other_deductions?.map((d, i) => (
                    <div key={i} className="flex justify-between py-2 border-b">
                      <span>{d.name}</span>
                      <span className="font-mono text-destructive">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium">
                    <span>Total Deductions</span>
                    <span className="font-mono text-destructive">
                      -{formatCurrency(
                        selectedPayslip.tax_deduction +
                        selectedPayslip.ni_deduction +
                        (selectedPayslip.other_deductions?.reduce((sum, d) => sum + d.amount, 0) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-emerald-700">Net Pay</p>
                    <p className="text-xs text-emerald-600">Amount to be paid</p>
                  </div>
                  <p className="font-mono text-3xl font-bold text-emerald-700">
                    {formatCurrency(selectedPayslip.net_salary)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-emerald-500 hover:bg-emerald-600">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
