import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MapPin, QrCode, CheckCircle, Camera, AlertTriangle, Clock, 
  Navigation, Upload, Send, History, XCircle, Image
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StaffPatrol({ userId, userName }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [patrolHistory, setPatrolHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showDefectDialog, setShowDefectDialog] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [checkInData, setCheckInData] = useState({
    answers: [],
    notes: "",
    photos: []
  });

  const [defectData, setDefectData] = useState({
    title: "",
    description: "",
    severity: "medium",
    location: "",
    photos: []
  });

  const fileInputRef = useRef(null);
  const defectFileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    requestLocation();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [checkpointsRes, historyRes] = await Promise.all([
        axios.get(`${API}/checkpoints?active_only=true`),
        axios.get(`${API}/staff/${userId}/patrol-history?limit=20`)
      ]);
      setCheckpoints(checkpointsRes.data);
      setPatrolHistory(historyRes.data);
    } catch (error) {
      console.error("Error fetching patrol data:", error);
      toast.error("Failed to load patrol data");
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError("Unable to get location. Please enable GPS.");
          toast.error("Location access required for patrol check-ins");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported by this browser");
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const handleOpenCheckIn = (checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setCheckInData({
      answers: checkpoint.questions?.map(q => ({ question_id: q.id, question: q.question, answer: "" })) || [],
      notes: "",
      photos: []
    });
    setShowCheckInDialog(true);
    requestLocation(); // Refresh location
  };

  const handlePhotoCapture = async (e, isDefect = false) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPhotos.push(reader.result);
        if (newPhotos.length === files.length) {
          if (isDefect) {
            setDefectData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
          } else {
            setCheckInData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/patrols/check-in?employee_id=${userId}`, {
        checkpoint_id: selectedCheckpoint.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        scanned_qr: false,
        answers: checkInData.answers.filter(a => a.answer),
        notes: checkInData.notes
      });

      // Upload photos if any
      if (checkInData.photos.length > 0) {
        await axios.post(`${API}/patrols/check-in/${response.data.id}/photos`, 
          checkInData.photos
        );
      }

      toast.success(response.data.message || "Check-in recorded!");
      setShowCheckInDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(error.response?.data?.detail || "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportDefect = async () => {
    if (!defectData.title || !defectData.description) {
      toast.error("Please fill in the title and description");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/defects?employee_id=${userId}`, {
        ...defectData,
        site_name: selectedCheckpoint?.site_name || "",
        checkpoint_id: selectedCheckpoint?.id,
        checkpoint_name: selectedCheckpoint?.name,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude
      });

      // Upload photos if any
      if (defectData.photos.length > 0) {
        await axios.post(`${API}/defects/${response.data.id}/photos`, 
          defectData.photos
        );
      }

      toast.success("Defect reported successfully!");
      setShowDefectDialog(false);
      setDefectData({ title: "", description: "", severity: "medium", location: "", photos: [] });
    } catch (error) {
      console.error("Error reporting defect:", error);
      toast.error(error.response?.data?.detail || "Failed to report defect");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">PATROL</p>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Patrol Check-In
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={requestLocation}>
            <Navigation className="w-4 h-4 mr-2" />
            Refresh GPS
          </Button>
          <Button 
            onClick={() => setShowDefectDialog(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Defect
          </Button>
        </div>
      </div>

      {/* Location Status */}
      <Card className={`mb-6 ${locationError ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MapPin className={`w-5 h-5 ${locationError ? 'text-red-600' : 'text-green-600'}`} />
            {locationError ? (
              <div>
                <p className="font-medium text-red-900">Location Unavailable</p>
                <p className="text-sm text-red-700">{locationError}</p>
              </div>
            ) : currentLocation ? (
              <div>
                <p className="font-medium text-green-900">Location Active</p>
                <p className="text-sm text-green-700">
                  GPS Accuracy: ±{Math.round(currentLocation.accuracy)}m
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Getting location...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checkpoints Grid */}
      <div className="mb-8">
        <h2 className="font-semibold text-lg mb-4">Checkpoints ({checkpoints.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checkpoints.map((checkpoint) => {
            const distance = currentLocation 
              ? calculateDistance(
                  currentLocation.latitude, currentLocation.longitude,
                  checkpoint.latitude, checkpoint.longitude
                )
              : null;
            const isNearby = distance !== null && distance <= checkpoint.radius_meters;

            return (
              <Card 
                key={checkpoint.id} 
                className={`card-hover cursor-pointer ${isNearby ? 'border-green-300' : ''}`}
                onClick={() => handleOpenCheckIn(checkpoint)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{checkpoint.name}</h3>
                      <p className="text-sm text-muted-foreground">{checkpoint.site_name || "No site"}</p>
                    </div>
                    {isNearby && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Nearby
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {distance !== null ? `${distance}m away` : "Calculating..."}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Every {checkpoint.check_frequency_minutes}min
                    </div>
                  </div>

                  {checkpoint.questions?.length > 0 && (
                    <Badge variant="outline" className="mt-2">
                      {checkpoint.questions.length} question(s)
                    </Badge>
                  )}

                  {checkpoint.last_checked_by_me && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last checked: {formatTime(checkpoint.last_checked_by_me)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            My Recent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patrolHistory.length > 0 ? (
            <div className="space-y-3">
              {patrolHistory.map((patrol) => (
                <div key={patrol.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{patrol.checkpoint_name}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(patrol.checked_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {patrol.location_verified ? (
                      <Badge className="bg-green-100 text-green-700">Verified</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">Unverified</Badge>
                    )}
                    {patrol.photos?.length > 0 && (
                      <Badge variant="outline">
                        <Image className="w-3 h-3 mr-1" />
                        {patrol.photos.length}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">No check-ins yet today</p>
          )}
        </CardContent>
      </Card>

      {/* Check-In Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check In: {selectedCheckpoint?.name}</DialogTitle>
            <DialogDescription>
              {selectedCheckpoint?.site_name || "Complete your patrol check-in"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Location Status */}
            <div className={`p-3 rounded-lg ${
              currentLocation && calculateDistance(
                currentLocation.latitude, currentLocation.longitude,
                selectedCheckpoint?.latitude, selectedCheckpoint?.longitude
              ) <= (selectedCheckpoint?.radius_meters || 50)
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">
                  {currentLocation ? (
                    `${calculateDistance(
                      currentLocation.latitude, currentLocation.longitude,
                      selectedCheckpoint?.latitude, selectedCheckpoint?.longitude
                    )}m from checkpoint`
                  ) : "Getting location..."}
                </span>
              </div>
            </div>

            {/* Questions */}
            {checkInData.answers.map((answer, index) => (
              <div key={index}>
                <Label>{answer.question}</Label>
                <Input
                  value={answer.answer}
                  onChange={(e) => {
                    const updated = [...checkInData.answers];
                    updated[index].answer = e.target.value;
                    setCheckInData({ ...checkInData, answers: updated });
                  }}
                  placeholder="Your answer..."
                  className="mt-1"
                />
              </div>
            ))}

            {/* Notes */}
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={checkInData.notes}
                onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                placeholder="Any observations or notes..."
                rows={2}
              />
            </div>

            {/* Photos */}
            <div>
              <Label>Photos (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handlePhotoCapture(e, false)}
                  className="hidden"
                />
              </div>
              {checkInData.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {checkInData.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckIn}
              disabled={submitting || !currentLocation}
              className="bg-[#0F64A8] hover:bg-[#0D5590]"
            >
              {submitting ? "Checking in..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Defect Dialog */}
      <Dialog open={showDefectDialog} onOpenChange={setShowDefectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Defect / Incident</DialogTitle>
            <DialogDescription>
              Document any issues or incidents found during patrol
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={defectData.title}
                onChange={(e) => setDefectData({ ...defectData, title: e.target.value })}
                placeholder="e.g., Broken window, Water leak"
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={defectData.description}
                onChange={(e) => setDefectData({ ...defectData, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={3}
              />
            </div>

            <div>
              <Label>Severity</Label>
              <Select
                value={defectData.severity}
                onValueChange={(v) => setDefectData({ ...defectData, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🔵 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={defectData.location}
                onChange={(e) => setDefectData({ ...defectData, location: e.target.value })}
                placeholder="e.g., Near entrance, Floor 2"
              />
            </div>

            {/* Photos */}
            <div>
              <Label>Photos</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => defectFileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
                <input
                  ref={defectFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handlePhotoCapture(e, true)}
                  className="hidden"
                />
              </div>
              {defectData.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {defectData.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDefectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReportDefect}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
