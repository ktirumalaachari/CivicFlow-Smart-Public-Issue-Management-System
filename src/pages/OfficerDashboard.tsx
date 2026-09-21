import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, RotateCw, AlertTriangle, FileImage, Layers, Clock, CheckSquare, 
  BookOpen, Layout, PieChart, RefreshCw, Eye, ArrowRight, CheckCircle2, UserCheck, ShieldAlert, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Complaint, ComplaintStatus } from '../types.ts';

// Register ChartJS modules
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface OfficerDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function OfficerDashboard({ user, onLogout }: OfficerDashboardProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    underReview: 0,
  });

  // Internal Notes Update
  const [updatingNotesId, setUpdatingNotesId] = useState<number | null>(null);
  const [internalNotesText, setInternalNotesText] = useState('');

  // Resolution modal form
  const [selectedResolve, setSelectedResolve] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resImageFile, setResImageFile] = useState<File | null>(null);
  const [resImagePreview, setResImagePreview] = useState<string | null>(null);

  // General tracking modal
  const [selectedTrack, setSelectedTrack] = useState<Complaint | null>(null);

  useEffect(() => {
    fetchOfficerComplaints();

    const token = localStorage.getItem('civicflow_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/notifications/stream?token=${token}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          toast.success(`${data.title}\n${data.message}`, { duration: 6000 });
          fetchOfficerComplaints(); // Refresh assigned complaints to show live status
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
  });

  const fetchOfficerComplaints = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/officer/complaints', getHeaders());
      const list: Complaint[] = response.data.complaints || [];
      setComplaints(list);

      // Only count complaints specifically assigned to the logged-in officer
      const mine = list.filter(c => c.officer_id === user.id);

      // Compute stats based on Officer's assigned workload
      setStats({
        assigned: mine.filter(c => c.status === 'Assigned').length,
        inProgress: mine.filter(c => c.status === 'In Progress').length,
        resolved: mine.filter(c => c.status === 'Resolved' || c.status === 'Closed').length,
        underReview: mine.filter(c => c.status === 'Under Review').length
      });
    } catch (err) {
      console.error('Error fetching officer complaints:', err);
      toast.error('Failed to reload assigned tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssignment = async (id: number) => {
    const actionToast = toast.loading('Claiming complaint and registering assignment...');
    try {
      await axios.put(`/api/complaints/${id}/accept`, {}, getHeaders());
      toast.success('Complaint claimed! It is now locked to your remediation queue.', { id: actionToast });
      fetchOfficerComplaints();
    } catch (err) {
      toast.error('Failed to claim assignment.', { id: actionToast });
    }
  };

  const handleUpdateStatus = async (id: number, status: ComplaintStatus) => {
    const statusToast = toast.loading(`Updating status to ${status}...`);
    try {
      await axios.put(`/api/complaints/${id}/status`, { status }, getHeaders());
      toast.success(`Complaint status updated to ${status}.`, { id: statusToast });
      fetchOfficerComplaints();
    } catch (err) {
      toast.error('Failed to save status update.', { id: statusToast });
    }
  };

  const handleUpdateInternalNotes = async (id: number) => {
    if (!internalNotesText.trim()) {
      toast.error('Internal notes cannot be blank.');
      return;
    }
    const notesToast = toast.loading('Logging internal technical comments...');
    try {
      // Direct update of internal notes & administrative logs
      await axios.put(`/api/complaints/${id}/status`, { 
        status: complaints.find(c => c.id === id)?.status || 'In Progress',
        internal_notes: internalNotesText 
      }, getHeaders());
      
      toast.success('Technical notes logged successfully.', { id: notesToast });
      setUpdatingNotesId(null);
      setInternalNotesText('');
      fetchOfficerComplaints();
      
      if (selectedTrack && selectedTrack.id === id) {
        setSelectedTrack(prev => prev ? { ...prev, internal_notes: internalNotesText } : null);
      }
    } catch (err) {
      toast.error('Failed to log comments.', { id: notesToast });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit.');
        return;
      }
      setResImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResolve) return;
    if (!resolutionNotes.trim()) {
      toast.error('Resolution summary notes are required.');
      return;
    }

    const formData = new FormData();
    formData.append('resolution_notes', resolutionNotes);
    if (resImageFile) {
      formData.append('image', resImageFile);
    }

    const resolveToast = toast.loading('Filing resolution receipt...');
    try {
      await axios.put(`/api/complaints/${selectedResolve.id}/resolve`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('civicflow_token')}`
        }
      });
      toast.success('Complaint marked as resolved! Pending administrative closure.', { id: resolveToast });
      
      // Clear forms
      setResolutionNotes('');
      setResImageFile(null);
      setResImagePreview(null);
      setSelectedResolve(null);

      fetchOfficerComplaints();
    } catch (err) {
      toast.error('Failed to submit resolution details.', { id: resolveToast });
    }
  };

  // Department-wide Statistics Calculations (Performance Dashboard)
  const deptTotalCount = complaints.length;
  const deptResolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
  const deptRate = deptTotalCount > 0 ? Math.round((deptResolvedCount / deptTotalCount) * 100) : 100;

  // Setup Workload Pie Chart Data
  const categoriesCount = complaints.reduce((acc: any, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const pieChartData = {
    labels: Object.keys(categoriesCount),
    datasets: [
      {
        label: 'Issues Ingested',
        data: Object.values(categoriesCount),
        backgroundColor: [
          '#1e3a8a', // Dark government blue
          '#d97706', // Deep amber
          '#b91c1c', // Deep crimson
          '#047857', // Forest green
          '#4338ca', // Indigo
          '#be185d', // Deep pink
          '#0f766e', // Teal
          '#6d28d9'  // Purple
        ],
        borderWidth: 1,
      }
    ]
  };

  // Setup Status Bar Chart Data
  const barChartData = {
    labels: ['Assigned', 'Under Review', 'In Progress', 'Resolved'],
    datasets: [
      {
        label: 'Tickets Caseload',
        data: [stats.assigned, stats.underReview, stats.inProgress, stats.resolved],
        backgroundColor: ['#eab308', '#a855f7', '#3b82f6', '#10b981'],
        borderRadius: 4,
      }
    ]
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Assigned': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Under Review': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Closed': return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-slate-50 text-slate-600';
      case 'Medium': return 'bg-blue-50 text-blue-600';
      case 'High': return 'bg-orange-50 text-orange-600 font-semibold';
      case 'Critical': return 'bg-red-50 text-red-600 font-bold border border-red-100';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans" id="officer_dashboard">
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#0f172a] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 shadow-lg">
        <div className="p-8 pb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none font-display">CivicFlow</h1>
          <p className="text-[10px] opacity-70 uppercase tracking-widest mt-2 font-mono font-bold text-[#38bdf8]">Officer Terminal</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          <button
            className="w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 text-sm transition-all cursor-pointer font-bold bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]"
          >
            <Layout className="w-4 h-4" />
            <span>Remediation board</span>
          </button>
        </nav>

        {/* Footer info inside sidebar */}
        <div className="p-6 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase font-display border border-slate-600">
              {user?.name?.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate leading-none">{user?.name}</span>
              <span className="text-[9px] font-mono text-[#38bdf8] bg-slate-900/40 px-1.5 py-0.5 rounded mt-1 inline-block font-bold uppercase">{user?.department || 'General'}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-2 text-center text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Right Main Container */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
            <span className="font-display font-bold text-sm text-slate-900 tracking-tight">
              Remediation Board
            </span>
            <span className="text-slate-300">/</span>
            <span>{user?.department || 'General'} Department Division</span>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-800 block leading-none">{user?.name}</span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block font-bold">OFFICER TERMINAL</span>
          </div>
        </header>

        {/* Main Container */}
        <main className="p-8 flex-grow space-y-8">
          
          {/* Department Performance Panel */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                <h2 className="font-extrabold text-lg tracking-tight font-display">{user?.department || 'General'} Division Performance</h2>
              </div>
              <p className="text-xs text-blue-200 max-w-md">
                Tracking resolution rates, outstanding caseload audits, and general operations ledger. Keep up the great work!
              </p>
            </div>

            <div className="flex gap-8 border-l border-white/20 pl-8">
              <div>
                <span className="text-[10px] text-blue-300 uppercase font-mono block">Division Load</span>
                <span className="text-3xl font-extrabold font-mono text-white">{deptTotalCount} Issues</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-300 uppercase font-mono block">Remediation Rate</span>
                <span className="text-3xl font-extrabold font-mono text-green-400">{deptRate}%</span>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">My Assigned</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">{stats.assigned}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Under Review</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-purple-600 tracking-tight font-display">{stats.underReview}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">In Progress</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-blue-600 tracking-tight font-display">{stats.inProgress}</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider font-mono">My Resolved</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-display">{stats.resolved}</span>
              </div>
            </div>
          </div>

          {/* Dashboard Split: Charts + Assigned List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Charts panel - 4 Cols */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <h3 className="font-sans font-bold text-slate-900 text-xs border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <span>Workload Ingestion Split</span>
                  <PieChart className="w-4 h-4 text-slate-400" />
                </h3>
                {complaints.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-8">No workload registered.</p>
                ) : (
                  <div className="p-2">
                    <Pie data={pieChartData} options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} />
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <h3 className="font-sans font-bold text-slate-900 text-xs border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <span>My Queue Status Breakdown</span>
                  <CheckSquare className="w-4 h-4 text-slate-400" />
                </h3>
                {complaints.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-8">No task records.</p>
                ) : (
                  <div className="p-2 h-44">
                    <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                )}
              </div>
            </div>

            {/* Complaints Log - 8 Cols */}
            <div className="lg:col-span-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
                  <div>
                    <h3 className="font-sans font-bold text-slate-900 text-sm">Department Remediation Ledger</h3>
                    <p className="text-xs text-slate-400">Claim unassigned cases or manage your assigned tickets below.</p>
                  </div>
                  <button
                    onClick={fetchOfficerComplaints}
                    className="p-1.5 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : complaints.length === 0 ? (
                  <div className="py-16 text-center max-w-xs mx-auto">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm mt-3">No Division Issues Logged</h4>
                    <p className="text-xs text-slate-400 mt-1">There are currently no active public complaints assigned to your department division.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {complaints.map(c => {
                      const isAssignedToMe = c.officer_id === user.id;
                      const isUnassigned = !c.officer_id;

                      return (
                        <div key={c.id} className="border border-slate-200 rounded-xl p-5 hover:bg-slate-50/50 transition-colors space-y-4">
                          {/* Top Row metrics */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {c.tracking_id}
                              </span>
                              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${getStatusBadge(c.status)}`}>
                                {c.status}
                              </span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${getPriorityColor(c.priority)}`}>
                              {c.priority} Severity
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{c.description}</p>
                            
                            {/* Admin Feedback Box */}
                            {c.admin_feedback && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3 flex items-start gap-2.5 text-xs text-red-800">
                                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Admin Correction Order:</p>
                                  <p className="mt-0.5 text-slate-700 italic">"{c.admin_feedback}"</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Location Metadata */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 gap-2 font-mono text-[10px]">
                            <div>
                              <span>Area: <strong>{c.location_name || 'Not specified'}</strong></span>
                            </div>
                            <div>
                              <span>Logged: {new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Action buttons depending on status */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setSelectedTrack(c)}
                                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 text-xs flex items-center space-x-1 font-semibold"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Inspect Case Log</span>
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Option to claim unassigned ticket */}
                              {isUnassigned && (
                                <button
                                  onClick={() => handleAcceptAssignment(c.id!)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-2xs"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>Accept Assignment</span>
                                </button>
                              )}

                              {isAssignedToMe && c.status === 'Assigned' && (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleUpdateStatus(c.id!, 'Under Review')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(c.id!, 'In Progress')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                  >
                                    Start Repair
                                  </button>
                                </div>
                              )}

                              {isAssignedToMe && c.status === 'Under Review' && (
                                <button
                                  onClick={() => handleUpdateStatus(c.id!, 'In Progress')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                >
                                  Start Work Progress
                                </button>
                              )}

                              {isAssignedToMe && c.status === 'In Progress' && (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleUpdateStatus(c.id!, 'Under Review')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                  >
                                    Hold (Under Review)
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedResolve(c);
                                      setResolutionNotes('');
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm"
                                  >
                                    Mark as Resolved
                                  </button>
                                </div>
                              )}

                              {isAssignedToMe && (c.status === 'Resolved' || c.status === 'Closed') && (
                                <span className="text-xs text-green-700 font-bold flex items-center bg-green-50 px-2.5 py-1 rounded border border-green-100">
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Remediation Logged
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* RESOLVE ISSUE MODAL */}
      {selectedResolve && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Work Resolution Receipt</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedResolve.tracking_id}</h4>
              </div>
              <button
                onClick={() => setSelectedResolve(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Resolution notes *</label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Summarize the action taken (e.g., 'Patched pothole with 4kg cement mix and leveled highway block')."
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Upload Proof Photo */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Upload After Repair/Resolution Photo (Proof)</label>
                <div className="flex items-center space-x-3">
                  <label className="cursor-pointer border border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50 p-3 rounded-lg flex flex-col items-center justify-center shrink-0 w-24 h-24 text-slate-400 transition-all">
                    <FileImage className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Select File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {resImagePreview && (
                    <div className="relative border border-slate-200 rounded-lg w-24 h-24 overflow-hidden">
                      <img src={resImagePreview} alt="Work Proof Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setResImageFile(null); setResImagePreview(null); }}
                        className="absolute right-1 top-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 text-[10px]"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedResolve(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-all shadow-sm"
                >
                  Submit Resolution Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION LOG & DETAILS MODAL */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold">CASE INSPECTION LOG</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedTrack.tracking_id}</h4>
              </div>
              <button onClick={() => setSelectedTrack(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[440px] overflow-y-auto">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Issue Title</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedTrack.title}</p>
                <p className="mt-1 leading-relaxed text-slate-600">{selectedTrack.description}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Filer Contact details</span>
                <p className="mt-0.5 font-bold text-slate-800">{selectedTrack.citizen_name || 'Anonymous citizen'}</p>
                <p className="text-[11px] text-slate-500">Email: {selectedTrack.citizen_email || 'No email provided'}</p>
                {selectedTrack.citizen_phone && <p className="text-[11px] text-slate-500">Phone: {selectedTrack.citizen_phone}</p>}
              </div>

              {selectedTrack.location_lat && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Geospatial Coordinates</span>
                  <p className="font-mono mt-0.5 text-slate-600">LAT: {selectedTrack.location_lat?.toFixed(6) || 'N/A'}, LNG: {selectedTrack.location_lng?.toFixed(6) || 'N/A'}</p>
                </div>
              )}

              {/* Internal Notes update system */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Internal Technical Logs</span>
                
                {updatingNotesId === selectedTrack.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={internalNotesText}
                      onChange={(e) => setInternalNotesText(e.target.value)}
                      placeholder="e.g. Cleared water logging. Require asphalt mixture next Tuesday..."
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none bg-white"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setUpdatingNotesId(null)}
                        className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateInternalNotes(selectedTrack.id!)}
                        className="bg-blue-600 text-white px-2.5 py-1 rounded text-[10px] font-bold"
                      >
                        Save Comment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 italic">
                      "{selectedTrack.internal_notes || 'No internal technical logs documented.'}"
                    </p>
                    {selectedTrack.officer_id === user.id && (
                      <button
                        onClick={() => {
                          setUpdatingNotesId(selectedTrack.id!);
                          setInternalNotesText(selectedTrack.internal_notes || '');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[10px] mt-1.5 block underline"
                      >
                        Update technical logs &rarr;
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedTrack.image_url && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Citizen Uploaded Photo</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-1.5 max-h-40">
                    <img src={selectedTrack.image_url} alt="Problem Area" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setSelectedTrack(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1.5 px-4 rounded-lg text-xs"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-12">
        &copy; {new Date().getFullYear()} CivicFlow. All rights reserved.
      </footer>
    </div>
  );
}
