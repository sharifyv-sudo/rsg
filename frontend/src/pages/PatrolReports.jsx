import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Users, 
  TrendingUp, Calendar, RefreshCw, QrCode
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PatrolReports() {
  const [patrols, setPatrols] = useState([]);
  const [stats, setStats] = useState(null);
  const [missedCheckpoints, setMissedCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSite, setSelectedSite] = useState("all");
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedSite]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let patrolUrl = `${API}/patrols?limit=200&date=${selectedDate}`;
      let statsUrl = `${API}/patrols/stats?date=${selectedDate}`;
      let missedUrl = `${API}/patrols/missed-checkpoints`;
      
      if (selectedSite !== "all") {
        patrolUrl += `&site_id=${selectedSite}`;
        statsUrl += `&site_id=${selectedSite}`;
        missedUrl += `?site_id=${selectedSite}`;
      }

      const [patrolsRes, statsRes, missedRes, checkpointsRes] = await Promise.all([
        axios.get(patrolUrl),
        axios.get(statsUrl),
        axios.get(missedUrl),
        axios.get(`${API}/checkpoints?active_only=true`)
      ]);

      setPatrols(patrolsRes.data);
      setStats(statsRes.data);
      setMissedCheckpoints(missedRes.data);
      
      // Extract unique sites from checkpoints
      const uniqueSites = [...new Set(checkpointsRes.data.map(c => c.site_name).filter(Boolean))];
      setSites(uniqueSites);
    } catch (error) {
      console.error("Error fetching patrol data:", error);
      toast.error("Failed to load patrol data");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-md"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">PATROL MANAGEMENT</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Patrol Reports
          </h1>
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site} value={site}>{site}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">TOTAL CHECK-INS</p>
                <p className="stat-value">{stats?.total_checkins || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">VERIFIED</p>
                <p className="stat-value text-green-600">{stats?.verified_checkins || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.verification_rate || 0}% verification rate
                </p>
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
                <p className="stat-label mb-2">COVERAGE</p>
                <p className="stat-value">{stats?.checkpoints_visited || 0}/{stats?.total_checkpoints || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.coverage_rate || 0}% checkpoints visited
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label mb-2">ACTIVE OFFICERS</p>
                <p className="stat-value">{stats?.active_officers || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missed Checkpoints Alert */}
      {missedCheckpoints.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-900 flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              Missed Checkpoints ({missedCheckpoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {missedCheckpoints.slice(0, 6).map((cp) => (
                <div key={cp.id} className="p-3 bg-white rounded-lg border border-amber-200">
                  <p className="font-medium text-sm">{cp.name}</p>
                  <p className="text-xs text-muted-foreground">{cp.site_name || "No site"}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {cp.never_checked ? (
                      <span className="text-amber-700">Never checked</span>
                    ) : (
                      <span className="text-amber-700">
                        {cp.minutes_overdue} min overdue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {missedCheckpoints.length > 6 && (
              <p className="text-sm text-amber-700 mt-3">
                +{missedCheckpoints.length - 6} more missed checkpoints
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patrol Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold">
            Patrol Log - {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {patrols.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Checkpoint</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Answers</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patrols.map((patrol) => (
                  <TableRow key={patrol.id}>
                    <TableCell className="font-mono text-sm">
                      {formatTime(patrol.checked_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{patrol.checkpoint_name}</p>
                        {patrol.job_name && (
                          <p className="text-xs text-muted-foreground">{patrol.job_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{patrol.employee_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {patrol.location_verified ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                        {patrol.scanned_qr && (
                          <Badge variant="outline" className="text-xs">
                            <QrCode className="w-3 h-3 mr-1" />
                            QR
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm ${
                        patrol.distance_from_checkpoint > 50 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {patrol.distance_from_checkpoint}m
                      </span>
                    </TableCell>
                    <TableCell>
                      {patrol.answers?.length > 0 ? (
                        <Badge variant="outline">{patrol.answers.length} answer(s)</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <p className="text-sm truncate">{patrol.notes || "-"}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No patrol check-ins for this date</p>
              <p className="text-sm text-muted-foreground">
                Select a different date or check if patrols are active
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
