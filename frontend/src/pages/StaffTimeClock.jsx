import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Briefcase, LogIn, LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatTime = (isoStr) => {
  if (!isoStr) return '--:--';
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

export default function StaffTimeClock({ userId, userName }) {
  const [loading, setLoading] = useState(true);
  const [clockStatus, setClockStatus] = useState({ is_clocked_in: false });
  const [timeEntries, setTimeEntries] = useState([]);
  const [todaysJobs, setTodaysJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [clockingIn, setClockingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [statusRes, entriesRes, jobsRes] = await Promise.all([
        axios.get(`${API}/staff/${userId}/status`),
        axios.get(`${API}/staff/${userId}/timeclock`),
        axios.get(`${API}/staff/${userId}/jobs`)
      ]);
      setClockStatus(statusRes.data);
      setTimeEntries(entriesRes.data);
      
      // Filter for today's jobs
      const today = new Date().toISOString().split('T')[0];
      setTodaysJobs(jobsRes.data.filter(j => j.date === today && j.status === 'upcoming'));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      await axios.post(`${API}/staff/${userId}/clock-in`, {
        job_id: selectedJob || null
      });
      toast.success("Clocked in successfully!");
      setSelectedJob("");
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

  // Calculate weekly hours
  const thisWeekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return entryDate >= weekStart;
  });
  const weeklyHours = thisWeekEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  if (loading) {
    return (
      <div className="p-6" data-testid="timeclock-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-40 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="staff-timeclock-page">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Time Clock</h1>
        <p className="text-muted-foreground text-sm">Track your working hours</p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="mb-6 border-2 border-[#0F64A8]" data-testid="clock-action-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${clockStatus.is_clocked_in ? 'bg-green-100 animate-pulse' : 'bg-slate-100'}`}>
                <Clock className={`w-8 h-8 ${clockStatus.is_clocked_in ? 'text-green-600' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="font-heading font-bold text-xl">
                  {clockStatus.is_clocked_in ? 'Currently Working' : 'Not Clocked In'}
                </p>
                {clockStatus.is_clocked_in && clockStatus.current_entry && (
                  <p className="text-muted-foreground">
                    Started at {formatTime(clockStatus.current_entry.clock_in)}
                    {clockStatus.current_entry.job_name && (
                      <span className="ml-2 badge bg-[#E0F2FE] text-[#0F64A8]">
                        {clockStatus.current_entry.job_name}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!clockStatus.is_clocked_in && todaysJobs.length > 0 && (
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger className="w-48" data-testid="job-select">
                    <SelectValue placeholder="Select job (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific job</SelectItem>
                    {todaysJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button
                onClick={clockStatus.is_clocked_in ? handleClockOut : handleClockIn}
                disabled={clockingIn}
                className={`h-12 px-6 ${clockStatus.is_clocked_in 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
                }`}
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
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="font-mono text-2xl font-bold text-[#0F64A8]">{weeklyHours.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Today's Jobs</p>
            <p className="font-mono text-2xl font-bold">{todaysJobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Entries This Week</p>
            <p className="font-mono text-2xl font-bold">{thisWeekEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card data-testid="time-entries-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours</th>
                    <th>Job</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.slice(0, 10).map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-medium">{formatDate(entry.date)}</td>
                      <td className="font-mono">{formatTime(entry.clock_in)}</td>
                      <td className="font-mono">{entry.clock_out ? formatTime(entry.clock_out) : <span className="text-green-600">Active</span>}</td>
                      <td className="font-mono font-medium text-[#0F64A8]">
                        {entry.hours_worked ? `${entry.hours_worked.toFixed(2)} hrs` : '-'}
                      </td>
                      <td>
                        {entry.job_name ? (
                          <span className="badge bg-[#E0F2FE] text-[#0F64A8]">{entry.job_name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No time entries yet. Clock in to start tracking your hours.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
