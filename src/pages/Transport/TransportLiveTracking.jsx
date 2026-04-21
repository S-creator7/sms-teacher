import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getStudentsTracking, getLiveLocation } from "../../Utility/transportApi";
import toast from "react-hot-toast";

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
          background:${active ? "#2563eb" : "#6b7280"};
          border:3px solid white;
          border-radius:12px;
          width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          box-shadow:0 4px 20px ${active ? "rgba(37,99,235,0.45)" : "rgba(0,0,0,0.2)"};
        ">🚍</div>
        <div style="
          background:${active ? "#1d4ed8" : "#374151"};
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
  if (!s || s === 0) return "#6b7280";
  if (s > 60) return "#dc2626";
  if (s > 40) return "#f59e0b";
  return "#16a34a";
};

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const POLL_INTERVAL = 15000; // 15 s

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT (TEACHER PANEL)
   ═══════════════════════════════════════════════════════════════════ */
const TransportLiveTracking = ({ preSelected }) => {
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
        height: "calc(100vh - 64px)", // Header is 64px
        margin: "0",
        overflow: "hidden",
        width: "100%",
        background: "#fff"
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
          <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <div>
                <h2 style={{ fontSize:"16px", fontWeight:700, color:"#111827", margin:0 }}>
                  Bus Tracking
                </h2>
                <p style={{ fontSize:"11px", color:"#9ca3af", margin:"2px 0 0" }}>
                  {students.length} student{students.length !== 1 ? "s" : ""} in your class
                </p>
              </div>
              {selected && (
                <button onClick={stopTracking} style={{
                  background:"#fee2e2", color:"#dc2626", border:"none",
                  borderRadius:"20px", padding:"5px 14px", fontSize:"12px",
                  fontWeight:600, cursor:"pointer",
                }}>Stop</button>
              )}
            </div>

            {/* Search */}
            <div style={{ position:"relative" }}>
              <svg style={{ position:"absolute",left:"11px",top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or bus..."
                style={{
                  width:"100%", padding:"10px 10px 10px 34px",
                  border:"1px solid #e5e7eb", borderRadius:"10px",
                  background:"#f9fafb", fontSize:"13px", outline:"none",
                  boxSizing:"border-box", color:"#111827",
                }}
              />
            </div>
          </div>

          {/* Student list */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px" }}>
            {filtered.length === 0 && (
              <p style={{ textAlign:"center", color:"#9ca3af", fontSize:"13px", padding:"50px 0" }}>
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
                    padding:"12px 14px",
                    borderRadius:"12px",
                    marginBottom:"6px",
                    cursor:"pointer",
                    transition:"all 0.2s",
                    background: isSelected ? "#eff6ff" : "transparent",
                    border: isSelected ? "1.5px solid #bfdbfe" : "1.5px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background="#f9fafb"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    {/* Avatar/Initial */}
                    <div style={{
                      width:"42px", height:"42px", borderRadius:"12px", flexShrink:0,
                      background: isSelected ? "#dbeafe" : "#f1f5f9",
                      display:"flex", alignItems:"center", justifyContent:"center", 
                      fontSize:"14px", fontWeight:700, color: isSelected ? "#2563eb" : "#475569"
                    }}>
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"14px", color:"#111827", marginBottom:2 }}>
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                         <span style={{ fontSize:"12px", color:"#64748b" }}>
                          Bus: <span style={{ fontWeight:700, color: isSelected ? "#2563eb" : "#1e293b" }}>{s.vehicle_number || "N/A"}</span>
                        </span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"4px" }}>
                        <span style={{
                          position:"relative", display:"inline-flex",
                          width:"8px", height:"8px",
                        }}>
                          {isSelected && hasGPS && (
                            <span style={{
                              position:"absolute", display:"inline-flex",
                              width:"100%", height:"100%", borderRadius:"50%",
                              background:"#10b981", opacity:0.75,
                              animation:"ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                            }}/>
                          )}
                          <span style={{
                            position:"relative", display:"inline-flex",
                            width:"8px", height:"8px", borderRadius:"50%",
                            background: hasGPS ? (isSelected ? "#10b981" : "#6ee7b7") : "#fbbf24",
                          }}/>
                        </span>
                        <span style={{ fontSize:"11px", color: hasGPS ? (isSelected ? "#059669" : "#64748b") : "#f59e0b" }}>
                          {hasGPS ? `Signal Active` : "No GPS assigned"}
                        </span>
                      </div>
                    </div>

                    {/* Status dot */}
                    {isSelected && (
                      <div style={{
                        width:"8px", height:"8px", borderRadius:"50%", flexShrink:0,
                        background: loading ? "#f59e0b" : (liveData ? "#10b981" : "#6b7280"),
                      }}/>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live stats panel */}
          {selected && liveData && (
            <div style={{ borderTop:"1px solid #f1f5f9", padding:"16px", background:"#f8fafc" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                <span style={{ fontSize:"10px", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Bus Stats
                </span>
                {lastUpdated && (
                  <span style={{ fontSize:"10px", color:"#94a3b8" }}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Speed card */}
              <div style={{
                background: "#fff", borderRadius:"12px", padding:"12px 16px",
                border:"1px solid #e2e8f0", marginBottom:"10px",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                boxShadow:"0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <div>
                  <p style={{ fontSize:"10px", color:"#94a3b8", margin:0, fontWeight:600 }}>Current Speed</p>
                  <p style={{ fontSize:"24px", fontWeight:800, color: speedColor(liveData.speed), margin:"2px 0 0" }}>
                    {liveData.speed ?? "0"} <span style={{ fontSize:"12px", fontWeight:500, color:"#94a3b8" }}>km/h</span>
                  </p>
                </div>
                <div style={{ fontSize:"32px" }}>⚡</div>
              </div>

              {/* Stats Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                {[
                  { label:"Ignition", value: liveData.ignition ? "ON" : "OFF", color: liveData.ignition ? "#059669" : "#dc2626" },
                  { label:"Course", value: `${liveData.course || 0}°`, color:"#2563eb" },
                  { label:"Lat", value: liveData.latitude ? Number(liveData.latitude).toFixed(5) : "—", color:"#1e293b" },
                  { label:"Lng", value: liveData.longitude ? Number(liveData.longitude).toFixed(5) : "—", color:"#1e293b" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background:"#fff", borderRadius:"10px", padding:"10px",
                    border:"1px solid #e2e8f0", boxShadow:"0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <p style={{ fontSize:"9px", color:"#94a3b8", margin:0, fontWeight:700, textTransform:"uppercase" }}>{s.label}</p>
                    <p style={{ fontSize:"13px", fontWeight:700, color:s.color, margin:"2px 0 0" }}>{s.value}</p>
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
                    <div style={{ padding:"6px 4px", minWidth:"200px" }}>
                      <div style={{ fontSize:"11px", color:"#94a3b8", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>
                        Student
                      </div>
                      <div style={{ fontWeight:800, fontSize:"16px", color:"#2563eb", marginBottom:"8px" }}>
                        {selected?.first_name} {selected?.last_name}
                      </div>
                      <table style={{ width:"100%", fontSize:"13px", borderCollapse:"collapse" }}>
                        <tbody>
                          {[
                            ["Bus Plate", selected?.vehicle_number],
                            ["Speed", `${liveData.speed ?? "0"} km/h`],
                            ["Ignition", liveData.ignition ? "🟢 Running" : "🔴 Stopped"],
                            ["Last Update", lastUpdated?.toLocaleTimeString() || "—"],
                          ].map(([k, val]) => (
                            <tr key={k}>
                              <td style={{ color:"#64748b", paddingRight:"10px", paddingBottom:"4px" }}>{k}</td>
                              <td style={{ fontWeight:600, color:"#1e293b" }}>{val}</td>
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
              background:"#fff", border:"none", borderRadius:"12px", padding:"12px",
              cursor:"pointer", boxShadow:"0 4px 15px rgba(0,0,0,0.1)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"transform 0.2s active:scale-95",
            }}
          >
            <svg
              style={{ width:18, height:18, color:"#1e293b", animation: loading ? "spin 1s linear infinite" : "none" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          {/* ── LIVE BADGE (top-left) ── */}
          {selected && liveData && (
            <div style={{
              position:"absolute", top:"16px", left:"16px", zIndex:1000,
              background:"#fff", borderRadius:"12px",
              padding:"8px 16px",
              boxShadow:"0 4px 15px rgba(0,0,0,0.08)",
              display:"flex", alignItems:"center", gap:"8px",
              fontSize:"13px", fontWeight:700, color:"#1e293b",
            }}>
              <span style={{
                width:"10px", height:"10px", borderRadius:"50%",
                background:"#10b981",
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
                textAlign:"center", background:"#fff", borderRadius:"24px",
                padding:"40px 60px", boxShadow:"0 10px 40px rgba(0,0,0,0.08)",
              }}>
                <div style={{ fontSize:"60px", marginBottom:"16px" }}>🚌</div>
                <h3 style={{ fontSize:"18px", fontWeight:800, color:"#1e293b", margin:0 }}>
                  Select Student to Track
                </h3>
                <p style={{ fontSize:"14px", color:"#64748b", marginTop:"8px" }}>
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
                  width:"48px", height:"48px",
                  border:"4px solid #f1f5f9", borderTopColor:"#2563eb",
                  borderRadius:"50%", animation:"spin 0.8s linear infinite",
                  margin:"0 auto 16px",
                }}/>
                <p style={{ fontSize:"15px", color:"#64748b", fontWeight:500 }}>Locating vehicle...</p>
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
                textAlign:"center", background:"#fff", borderRadius:"24px",
                padding:"40px 60px", boxShadow:"0 10px 40px rgba(0,0,0,0.12)",
              }}>
                <div style={{ fontSize:"60px", marginBottom:"16px" }}>📡</div>
                <h3 style={{ fontSize:"18px", fontWeight:800, color:"#1e293b", margin:0 }}>
                  No Signal Available
                </h3>
                <p style={{ fontSize:"14px", color:"#64748b", marginTop:"8px" }}>
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
