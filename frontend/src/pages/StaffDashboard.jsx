import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, FileText, Briefcase, LogIn, LogOut } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

const formatTime = (isoStr) => {
  if (!isoStr) return '--:--';
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function StaffDashboard({ userId, userName }) {
  const [loading, setLoading] = useState(true);
  const [clockStatus, setClockStatus] = useState({ is_clocked_in: false });
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [recentPayslips, setRecentPayslips] = useState([]);
  const [clockingIn, setClockingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [statusRes, assignedRes, availableRes, payslipsRes] = await Promise.all([
        axios.get(`${API}/staff/${userId}/status`),
        axios.get(`${API}/staff/${userId}/jobs`),
        axios.get(`${API}/staff/${userId}/available-jobs`),
        axios.get(`${API}/staff/${userId}/payslips`)
      ]);
      setClockStatus(statusRes.data);
      setAssignedJobs(assignedRes.data.filter(j => j.status === 'upcoming'));
      setAvailableJobs(availableRes.data);
      setRecentPayslips(payslipsRes.data.slice(0, 3));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      await axios.post(`${API}/staff/${userId}/clock-in`, {});
      toast.success("Clocked in successfully!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingIn(true);
    try {
      const response = await axios.post(`${API}/staff/${userId}/clock-out`, {});
      toast.success(`Clocked out! Hours worked: ${response.data.hours_worked}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="staff-dashboard-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="staff-dashboard">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Welcome, {userName}
        </h1>
        <p className="text-muted-foreground text-sm">Staff Portal Dashboard</p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="mb-6 border-2 border-[#0F64A8]" data-testid="clock-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${clockStatus.is_clocked_in ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Clock className={`w-7 h-7 ${clockStatus.is_clocked_in ? 'text-green-600' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {clockStatus.is_clocked_in ? 'Currently Working' : 'Not Clocked In'}
                </p>
                {clockStatus.is_clocked_in && clockStatus.current_entry && (
                  <p className="text-sm text-muted-foreground">
                    Since {formatTime(clockStatus.current_entry.clock_in)}
                    {clockStatus.current_entry.job_name && ` • ${clockStatus.current_entry.job_name}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={clockStatus.is_clocked_in ? handleClockOut : handleClockIn}
              disabled={clockingIn}
              className={clockStatus.is_clocked_in 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
              }
              size="lg"
              data-testid={clockStatus.is_clocked_in ? "clock-out-btn" : "clock-in-btn"}
            >
              {clockStatus.is_clocked_in ? (
                <><LogOut className="w-5 h-5 mr-2" /> Clock Out</>
              ) : (
                <><LogIn className="w-5 h-5 mr-2" /> Clock In</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Upcoming Jobs */}
        <Card data-testid="my-jobs-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#0F64A8]" />
              My Upcoming Jobs ({assignedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedJobs.length > 0 ? (
              <div className="space-y-3">
                {assignedJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="p-3 bg-[#E0F2FE] rounded-md">
                    <p className="font-medium text-sm">{job.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(job.date)} • {job.start_time} - {job.end_time}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No upcoming jobs assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Available Jobs to Sign Up */}
        <Card data-testid="available-jobs-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#3AB09E]" />
              Available Jobs ({availableJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableJobs.length > 0 ? (
              <div className="space-y-3">
                {availableJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="p-3 bg-muted rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{job.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(job.date)} • {job.start_time} - {job.end_time}
                        </p>
                        <p className="text-xs text-[#3AB09E] mt-1">
                          {job.spots_remaining} spot{job.spots_remaining !== 1 ? 's' : ''} remaining
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No jobs available to sign up for
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payslips */}
        <Card data-testid="payslips-card" className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0F64A8]" />
              Recent Payslips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayslips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentPayslips.map((ps) => (
                  <div key={ps.id} className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      {new Date(ps.period_year, ps.period_month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-mono text-xl font-bold text-[#0F64A8] mt-1">
                      £{ps.net_salary.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No payslips available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
