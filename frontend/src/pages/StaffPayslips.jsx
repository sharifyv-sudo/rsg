import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function StaffPayslips({ userId, userName }) {
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  useEffect(() => {
    fetchPayslips();
  }, [userId]);

  const fetchPayslips = async () => {
    try {
      const response = await axios.get(`${API}/staff/${userId}/payslips`);
      setPayslips(response.data);
    } catch (error) {
      console.error("Error fetching payslips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="payslips-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="staff-payslips-page">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">My Payslips</h1>
        <p className="text-muted-foreground text-sm">View your payment history</p>
      </div>

      {selectedPayslip ? (
        /* Payslip Detail View */
        <div>
          <Button
            variant="outline"
            onClick={() => setSelectedPayslip(null)}
            className="mb-4"
          >
            ← Back to list
          </Button>
          
          <Card className="max-w-2xl" data-testid="payslip-detail">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#0F64A8]">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_payroll-gbp/artifacts/3i59dflc_Picture1.jpg" 
                    alt="Right Service Group Logo" 
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <h2 className="font-heading text-xl font-bold text-[#0F64A8]">Right Service Group</h2>
                    <p className="text-sm text-muted-foreground">Payslip</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-lg">
                    {MONTHS[selectedPayslip.period_month - 1]} {selectedPayslip.period_year}
                  </p>
                </div>
              </div>

              {/* Employee */}
              <div className="bg-muted p-3 rounded-md mb-4">
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-medium">{selectedPayslip.employee_name}</p>
              </div>

              {/* Earnings */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">EARNINGS</h3>
                <div className="flex justify-between py-2 border-b">
                  <span>Basic Salary</span>
                  <span className="font-mono">{formatCurrency(selectedPayslip.gross_salary)}</span>
                </div>
                {selectedPayslip.bonuses > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span>Bonus</span>
                    <span className="font-mono text-green-600">+{formatCurrency(selectedPayslip.bonuses)}</span>
                  </div>
                )}
              </div>

              {/* Deductions */}
              {(selectedPayslip.tax_deduction > 0 || selectedPayslip.ni_deduction > 0) && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">DEDUCTIONS</h3>
                  {selectedPayslip.tax_deduction > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Income Tax (PAYE)</span>
                      <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.tax_deduction)}</span>
                    </div>
                  )}
                  {selectedPayslip.ni_deduction > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>National Insurance</span>
                      <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.ni_deduction)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Net Pay */}
              <div className="bg-[#E0F2FE] p-4 rounded-md border border-[#41BDF0]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-[#0F64A8]">Net Pay</p>
                  </div>
                  <p className="font-mono text-3xl font-bold text-[#0F64A8]">
                    {formatCurrency(selectedPayslip.net_salary)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end no-print">
                <Button onClick={handlePrint} className="bg-[#0F64A8] hover:bg-[#0D5590]">
                  <Download className="w-4 h-4 mr-2" /> Print / Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Payslips List */
        <div>
          {payslips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="payslips-grid">
              {payslips.map((payslip) => (
                <Card 
                  key={payslip.id} 
                  className="cursor-pointer card-hover"
                  onClick={() => setSelectedPayslip(payslip)}
                  data-testid={`payslip-${payslip.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#0F64A8]" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {MONTHS[payslip.period_month - 1]} {payslip.period_year}
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-bold text-[#0F64A8]">
                      {formatCurrency(payslip.net_salary)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gross: {formatCurrency(payslip.gross_salary)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No payslips available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your payslips will appear here once processed
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
