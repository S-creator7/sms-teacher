import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  History, MapPin, Clock, Gauge, AlertCircle, Search,
  X, Bus, Users, RefreshCw, Navigation, User,
} from "lucide-react";
import { getStudentsTracking, getHistory } from "../../Utility/transportApi";
import { useNavigate } from "react-router-dom";

// Leaflet icon fix
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const startIcon = L.divIcon({
  className: "",
  html: `<div style="background:#22c55e;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(34,197,94,0.5);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});
const endIcon = L.divIcon({
  className: "",
  html: `<div style="background:#ef4444;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(239,68,68,0.5);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

function MapFitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.8 });
    }
  }, [positions, map]);
  return null;
}

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A";

const today = () => new Date().toISOString().split("T")[0];

const TransportHistory = ({ preSelected }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(today());
  const [historyPoints, setHistoryPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await getStudentsTracking();
      const data = res?.resources?.data || res?.data || [];
      setStudents(data);
      if (preSelected) setSelected(data.find((s) => s.imei === preSelected.imei) || preSelected);
    } catch (err) {
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
  }, [preSelected]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const fetchHistory = useCallback(async () => {
    if (!selected?.imei || !date) return;
    setLoading(true);
    setError(null);
    setHasLoaded(false);
    try {
      const res = await getHistory(selected.imei, date);
      const data = res?.resources?.data || res?.data || [];
      setHistoryPoints(data);
      setHasLoaded(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch history.");
    } finally {
      setLoading(false);
    }
  }, [selected, date]);

  const gpsStudents = students.filter((s) => s.imei);
  const filteredStudents = gpsStudents.filter((s) => {
    const q = search.toLowerCase();
    return !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.vehicle_number?.toLowerCase().includes(q);
  });

  const positions = historyPoints
    .filter((p) => p.latitude && p.longitude)
    .map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)]);

  const totalDist = historyPoints.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    const prev = historyPoints[i - 1];
    const R = 6371;
    const dLat = ((pt.latitude - prev.latitude) * Math.PI) / 180;
    const dLon = ((pt.longitude - prev.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev.latitude * Math.PI) / 180) * Math.cos((pt.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);

  const avgSpeed = historyPoints.length
    ? (historyPoints.reduce((a, p) => a + (p.speed || 0), 0) / historyPoints.length).toFixed(1)
    : "0";

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-[#F8FAFC]">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 group"
          title="Go Back"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#f86730]/10 rounded-lg">
            <History className="w-4 h-4 text-[#f86730]" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Transport History</h2>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#f86730] rounded-lg shadow-sm">
                <History className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-800">History</h3>
                <p className="text-xs text-gray-500">GPS journey replay</p>
              </div>
            </div>
          </div>

          {/* Date picker */}
          <div className="p-4 border-b border-gray-100">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f86730]/20 focus:border-[#f86730] transition bg-white"
            />
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f86730]/20 focus:border-[#f86730] transition bg-white"
              />
            </div>
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Select Student</p>
            {studentsLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No students found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredStudents.map((s) => {
                  const isAct = selected?.student_id === s.student_id;
                  return (
                    <button
                      key={s.student_id}
                      onClick={() => { setSelected(s); setHistoryPoints([]); setHasLoaded(false); }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isAct 
                          ? "bg-[#f86730] text-white shadow-sm" 
                          : "bg-white border border-gray-100 hover:border-[#f86730]/30 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isAct ? "bg-[#f86730]/30 text-white" : "bg-[#f86730]/10 text-[#f86730]"
                        }`}>
                          {`${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isAct ? "text-white" : "text-gray-800"}`}>
                            {s.first_name} {s.last_name}
                          </p>
                          <p className={`text-xs truncate ${isAct ? "text-[#f86730]/80" : "text-gray-500"}`}>
                            {s.vehicle_number}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Load button */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={fetchHistory}
              disabled={!selected || !date || loading}
              className="w-full py-2 px-4 bg-[#f86730] hover:bg-[#e55a29] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {loading ? "Loading..." : "Load History"}
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Error */}
          {error && (
            <div className="m-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          )}

          {/* Stats bar */}
          {hasLoaded && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm flex-shrink-0 flex-wrap">
              {[
                { icon: <Navigation className="w-3.5 h-3.5 text-[#f86730]" />, label: "Points", val: historyPoints.length },
                { icon: <Gauge className="w-3.5 h-3.5 text-[#f86730]" />, label: "Avg Speed", val: `${avgSpeed} km/h` },
                { icon: <MapPin className="w-3.5 h-3.5 text-[#f86730]" />, label: "Distance", val: `${totalDist.toFixed(2)} km` },
                { icon: <Bus className="w-3.5 h-3.5 text-[#f86730]" />, label: "Vehicle", val: selected?.vehicle_number || "—" },
              ].map(({ icon, label, val }) => (
                <div key={label} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  {icon}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{val}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map */}
          <div className="flex-1 relative">
            {!selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-white/80 backdrop-blur-sm">
                <div className="w-16 h-16 bg-[#f86730]/10 rounded-full flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-[#f86730]/60" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Select a Student</h3>
                <p className="text-xs text-gray-400">Choose a student and date, then click "Load History".</p>
              </div>
            )}
            {selected && hasLoaded && historyPoints.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-white/80 backdrop-blur-sm">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No Data Found</h3>
                <p className="text-xs text-gray-400">No GPS history for this vehicle on {date}.</p>
              </div>
            )}
            <MapContainer center={[20.5937, 78.9629]} zoom={12} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positions.length > 0 && <MapFitBounds positions={positions} />}
              {positions.length > 1 && (
                <Polyline positions={positions} color="#f86730" weight={3} opacity={0.8} />
              )}
              {positions.length > 0 && (
                <>
                  <Marker position={positions[0]} icon={startIcon}>
                    <Popup>
                      <p className="font-semibold text-green-700 text-sm">Start</p>
                      <p className="text-xs text-gray-500">{fmtTime(historyPoints[0]?.created_at)}</p>
                    </Popup>
                  </Marker>
                  <Marker position={positions[positions.length - 1]} icon={endIcon}>
                    <Popup>
                      <p className="font-semibold text-red-700 text-sm">End</p>
                      <p className="text-xs text-gray-500">{fmtTime(historyPoints[historyPoints.length - 1]?.created_at)}</p>
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>

          {/* Timeline */}
          {hasLoaded && historyPoints.length > 0 && (
            <div className="bg-white border-t border-gray-100 h-40 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
                <Clock className="w-4 h-4 text-[#f86730]" />
                <p className="text-sm font-semibold text-gray-700">Journey Timeline</p>
                <span className="ml-auto text-xs text-gray-400">{historyPoints.length} GPS points</span>
              </div>
              <div className="divide-y divide-gray-50">
                {historyPoints.map((pt, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-1.5 hover:bg-gray-50/80 transition-colors">
                    <span className="text-xs font-mono text-gray-400 w-20 flex-shrink-0">{fmtTime(pt.created_at)}</span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPin className="w-3 h-3 text-[#f86730]/60" />
                      <span>{parseFloat(pt.latitude).toFixed(5)}, {parseFloat(pt.longitude).toFixed(5)}</span>
                    </div>
                    {pt.speed != null && (
                      <span className="ml-auto text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-[#f86730]" />
                        {pt.speed} km/h
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransportHistory;