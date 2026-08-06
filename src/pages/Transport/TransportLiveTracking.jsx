import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getStudentsTracking, getLiveLocation } from "../../Utility/transportApi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/* ── Fix Leaflet default broken icon (Vite / webpack build issue) ── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── Custom animated bus marker ──────────────────────────────────── */
const createBusIcon = (label = "", active = true) =>
  L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="
          background:${active ? "#f86730" : "#94a3b8"};
          border:3px solid white;
          border-radius:12px;
          width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          box-shadow:0 4px 20px ${active ? "rgba(248,103,48,0.45)" : "rgba(0,0,0,0.2)"};
        ">🚍</div>
        <div style="
          background:${active ? "#f86730" : "#64748b"};
          color:white;
          font-size:9px;font-weight:700;
          padding:2px 6px;border-radius:4px;
          white-space:nowrap;max-width:80px;
          overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);
        ">${label}</div>
      </div>`,
    iconSize: [44, 66],
    iconAnchor: [22, 22],
    popupAnchor: [0, -30],
  });

/* ── Map controller: smoothly flies to new position ──────────────── */
function MapFlyTo({ position }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!position) return;
    const [lat, lng] = position;
    if (prev.current && prev.current[0] === lat && prev.current[1] === lng) return;
    prev.current = position;
    map.flyTo(position, 16, { animate: true, duration: 1.2 });
  }, [position, map]);
  return null;
}

/* ── Speed colour helper ──────────────────────────────────────────── */
const speedColor = (s) => {
  if (!s || s === 0) return "#94a3b8";
  if (s > 60) return "#ef4444";
  if (s > 40) return "#f59e0b";
  return "#22c55e";
};

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const POLL_INTERVAL = 15000; // 15 s

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT (TEACHER PANEL)
   ═══════════════════════════════════════════════════════════════════ */
const TransportLiveTracking = ({ preSelected }) => {
  const navigate = useNavigate();
  const [students, setStudents]     = useState([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);   // full student obj
  const [liveData, setLiveData]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  /* Load students with tracking info once */
  useEffect(() => {
    getStudentsTracking()
      .then((res) => { 
        const data = res?.resources?.data || [];
        setStudents(data);
        if (preSelected) {
          const found = data.find(s => s.imei === preSelected.imei);
          if (found) startTracking(found);
        }
      })
      .catch(() => toast.error("Failed to load tracking data"));
    return () => clearInterval(intervalRef.current);
  }, []);

  /* Fetch live location for IMEI */
  const fetchLocation = useCallback(async (imei) => {
    if (!imei) return;
    try {
      setLoading(true);
      const res = await getLiveLocation(imei);
      if (res?.status) {
        setLiveData(res.resources?.data || null);
        setLastUpdated(new Date());
      } else {
        setLiveData(null);
      }
    } catch {
      setLiveData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Start tracking a student's bus */
  const startTracking = (s) => {
    if (!s.imei) { toast.error("No GPS device assigned to this route"); return; }
    clearInterval(intervalRef.current);
    setSelected(s);
    setLiveData(null);
    fetchLocation(s.imei);
    intervalRef.current = setInterval(() => fetchLocation(s.imei), POLL_INTERVAL);
  };

  /* Stop tracking */
  const stopTracking = () => {
    clearInterval(intervalRef.current);
    setSelected(null);
    setLiveData(null);
  };

  const filtered = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.imei?.includes(search)
  );

  const markerPos =
    liveData?.latitude && liveData?.longitude
      ? [Number(liveData.latitude), Number(liveData.longitude)]
      : null;

  const handleBack = () => {
    navigate(-1);
  };

  /* ── RENDER ───────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes breathe { 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }
        @keyframes ping    { 75%,100%{ transform:scale(2); opacity:0; } }
        .leaflet-container { font-family: inherit; z-index: 1; }
      `}</style>

      <div style={{
        display: "flex",
        height: "calc(100vh - 64px)",
        margin: "0",
        overflow: "hidden",
        width: "100%",
        background: "#f8fafc"
      }}>

        {/* ══════════════ SIDEBAR ══════════════ */}
        <div style={{
          width:"320px", minWidth:"320px",
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          zIndex: 10,
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        }}>

          {/* Sidebar top */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200"
                  title="Go Back"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h2 style={{ fontSize:"15px", fontWeight:700, color:"#0f172a", margin:0 }}>
                    Bus Tracking
                  </h2>
                  <p style={{ fontSize:"11px", color:"#94a3b8", margin:"2px 0 0" }}>
                    {students.length} student{students.length !== 1 ? "s" : ""} in your class
                  </p>
                </div>
              </div>
              {selected && (
                <button onClick={stopTracking} style={{
                  background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca",
                  borderRadius:"8px", padding:"4px 12px", fontSize:"11px",
                  fontWeight:600, cursor:"pointer", transition:"all 0.2s",
                }}>
                  Stop
                </button>
              )}
            </div>

            {/* Search */}
            <div style={{ position:"relative" }}>
              <svg style={{ position:"absolute",left:"11px",top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#94a3b8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or bus..."
                style={{
                  width:"100%", padding:"8px 10px 8px 34px",
                  border:"1px solid #e2e8f0", borderRadius:"8px",
                  background:"#f8fafc", fontSize:"13px", outline:"none",
                  boxSizing:"border-box", color:"#0f172a",
                  transition:"border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#f86730"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* Student list */}
          <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
            {filtered.length === 0 && (
              <p style={{ textAlign:"center", color:"#94a3b8", fontSize:"13px", padding:"50px 0" }}>
                No tracking data found
              </p>
            )}
            {filtered.map((s) => {
              const isSelected = selected?.student_id === s.student_id;
              const hasGPS     = !!s.imei;
              return (
                <div
                  key={s.student_id}
                  onClick={() => isSelected ? stopTracking() : startTracking(s)}
                  style={{
                    padding:"10px 12px",
                    borderRadius:"8px",
                    marginBottom:"4px",
                    cursor:"pointer",
                    transition:"all 0.15s",
                    background: isSelected ? "#fef3f2" : "transparent",
                    border: isSelected ? "1.5px solid #f86730" : "1.5px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background="#f8fafc"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    {/* Avatar/Initial */}
                    <div style={{
                      width:"38px", height:"38px", borderRadius:"8px", flexShrink:0,
                      background: isSelected ? "#f86730" : "#f1f5f9",
                      display:"flex", alignItems:"center", justifyContent:"center", 
                      fontSize:"13px", fontWeight:700, color: isSelected ? "#fff" : "#475569"
                    }}>
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"13px", color:"#0f172a", marginBottom:1 }}>
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                         <span style={{ fontSize:"11px", color:"#64748b" }}>
                          Bus: <span style={{ fontWeight:600, color: isSelected ? "#f86730" : "#1e293b" }}>{s.vehicle_number || "N/A"}</span>
                        </span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"3px" }}>
                        <span style={{
                          position:"relative", display:"inline-flex",
                          width:"7px", height:"7px",
                        }}>
                          {isSelected && hasGPS && (
                            <span style={{
                              position:"absolute", display:"inline-flex",
                              width:"100%", height:"100%", borderRadius:"50%",
                              background:"#22c55e", opacity:0.75,
                              animation:"ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                            }}/>
                          )}
                          <span style={{
                            position:"relative", display:"inline-flex",
                            width:"7px", height:"7px", borderRadius:"50%",
                            background: hasGPS ? (isSelected ? "#22c55e" : "#86efac") : "#fbbf24",
                          }}/>
                        </span>
                        <span style={{ fontSize:"10px", color: hasGPS ? (isSelected ? "#059669" : "#64748b") : "#f59e0b" }}>
                          {hasGPS ? `Active` : "No GPS"}
                        </span>
                      </div>
                    </div>

                    {/* Status dot */}
                    {isSelected && (
                      <div style={{
                        width:"7px", height:"7px", borderRadius:"50%", flexShrink:0,
                        background: loading ? "#f59e0b" : (liveData ? "#22c55e" : "#94a3b8"),
                      }}/>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live stats panel */}
          {selected && liveData && (
            <div style={{ borderTop:"1px solid #f1f5f9", padding:"14px", background:"#fafafa" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                <span style={{ fontSize:"9px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Bus Stats
                </span>
                {lastUpdated && (
                  <span style={{ fontSize:"9px", color:"#94a3b8" }}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Speed card */}
              <div style={{
                background: "#fff", borderRadius:"8px", padding:"10px 14px",
                border:"1px solid #e2e8f0", marginBottom:"8px",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                boxShadow:"0 1px 2px rgba(0,0,0,0.04)"
              }}>
                <div>
                  <p style={{ fontSize:"9px", color:"#94a3b8", margin:0, fontWeight:600 }}>Current Speed</p>
                  <p style={{ fontSize:"20px", fontWeight:800, color: speedColor(liveData.speed), margin:"1px 0 0" }}>
                    {liveData.speed ?? "0"} <span style={{ fontSize:"11px", fontWeight:500, color:"#94a3b8" }}>km/h</span>
                  </p>
                </div>
                <div style={{ fontSize:"28px" }}>⚡</div>
              </div>

              {/* Stats Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
                {[
                  { label:"Ignition", value: liveData.ignition ? "ON" : "OFF", color: liveData.ignition ? "#22c55e" : "#ef4444" },
                  { label:"Course", value: `${liveData.course || 0}°`, color:"#f86730" },
                  { label:"Lat", value: liveData.latitude ? Number(liveData.latitude).toFixed(5) : "—", color:"#0f172a" },
                  { label:"Lng", value: liveData.longitude ? Number(liveData.longitude).toFixed(5) : "—", color:"#0f172a" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background:"#fff", borderRadius:"8px", padding:"8px 10px",
                    border:"1px solid #e2e8f0", boxShadow:"0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <p style={{ fontSize:"8px", color:"#94a3b8", margin:0, fontWeight:700, textTransform:"uppercase" }}>{s.label}</p>
                    <p style={{ fontSize:"12px", fontWeight:700, color:s.color, margin:"1px 0 0" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════ MAP AREA ══════════════ */}
        <div style={{ flex:1, position:"relative", background:"#f1f5f9" }}>

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width:"100%", height:"100%" }}
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />

            {markerPos && (
              <>
                <MapFlyTo position={markerPos} />
                <Marker
                  position={markerPos}
                  icon={createBusIcon(selected?.vehicle_number, true)}
                >
                  <Popup maxWidth={240}>
                    <div style={{ padding:"4px 2px", minWidth:"180px" }}>
                      <div style={{ fontSize:"10px", color:"#94a3b8", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>
                        Student
                      </div>
                      <div style={{ fontWeight:800, fontSize:"15px", color:"#f86730", marginBottom:"6px" }}>
                        {selected?.first_name} {selected?.last_name}
                      </div>
                      <table style={{ width:"100%", fontSize:"12px", borderCollapse:"collapse" }}>
                        <tbody>
                          {[
                            ["Bus Plate", selected?.vehicle_number],
                            ["Speed", `${liveData.speed ?? "0"} km/h`],
                            ["Ignition", liveData.ignition ? "🟢 Running" : "🔴 Stopped"],
                            ["Last Update", lastUpdated?.toLocaleTimeString() || "—"],
                          ].map(([k, val]) => (
                            <tr key={k}>
                              <td style={{ color:"#64748b", paddingRight:"8px", paddingBottom:"3px" }}>{k}</td>
                              <td style={{ fontWeight:600, color:"#0f172a" }}>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
          </MapContainer>

          {/* ── REFRESH BUTTON ── */}
          <button
            onClick={() => selected && fetchLocation(selected.imei)}
            disabled={loading}
            style={{
              position:"absolute", top:"16px", right:"16px", zIndex:1000,
              background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px",
              cursor:"pointer", boxShadow:"0 4px 12px rgba(0,0,0,0.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f86730"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            <svg
              style={{ width:16, height:16, color:"#0f172a", animation: loading ? "spin 1s linear infinite" : "none" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          {/* ── LIVE BADGE (top-left) ── */}
          {selected && liveData && (
            <div style={{
              position:"absolute", top:"16px", left:"16px", zIndex:1000,
              background:"#fff", borderRadius:"8px",
              padding:"6px 14px",
              boxShadow:"0 4px 12px rgba(0,0,0,0.08)",
              display:"flex", alignItems:"center", gap:"6px",
              fontSize:"12px", fontWeight:700, color:"#0f172a",
              border:"1px solid #e2e8f0",
            }}>
              <span style={{
                width:"8px", height:"8px", borderRadius:"50%",
                background:"#22c55e",
                animation:"breathe 1.5s ease-in-out infinite",
                display:"inline-block",
              }}/>
              LIVE · {selected.first_name}'s Bus
            </div>
          )}

          {/* ── EMPTY STATE OVERLAY ── */}
          {!selected && (
            <div style={{
              position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:"rgba(248,250,252,0.6)", zIndex:500, pointerEvents:"none",
            }}>
              <div style={{
                textAlign:"center", background:"#fff", borderRadius:"16px",
                padding:"32px 48px", boxShadow:"0 10px 40px rgba(0,0,0,0.08)",
              }}>
                <div style={{ fontSize:"48px", marginBottom:"12px" }}>🚌</div>
                <h3 style={{ fontSize:"16px", fontWeight:700, color:"#0f172a", margin:0 }}>
                  Select Student to Track
                </h3>
                <p style={{ fontSize:"13px", color:"#64748b", marginTop:"6px" }}>
                  Real-time GPS tracking for student transport
                </p>
              </div>
            </div>
          )}

          {/* ── LOADING OVERLAY ── */}
          {selected && loading && !liveData && (
            <div style={{
              position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:"rgba(255,255,255,0.7)", zIndex:500, pointerEvents:"none",
            }}>
              <div style={{ textAlign:"center" }}>
                <div style={{
                  width:"40px", height:"40px",
                  border:"4px solid #f1f5f9", borderTopColor:"#f86730",
                  borderRadius:"50%", animation:"spin 0.8s linear infinite",
                  margin:"0 auto 12px",
                }}/>
                <p style={{ fontSize:"13px", color:"#64748b", fontWeight:500 }}>Locating vehicle...</p>
              </div>
            </div>
          )}

          {/* ── NO SIGNAL OVERLAY ── */}
          {selected && !loading && !liveData && (
            <div style={{
              position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:"rgba(255,255,255,0.75)", zIndex:500, pointerEvents:"none",
            }}>
              <div style={{
                textAlign:"center", background:"#fff", borderRadius:"16px",
                padding:"32px 48px", boxShadow:"0 10px 40px rgba(0,0,0,0.12)",
              }}>
                <div style={{ fontSize:"48px", marginBottom:"12px" }}>📡</div>
                <h3 style={{ fontSize:"16px", fontWeight:700, color:"#0f172a", margin:0 }}>
                  No Signal Available
                </h3>
                <p style={{ fontSize:"13px", color:"#64748b", marginTop:"6px" }}>
                  Waiting for data from {selected.vehicle_number}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TransportLiveTracking;