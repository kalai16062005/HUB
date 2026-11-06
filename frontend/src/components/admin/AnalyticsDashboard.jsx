import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, Globe, Clock, TrendingUp, BarChart2,
  RefreshCw, Award, Zap, Calendar, X, Eye, Timer,
  UsersRound, UserCircle, ShieldCheck, ShieldOff,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (s) => {
  if (!s || s < 1) return '< 1s';
  if (s < 60)   return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

// ── Mini bar chart ────────────────────────────────────────────────────────────
const MiniBarChart = ({ data, valueKey = 'views', color = 'var(--primary)', height = 80 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ width:'100%', height, display:'flex', alignItems:'flex-end', gap:2, padding:'0 2px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
          height:'100%', justifyContent:'flex-end' }} title={`${d.label}: ${d[valueKey]}`}>
          <div style={{ width:'100%', borderRadius:'3px 3px 0 0',
            height:`${Math.max((d[valueKey]/max)*100, 2)}%`,
            backgroundColor:color, opacity:d[valueKey]>0?0.85:0.15,
            transition:'height 0.4s ease' }}/>
        </div>
      ))}
    </div>
  );
};

// ── Hourly heatmap ────────────────────────────────────────────────────────────
const HourlyHeatmap = ({ data }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.views), 1);
  return (
    <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
      {data.map(h => {
        const intensity = h.views / max;
        return (
          <div key={h.hour} title={`${h.label} — ${h.views} views`}
            style={{ width:28, height:28, borderRadius:5, cursor:'default',
              backgroundColor: intensity>0 ? `rgba(37,99,235,${0.1+intensity*0.85})` : 'var(--card-bg)',
              border:'1px solid var(--border-color)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.55rem', color:intensity>0.5?'white':'var(--text-main)',
              fontWeight:600, opacity:intensity===0?0.4:1, transition:'background 0.2s' }}>
            {h.hour}
          </div>
        );
      })}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, bg, border, sub }) => (
  <div style={{ padding:'18px 20px', borderRadius:14, flex:1, minWidth:130,
    backgroundColor:bg, border:`1px solid ${border}` }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
      <div style={{ width:34, height:34, borderRadius:9, backgroundColor:`${color}18`,
        border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {React.cloneElement(icon, { size:16, color })}
      </div>
      <span style={{ fontSize:'0.7rem', fontWeight:700, color, opacity:0.8,
        textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
    </div>
    <div style={{ fontSize:'1.7rem', fontWeight:800, color, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:'0.7rem', color, opacity:0.55, marginTop:5 }}>{sub}</div>}
  </div>
);

// ── Period Selector ───────────────────────────────────────────────────────────
const PeriodBtn = ({ value, current, onChange, label }) => (
  <button onClick={() => onChange(value)}
    style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.75rem', fontWeight:600,
      cursor:'pointer', border:'none', transition:'all 0.15s',
      backgroundColor: current===value ? 'var(--primary)' : 'var(--card-bg)',
      color:           current===value ? 'white' : 'var(--text-main)',
      opacity:         current===value ? 1 : 0.65 }}>
    {label}
  </button>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
    {React.cloneElement(icon, { size:15, color:'var(--primary)' })}
    <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
      letterSpacing:'0.08em', color:'var(--text-main)', opacity:0.5 }}>{title}</span>
    {count!=null && (
      <span style={{ fontSize:'0.66rem', fontWeight:600, padding:'1px 7px', borderRadius:20,
        backgroundColor:'var(--card-bg)', color:'var(--text-main)', opacity:0.5,
        border:'1px solid var(--border-color)' }}>{count}</span>
    )}
    <div style={{ flex:1, height:1, backgroundColor:'var(--border-color)', marginLeft:4 }}/>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const AnalyticsDashboard = ({ isOpen, onClose }) => {
  const { user, trackingConsent } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [period, setPeriod]     = useState('week');
  const [tab, setTab]           = useState(isAdmin ? 'overview' : 'mine');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin data
  const [summary,    setSummary]    = useState(null);
  const [topUrls,    setTopUrls]    = useState([]);
  const [userUsage,  setUserUsage]  = useState([]);
  const [teamUsage,  setTeamUsage]  = useState([]);
  const [trends,     setTrends]     = useState([]);
  const [hourly,     setHourly]     = useState([]);
  // My stats (normal user)
  const [myStats,    setMyStats]    = useState(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      if (isAdmin) {
        const [s, u, uu, tu, t, h] = await Promise.all([
          axios.get(`${API}/api/analytics/summary`),
          axios.get(`${API}/api/analytics/top-urls?period=${period}&limit=10`),
          axios.get(`${API}/api/analytics/user-usage?period=${period}`),
          axios.get(`${API}/api/analytics/team-usage?period=${period}`),
          axios.get(`${API}/api/analytics/trends?period=${period}`),
          axios.get(`${API}/api/analytics/hourly?period=${period}`),
        ]);
        setSummary(s.data);
        setTopUrls(u.data);
        setUserUsage(uu.data);
        setTeamUsage(tu.data);
        setTrends(t.data);
        setHourly(h.data);
      } else {
        // Normal user — only own stats
        const { data } = await axios.get(`${API}/api/analytics/my-stats?period=${period}`);
        setMyStats(data);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, isAdmin]);

  useEffect(() => { if (isOpen) fetchAll(); }, [isOpen, fetchAll]);

  if (!isOpen) return null;

  const maxViews     = Math.max(...topUrls.map(u => u.views), 1);
  const maxTeamViews = Math.max(...teamUsage.map(t => t.views), 1);

  // Tabs config
  const adminTabs = [
    ['overview', <Activity    size={13}/>, 'Overview'],
    ['urls',     <Globe       size={13}/>, 'Top URLs'],
    ['users',    <Users       size={13}/>, 'Users'],
    ['teams',    <UsersRound  size={13}/>, 'Teams'],
    ['heatmap',  <Calendar    size={13}/>, 'Heatmap'],
  ];
  const userTabs = [
    ['mine', <UserCircle size={13}/>, 'My Stats'],
  ];
  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100,
      backgroundColor:'rgba(0,0,0,0.65)', backdropFilter:'blur(5px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="glass" style={{ width:'100%', maxWidth:900, maxHeight:'92vh',
        display:'flex', flexDirection:'column',
        backgroundColor:'var(--sidebar-bg)', borderRadius:18,
        border:'1px solid var(--border-color)',
        boxShadow:'0 24px 64px rgba(0,0,0,0.3)', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding:'22px 28px 0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:11,
                backgroundColor:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BarChart2 size={20} color="var(--primary)"/>
              </div>
              <div>
                <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'var(--text-main)', margin:0 }}>
                  Analytics
                </h2>
                <p style={{ fontSize:'0.72rem', color:'var(--text-main)', opacity:0.45, margin:'2px 0 0' }}>
                  {isAdmin ? 'Usage insights · Admin only' : 'Your personal usage stats'}
                  {trackingConsent === true && (
                    <span style={{ marginLeft:8, display:'inline-flex', alignItems:'center', gap:3,
                      fontSize:'0.65rem', color:'#16a34a', fontWeight:600 }}>
                      <ShieldCheck size={10}/> Tracking on
                    </span>
                  )}
                  {trackingConsent === false && (
                    <span style={{ marginLeft:8, display:'inline-flex', alignItems:'center', gap:3,
                      fontSize:'0.65rem', color:'#94a3b8', fontWeight:600 }}>
                      <ShieldOff size={10}/> Tracking off
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ display:'flex', gap:4, padding:'4px', borderRadius:9,
                backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                <PeriodBtn value="week"  current={period} onChange={setPeriod} label="7d"/>
                <PeriodBtn value="month" current={period} onChange={setPeriod} label="30d"/>
                <PeriodBtn value="all"   current={period} onChange={setPeriod} label="All"/>
              </div>
              <button onClick={() => fetchAll(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px',
                  borderRadius:8, backgroundColor:'var(--card-bg)',
                  border:'1px solid var(--border-color)', color:'var(--text-main)',
                  cursor:'pointer', fontSize:'0.78rem' }}>
                <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none'}}/>
                Refresh
              </button>
              <button onClick={onClose}
                style={{ width:32, height:32, borderRadius:'50%', display:'flex',
                  alignItems:'center', justifyContent:'center',
                  background:'var(--card-bg)', border:'1px solid var(--border-color)',
                  color:'var(--text-main)', cursor:'pointer', opacity:0.6 }}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}>
                <X size={15}/>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border-color)' }}>
            {tabs.map(([v, icon, label]) => (
              <button key={v} onClick={() => setTab(v)}
                style={{ display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', background:'none', border:'none',
                  borderBottom:`2px solid ${tab===v?'var(--primary)':'transparent'}`,
                  color:tab===v?'var(--primary)':'var(--text-main)',
                  opacity:tab===v?1:0.5, cursor:'pointer',
                  fontSize:'0.82rem', fontWeight:tab===v?700:500,
                  marginBottom:-1, transition:'all 0.15s' }}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'22px 28px 28px' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              height:200, color:'var(--text-main)', opacity:0.4, fontSize:'0.9rem' }}>
              Loading analytics…
            </div>
          ) : (
            <>
              {/* ══ MY STATS (normal user) ══ */}
              {tab === 'mine' && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {trackingConsent === false && (
                    <div style={{ padding:'14px 18px', borderRadius:12,
                      backgroundColor:'rgba(148,163,184,0.08)', border:'1px solid rgba(148,163,184,0.2)',
                      display:'flex', alignItems:'center', gap:10 }}>
                      <ShieldOff size={16} color="#94a3b8"/>
                      <p style={{ fontSize:'0.82rem', color:'var(--text-main)', opacity:0.6, margin:0 }}>
                        You've opted out of tracking. No data is being collected. Enable it in Settings.
                      </p>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <StatCard icon={<Eye/>}   label="My Views"     value={myStats?.totalViews ?? 0}
                      color="var(--primary)" bg="rgba(37,99,235,0.06)"  border="rgba(37,99,235,0.15)"/>
                    <StatCard icon={<Timer/>} label="Time Spent"   value={fmt(myStats?.totalDuration)}
                      color="#22c55e"        bg="rgba(34,197,94,0.06)"  border="rgba(34,197,94,0.18)"/>
                  </div>

                  {myStats?.topUrls?.length > 0 && (
                    <div style={{ padding:'18px 20px', borderRadius:14,
                      backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                      <SectionHeader icon={<Award/>} title="My Top URLs" count={myStats.topUrls.length}/>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {myStats.topUrls.map((u, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:'0.7rem', fontWeight:700, width:18, textAlign:'right',
                              color:i===0?'#f59e0b':'var(--text-main)', opacity:i===0?1:0.35 }}>#{i+1}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                                <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-main)' }}>
                                  {u._id || 'Unknown'}
                                </span>
                                <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--primary)' }}>
                                  {u.views} views
                                </span>
                              </div>
                              <div style={{ height:4, borderRadius:4, backgroundColor:'var(--border-color)', overflow:'hidden' }}>
                                <div style={{ height:'100%', borderRadius:4,
                                  width:`${(u.views/Math.max(...myStats.topUrls.map(x=>x.views),1))*100}%`,
                                  backgroundColor:i===0?'#f59e0b':'var(--primary)', opacity:0.7 }}/>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ OVERVIEW ══ */}
              {tab === 'overview' && (
                <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <StatCard icon={<Eye/>}   label="Total Views"   value={summary?.totalViews??0}
                      color="var(--primary)" bg="rgba(37,99,235,0.06)"  border="rgba(37,99,235,0.15)"
                      sub={`${summary?.todayViews??0} today`}/>
                    <StatCard icon={<Timer/>} label="Time Spent"    value={fmt(summary?.totalDuration)}
                      color="#22c55e"        bg="rgba(34,197,94,0.06)"  border="rgba(34,197,94,0.18)"/>
                    <StatCard icon={<Users/>} label="Active Users"  value={summary?.uniqueUsers??0}
                      color="#a855f7"        bg="rgba(168,85,247,0.06)" border="rgba(168,85,247,0.18)"/>
                    <StatCard icon={<Globe/>} label="Unique URLs"   value={summary?.uniqueUrls??0}
                      color="#f59e0b"        bg="rgba(245,158,11,0.06)" border="rgba(245,158,11,0.18)"/>
                  </div>

                  <div style={{ padding:'18px 20px', borderRadius:14,
                    backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                    <SectionHeader icon={<TrendingUp/>} title={`Daily Views — last ${period==='week'?'7':'30'} days`}/>
                    <MiniBarChart data={trends} valueKey="views" color="var(--primary)" height={90}/>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      {trends.filter((_,i)=>i%(period==='week'?1:5)===0).map(d=>(
                        <span key={d.date} style={{ fontSize:'0.6rem', color:'var(--text-main)', opacity:0.4 }}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding:'18px 20px', borderRadius:14,
                    backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                    <SectionHeader icon={<Award/>} title="Top 5 URLs" count={Math.min(topUrls.length,5)}/>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {topUrls.slice(0,5).map((u,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:'0.7rem', fontWeight:700, width:18, textAlign:'right',
                            color:i===0?'#f59e0b':'var(--text-main)', opacity:i===0?1:0.35 }}>#{i+1}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                              <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-main)',
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'60%' }}>
                                {u.urlName||'Unknown'}
                              </span>
                              <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--primary)', flexShrink:0 }}>
                                {u.views} views
                              </span>
                            </div>
                            <div style={{ height:4, borderRadius:4, backgroundColor:'var(--border-color)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:4,
                                width:`${(u.views/maxViews)*100}%`,
                                backgroundColor:i===0?'#f59e0b':'var(--primary)', opacity:0.7 }}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ TOP URLs ══ */}
              {tab === 'urls' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <SectionHeader icon={<Globe/>} title="Most Accessed URLs" count={topUrls.length}/>
                  {topUrls.length===0 ? (
                    <div style={{ textAlign:'center', padding:'40px 0', opacity:0.4, fontSize:'0.88rem' }}>No data</div>
                  ) : topUrls.map((u,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:14,
                      padding:'13px 16px', borderRadius:12,
                      backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)',
                      transition:'border 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-color)'}>
                      <span style={{ fontSize:'0.82rem', fontWeight:800, width:22, textAlign:'center', flexShrink:0,
                        color:i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7f32':'var(--text-main)',
                        opacity:i>2?0.4:1 }}>#{i+1}</span>
                      <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
                        backgroundColor:'rgba(37,99,235,0.1)', border:'1px solid var(--border-color)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, fontSize:'0.9rem', color:'var(--primary)' }}>
                        {u.urlName?.charAt(0)?.toUpperCase()||'?'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--text-main)',
                          margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {u.urlName||'Unknown'}
                        </p>
                        <div style={{ height:4, borderRadius:4, backgroundColor:'var(--border-color)', overflow:'hidden', marginBottom:4 }}>
                          <div style={{ height:'100%', borderRadius:4,
                            width:`${(u.views/maxViews)*100}%`,
                            backgroundColor:'var(--primary)', opacity:0.65 }}/>
                        </div>
                        <div style={{ display:'flex', gap:12, fontSize:'0.7rem', color:'var(--text-main)', opacity:0.45 }}>
                          <span>{u.uniqueUsers} user{u.uniqueUsers!==1?'s':''}</span>
                          <span>avg {fmt(u.avgTime)}</span>
                          <span>total {fmt(u.totalTime)}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0, gap:4 }}>
                        <span style={{ fontSize:'1.1rem', fontWeight:800, color:'var(--primary)' }}>{u.views}</span>
                        <span style={{ fontSize:'0.65rem', color:'var(--text-main)', opacity:0.4 }}>views</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ USERS ══ */}
              {tab === 'users' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <SectionHeader icon={<Users/>} title="Per-User Usage" count={userUsage.length}/>
                  {userUsage.length===0 ? (
                    <div style={{ textAlign:'center', padding:'40px 0', opacity:0.4 }}>No data</div>
                  ) : userUsage.map((u,i) => (
                    <div key={i} style={{ padding:'14px 16px', borderRadius:12,
                      backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)',
                      transition:'border 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(168,85,247,0.5)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-color)'}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                          backgroundColor:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:700, fontSize:'0.9rem', color:'#a855f7' }}>
                          {u.username?.charAt(0)?.toUpperCase()||'?'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:'0.88rem', fontWeight:700, color:'var(--text-main)' }}>
                                {u.username||'Unknown'}
                              </span>
                              {u.team && (
                                <span style={{ fontSize:'0.65rem', padding:'1px 7px', borderRadius:20,
                                  backgroundColor:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
                                  color:'#d97706', fontWeight:600 }}>
                                  {u.team}
                                </span>
                              )}
                              {u.trackingConsent === false && (
                                <span style={{ fontSize:'0.62rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:2 }}>
                                  <ShieldOff size={10}/> opted out
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#a855f7' }}>
                              {u.views} views
                            </span>
                          </div>
                          <div style={{ display:'flex', gap:14, marginTop:5, fontSize:'0.7rem',
                            color:'var(--text-main)', opacity:0.5, flexWrap:'wrap' }}>
                            <span>⏱ {fmt(u.totalTime)}</span>
                            <span>⌀ {fmt(u.avgTime)}</span>
                            <span>🔗 {u.urlCount} URL{u.urlCount!==1?'s':''}</span>
                            <span>🕐 {fmtDate(u.lastSeen)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop:10, height:4, borderRadius:4,
                        backgroundColor:'var(--border-color)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4, backgroundColor:'#a855f7', opacity:0.6,
                          width:`${(u.views/Math.max(...userUsage.map(x=>x.views),1))*100}%`,
                          transition:'width 0.5s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ TEAMS ══ */}
              {tab === 'teams' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <SectionHeader icon={<UsersRound/>} title="Per-Team Usage" count={teamUsage.length}/>
                  {teamUsage.length===0 ? (
                    <div style={{ textAlign:'center', padding:'40px 0', opacity:0.4 }}>
                      No team data. Assign teams to users in Manage Users.
                    </div>
                  ) : teamUsage.map((t,i) => (
                    <div key={i} style={{ padding:'16px 18px', borderRadius:12,
                      backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)',
                      transition:'border 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(245,158,11,0.5)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-color)'}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:40, height:40, borderRadius:10,
                            backgroundColor:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight:700, fontSize:'1rem', color:'#d97706' }}>
                            {t.team?.charAt(0)?.toUpperCase()||'?'}
                          </div>
                          <div>
                            <p style={{ fontSize:'0.9rem', fontWeight:700, color:'var(--text-main)', margin:'0 0 3px' }}>
                              {t.team}
                            </p>
                            <div style={{ display:'flex', gap:10, fontSize:'0.7rem', color:'var(--text-main)', opacity:0.5 }}>
                              <span>👥 {t.memberCount} member{t.memberCount!==1?'s':''}</span>
                              <span>🔗 {t.urlCount} URL{t.urlCount!==1?'s':''}</span>
                              <span>🕐 {fmtDate(t.lastSeen)}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'1.3rem', fontWeight:800, color:'#d97706' }}>{t.views}</div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-main)', opacity:0.4 }}>views</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:'0.75rem', color:'var(--text-main)', opacity:0.6, marginBottom:10 }}>
                        <span>⏱ Total: {fmt(t.totalTime)}</span>
                        <span>⌀ Per member: {t.memberCount>0?fmt(Math.round(t.totalTime/t.memberCount)):'—'}</span>
                      </div>
                      <div style={{ height:5, borderRadius:4, backgroundColor:'var(--border-color)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4, backgroundColor:'#f59e0b', opacity:0.7,
                          width:`${(t.views/maxTeamViews)*100}%`, transition:'width 0.5s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ HEATMAP ══ */}
              {tab === 'heatmap' && (
                <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                  <div style={{ padding:'18px 20px', borderRadius:14,
                    backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                    <SectionHeader icon={<Calendar/>} title="Activity by Hour of Day"/>
                    <p style={{ fontSize:'0.75rem', color:'var(--text-main)', opacity:0.45, marginBottom:14, marginTop:-6 }}>
                      Darker = more activity. Hover for exact count.
                    </p>
                    <HourlyHeatmap data={hourly}/>
                    {(() => {
                      const peak = hourly.reduce((a,b)=>b.views>a.views?b:a, hourly[0]||{});
                      return peak?.views>0 && (
                        <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginTop:14,
                          padding:'7px 12px', borderRadius:8,
                          backgroundColor:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)' }}>
                          <Zap size={13} color="var(--primary)"/>
                          <span style={{ fontSize:'0.75rem', color:'var(--primary)', fontWeight:600 }}>
                            Peak: {peak.label} ({peak.views} views)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ padding:'18px 20px', borderRadius:14,
                    backgroundColor:'var(--card-bg)', border:'1px solid var(--border-color)' }}>
                    <SectionHeader icon={<TrendingUp/>} title="Daily Trend"/>
                    <MiniBarChart data={trends} valueKey="views" color="#22c55e" height={80}/>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      {trends.filter((_,i)=>i%(period==='week'?1:5)===0).map(d=>(
                        <span key={d.date} style={{ fontSize:'0.6rem', color:'var(--text-main)', opacity:0.4 }}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 28px', borderTop:'1px solid var(--border-color)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:'0.72rem', color:'var(--text-main)', opacity:0.35 }}>
            🔒 {isAdmin ? 'Admin only · Data based on activity logs' : 'Your data only'}
          </span>
          <button onClick={onClose}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
              borderRadius:8, cursor:'pointer', backgroundColor:'transparent',
              border:'1px solid var(--border-color)', color:'var(--text-main)',
              fontSize:'0.82rem', opacity:0.65, transition:'opacity 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='1'}
            onMouseLeave={e=>e.currentTarget.style.opacity='0.65'}>
            <X size={13}/> Close
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};

export default AnalyticsDashboard;