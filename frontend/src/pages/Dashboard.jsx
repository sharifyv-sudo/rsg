import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, PoundSterling, Building2, TrendingUp, AlertTriangle, ShieldCheck, FileCheck, Clock, ChevronRight, Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
  const [complianceAlerts, setComplianceAlerts] = useState(null);
  const [complianceStats, setComplianceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, alertsRes, complianceRes] = await Promise.all([
        axios.get(`${API}/dashboard`),
        axios.get(`${API}/compliance/alerts`),
        axios.get(`${API}/compliance/stats`)
      ]);
      setStats(dashboardRes.data);
      setComplianceAlerts(alertsRes.data);
      setComplianceStats(complianceRes.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlerts = async () => {
    setSendingAlerts(true);
    try {
      await axios.post(`${API}/compliance/send-alerts`);
      toast.success("Compliance alert email sent to admin");
    } catch (error) {
      console.error("Error sending alerts:", error);
      toast.error("Failed to send alert email");
    } finally {
      setSendingAlerts(false);
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

  const totalAlerts = complianceAlerts?.total_alerts || 0;
  const expiredCount = complianceAlerts?.expired_count || 0;

  return (
    <div className="p-8" data-testid="dashboard">
      <div className="mb-8">
        <p className="stat-label mb-1">OVERVIEW</p>
        <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
          Payroll Dashboard
        </h1>
      </div>

      {/* Compliance Alert Banner */}
      {totalAlerts > 0 && (
        <Card className={`mb-6 border-l-4 ${expiredCount > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-6 w-6 ${expiredCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <p className={`font-semibold ${expiredCount > 0 ? 'text-red-900' : 'text-amber-900'}`}>
                    Compliance Alert: {totalAlerts} document{totalAlerts !== 1 ? 's' : ''} require attention
                  </p>
                  <p className={`text-sm ${expiredCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                    {expiredCount > 0 && `${expiredCount} expired • `}
                    {complianceAlerts?.expiring_soon_count || 0} expiring within 30 days
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendAlerts}
                  disabled={sendingAlerts}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingAlerts ? "Sending..." : "Email Alert"}
                </Button>
                <Link to="/right-to-work">
                  <Button variant="outline" size="sm" className="gap-2">
                    View Details <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Compliance Overview */}
        <Card data-testid="compliance-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg font-semibold">Compliance Status</CardTitle>
              {totalAlerts > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Bell className="h-3 w-3" />
                  {totalAlerts}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* RTW Status */}
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="h-4 w-4 text-[#0F64A8]" />
                  <span className="font-medium text-sm">Right to Work</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{complianceStats?.rtw?.valid || 0}</p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{complianceStats?.rtw?.expiring_soon || 0}</p>
                    <p className="text-xs text-muted-foreground">Expiring</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{complianceStats?.rtw?.expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </div>
              </div>

              {/* SIA Status */}
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">SIA Licenses</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{complianceStats?.sia?.valid || 0}</p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{complianceStats?.sia?.expiring_soon || 0}</p>
                    <p className="text-xs text-muted-foreground">Expiring</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{complianceStats?.sia?.expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </div>
              </div>

              {/* Expiring Soon List */}
              {complianceAlerts?.alerts?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">URGENT ATTENTION</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {complianceAlerts.alerts.slice(0, 5).map((alert, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="truncate">{alert.employee_name}</span>
                        <Badge 
                          variant={alert.status === 'expired' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {alert.status === 'expired' ? 'Expired' : `${alert.days_until_expiry}d`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/right-to-work" className="block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  View All Compliance <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
