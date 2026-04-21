import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  History, MapPin, Clock, Gauge, AlertCircle, Search,
  X, Bus, Users, RefreshCw, Navigation,
} from "lucide-react";
import { getStudentsTracking, getHistory } from "../../Utility/transportApi";

// Leaflet icon fix
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const startIcon = L.divIcon({
  className: "",
  html: `<div style="background:#16a34a;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(22,163,74,0.5);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});
const endIcon = L.divIcon({
  className: "",
  html: `<div style="background:#dc2626;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(220,38,38,0.5);"></div>`,
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

  return (
    <div className="flex h-full min-h-[600px] bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow"><History className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="font-bold text-gray-900">History</h3>
              <p className="text-xs text-gray-500">GPS journey replay</p>
            </div>
          </div>
        </div>

        {/* Date picker */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Date</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Select Student</p>
          {studentsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((s) => {
                const isAct = selected?.student_id === s.student_id;
                return (
                  <button
                    key={s.student_id}
                    onClick={() => { setSelected(s); setHistoryPoints([]); setHasLoaded(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${isAct ? "bg-blue-600 text-white shadow-lg" : "bg-white border border-gray-100 hover:border-blue-300 hover:shadow-sm"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isAct ? "bg-blue-500" : "bg-blue-100 text-blue-700"}`}>
                        {`${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isAct ? "text-white" : "text-gray-800"}`}>{s.first_name} {s.last_name}</p>
                        <p className={`text-xs truncate ${isAct ? "text-blue-100" : "text-gray-500"}`}>{s.vehicle_number}</p>
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
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
          <div className="m-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded"><X className="w-3.5 h-3.5 text-red-400" /></button>
          </div>
        )}

        {/* Stats bar */}
        {hasLoaded && (
          <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 flex-wrap">
            {[
              { icon: <Navigation className="w-4 h-4 text-blue-600" />, label: "Points", val: historyPoints.length },
              { icon: <Gauge className="w-4 h-4 text-green-600" />, label: "Avg Speed", val: `${avgSpeed} km/h` },
              { icon: <MapPin className="w-4 h-4 text-orange-600" />, label: "Distance", val: `${totalDist.toFixed(2)} km` },
              { icon: <Bus className="w-4 h-4 text-purple-600" />, label: "Vehicle", val: selected?.vehicle_number || "—" },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                {icon}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{val}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          {!selected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-white/80 backdrop-blur-sm">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4"><History className="w-10 h-10 text-blue-400" /></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Select a Student</h3>
              <p className="text-sm text-gray-400">Choose a student and date, then click "Load History".</p>
            </div>
          )}
          {selected && hasLoaded && historyPoints.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-white/80 backdrop-blur-sm">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4"><MapPin className="w-10 h-10 text-orange-400" /></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No Data Found</h3>
              <p className="text-sm text-gray-400">No GPS history for this vehicle on {date}.</p>
            </div>
          )}
          <MapContainer center={[20.5937, 78.9629]} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 0 && <MapFitBounds positions={positions} />}
            {positions.length > 1 && (
              <Polyline positions={positions} color="#3B82F6" weight={4} opacity={0.75} />
            )}
            {positions.length > 0 && (
              <>
                <Marker position={positions[0]} icon={startIcon}>
                  <Popup><p className="font-semibold text-green-700">Start</p><p className="text-xs text-gray-500">{fmtTime(historyPoints[0]?.created_at)}</p></Popup>
                </Marker>
                <Marker position={positions[positions.length - 1]} icon={endIcon}>
                  <Popup><p className="font-semibold text-red-700">End</p><p className="text-xs text-gray-500">{fmtTime(historyPoints[historyPoints.length - 1]?.created_at)}</p></Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        {/* Timeline */}
        {hasLoaded && historyPoints.length > 0 && (
          <div className="bg-white border-t border-gray-200 h-44 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-gray-700">Journey Timeline</p>
              <span className="ml-auto text-xs text-gray-400">{historyPoints.length} GPS points</span>
            </div>
            <div className="divide-y divide-gray-50">
              {historyPoints.map((pt, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-mono text-gray-400 w-20 flex-shrink-0">{fmtTime(pt.created_at)}</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>{parseFloat(pt.latitude).toFixed(5)}, {parseFloat(pt.longitude).toFixed(5)}</span>
                  </div>
                  {pt.speed != null && (
                    <span className="ml-auto text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-green-500" />
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
  );
};

export default TransportHistory;
