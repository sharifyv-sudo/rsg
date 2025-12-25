import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, Users, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default function StaffJobs({ userId, userName }) {
  const [loading, setLoading] = useState(true);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');

  useEffect(() => {
    fetchJobs();
  }, [userId]);

  const fetchJobs = async () => {
    try {
      const [assignedRes, availableRes] = await Promise.all([
        axios.get(`${API}/staff/${userId}/jobs`),
        axios.get(`${API}/staff/${userId}/available-jobs`)
      ]);
      setAssignedJobs(assignedRes.data);
      setAvailableJobs(availableRes.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (jobId, jobName) => {
    try {
      await axios.post(`${API}/staff/${userId}/signup-job`, { job_id: jobId });
      toast.success(`Signed up for ${jobName}!`);
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to sign up");
    }
  };

  const handleWithdraw = async (jobId, jobName) => {
    if (!window.confirm(`Are you sure you want to withdraw from "${jobName}"?`)) return;
    
    try {
      await axios.post(`${API}/staff/${userId}/withdraw-job/${jobId}`);
      toast.success("Withdrawn from job");
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to withdraw");
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="staff-jobs-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingAssigned = assignedJobs.filter(j => j.status === 'upcoming');
  const pastAssigned = assignedJobs.filter(j => j.status !== 'upcoming');

  return (
    <div className="p-6" data-testid="staff-jobs-page">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Jobs</h1>
        <p className="text-muted-foreground text-sm">View and sign up for available work</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'assigned' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assigned')}
          className={activeTab === 'assigned' ? 'bg-[#0F64A8]' : ''}
          data-testid="tab-assigned"
        >
          My Jobs ({upcomingAssigned.length})
        </Button>
        <Button
          variant={activeTab === 'available' ? 'default' : 'outline'}
          onClick={() => setActiveTab('available')}
          className={activeTab === 'available' ? 'bg-[#0F64A8]' : ''}
          data-testid="tab-available"
        >
          Available ({availableJobs.length})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'bg-[#0F64A8]' : ''}
          data-testid="tab-history"
        >
          History ({pastAssigned.length})
        </Button>
      </div>

      {/* Assigned Jobs */}
      {activeTab === 'assigned' && (
        <div className="space-y-4" data-testid="assigned-jobs-list">
          {upcomingAssigned.length > 0 ? (
            upcomingAssigned.map((job) => (
              <Card key={job.id} className="border-l-4 border-l-[#0F64A8]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-lg">{job.name}</h3>
                      <p className="text-sm text-muted-foreground">{job.client}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(job.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{job.start_time} - {job.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span>{job.job_type}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-sm font-mono font-medium text-[#0F64A8]">
                          {formatCurrency(job.hourly_rate)}/hr
                        </span>
                        <span className="badge bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" /> Confirmed
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdraw(job.id, job.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`withdraw-${job.id}`}
                    >
                      <X className="w-4 h-4 mr-1" /> Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming jobs assigned</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab('available')}
                  className="mt-2 text-[#0F64A8]"
                >
                  Browse available jobs
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Available Jobs */}
      {activeTab === 'available' && (
        <div className="space-y-4" data-testid="available-jobs-list">
          {availableJobs.length > 0 ? (
            availableJobs.map((job) => (
              <Card key={job.id} className="border-l-4 border-l-[#3AB09E]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-lg">{job.name}</h3>
                      <p className="text-sm text-muted-foreground">{job.client}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(job.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{job.start_time} - {job.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[#3AB09E] font-medium">
                            {job.spots_remaining} spot{job.spots_remaining !== 1 ? 's' : ''} left
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <span className="text-sm font-mono font-medium text-[#0F64A8]">
                          {formatCurrency(job.hourly_rate)}/hr
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleSignUp(job.id, job.name)}
                      className="bg-[#3AB09E] hover:bg-[#2D9080]"
                      data-testid={`signup-${job.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" /> Sign Up
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No jobs available at the moment</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later for new opportunities</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-4" data-testid="history-jobs-list">
          {pastAssigned.length > 0 ? (
            pastAssigned.map((job) => (
              <Card key={job.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-heading font-semibold">{job.name}</h3>
                      <p className="text-sm text-muted-foreground">{job.client}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {formatDate(job.date)} • {job.start_time} - {job.end_time}
                      </p>
                    </div>
                    <span className={`badge ${job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {job.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No job history yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
