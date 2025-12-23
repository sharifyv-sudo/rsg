import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PoundSterling, Building2, TrendingUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8" data-testid="dashboard-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="dashboard">
      <div className="mb-8">
        <p className="stat-label mb-1">OVERVIEW</p>
        <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
          Payroll Dashboard
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover" data-testid="stat-total-employees">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL EMPLOYEES</p>
                <p className="stat-value">{stats?.total_employees || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-monthly-payroll">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">MONTHLY PAYROLL</p>
                <p className="stat-value currency">{formatCurrency(stats?.total_monthly_payroll || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-[#DBEAFE] flex items-center justify-center">
                <PoundSterling className="w-5 h-5 text-[#0F64A8]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-avg-salary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">AVG. ANNUAL SALARY</p>
                <p className="stat-value currency">{formatCurrency(stats?.average_salary || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-departments">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">DEPARTMENTS</p>
                <p className="stat-value">{stats?.departments?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <Card data-testid="departments-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.departments?.length > 0 ? (
              <div className="space-y-3">
                {stats.departments.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="font-medium text-sm">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{dept.count} employee{dept.count !== 1 ? 's' : ''}</p>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground">
                      {formatCurrency(dept.total_salary / 12)}/mo
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No departments yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payslips */}
        <Card data-testid="recent-payslips-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold">Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recent_payslips?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_payslips.map((ps, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="font-medium text-sm">{ps.employee_name}</p>
                      <p className="text-xs text-muted-foreground">Period: {ps.period}</p>
                    </div>
                    <p className="font-mono text-sm font-medium text-[#0F64A8]">
                      {formatCurrency(ps.net_salary)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payslips generated yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
