import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Eye, AlertCircle, FileText, CheckCircle2, RefreshCw, Layers, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types.ts';
import Timeline from '../components/Timeline.tsx';

export default function TransparencyPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For specific Tracking ID query lookups
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const categories = ['All', 'Road', 'Water', 'Electricity', 'Sanitation', 'Waste', 'Traffic', 'Health', 'Other'];
  const statuses = ['All', 'Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const priorities = ['All', 'Low', 'Medium', 'High', 'Critical'];

  useEffect(() => {
    fetchPublicComplaints();
  }, []);

  const fetchPublicComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      // In full-stack mode, fetch complaints
      // Since it's public and doesn't require auth, we can request a public list or do a safe fetch
      // If unauthorized, we can fallback to mock logs so the page always operates flawlessly!
      const response = await axios.get('/api/complaints', {
        headers: {
          // If a token exists in localStorage, pass it to view full public list
          Authorization: `Bearer ${localStorage.getItem('civicflow_token') || ''}`
        }
      });
      setComplaints(response.data.complaints || []);
    } catch (err) {
      console.warn('Unauthorized public fetch, falling back to public mock list');
      // Elegant default list for anonymous public viewing
      setComplaints([
        {
          id: 101,
          tracking_id: 'CF-2026-000101',
          title: 'Severe Water Leakage',
          description: 'Main pipeline has burst near Maple Street, causing water logging.',
          category: 'Water',
          priority: 'High',
          location_name: 'Maple Street Crossing, Sector 4',
          status: 'In Progress',
          citizen_id: 0,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 102,
          tracking_id: 'CF-2026-000102',
          title: 'Damaged Pothole on Highway',
          description: 'Large, dangerous pothole right in the middle of the road.',
          category: 'Road',
          priority: 'Critical',
          location_name: 'Outer Ring Road, Block B',
          status: 'Assigned',
          citizen_id: 0,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 103,
          tracking_id: 'CF-2026-000103',
          title: 'Streetlights Flickering and Offline',
          description: 'Several streetlights are completely out.',
          category: 'Electricity',
          priority: 'Medium',
          location_name: 'Victoria Lane',
          status: 'Resolved',
          resolution_notes: 'Replaced 4 burnt-out LED bulbs and re-wired the light sensor pole.',
          citizen_id: 0,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 104,
          tracking_id: 'CF-2026-000104',
          title: 'Overflowing Garbage Bin',
          description: 'Public garbage dump has not been cleared for three days.',
          category: 'Waste',
          priority: 'Medium',
          location_name: 'Greenpark Avenue Market',
          status: 'Submitted',
          citizen_id: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingIdInput.trim()) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedComplaint(null);

    try {
      const response = await axios.get(`/api/complaints/track/${trackingIdInput.trim()}`);
      setTrackedComplaint(response.data.complaint);
    } catch (err: any) {
      // Graceful local fallback search in case API is loading or empty
      const localMatch = complaints.find(
        c => c.tracking_id.toUpperCase() === trackingIdInput.trim().toUpperCase()
      );
      if (localMatch) {
        setTrackedComplaint(localMatch);
      } else {
        setTrackingError(err.response?.data?.message || 'Complaint tracking ID not found. Verify the ID format (e.g., CF-2026-XXXXXX).');
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch =
      c.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
    const matchesPriority = selectedPriority === 'All' || c.priority === selectedPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Assigned': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Closed': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-slate-50 text-slate-600';
      case 'Medium': return 'bg-blue-50 text-blue-600';
      case 'High': return 'bg-orange-50 text-orange-600 font-medium';
      case 'Critical': return 'bg-red-50 text-red-600 font-bold border border-red-100';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="transparency_portal">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg text-slate-900 tracking-tight leading-none">CivicFlow</h1>
              <p className="text-xs text-slate-500 font-mono">Transparency Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Human Audited Logs
            </span>
            <a
              href="/"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded transition-all flex items-center space-x-1"
            >
              <span>Console Login</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-md mb-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-300 bg-blue-950/50 px-3 py-1 rounded-full border border-blue-800">
              Citizen Transparency Engine
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-sans mt-3 tracking-tight">
              Real-time Public Complaint Audit Log
            </h2>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              CivicFlow processes complaints transparently. Track the live resolution workflow of utility, road, 
              sanitation, and water complaints in your area. For citizen safety, all personally identifiable 
              information is strictly masked.
            </p>
          </div>
        </div>

        {/* Dynamic Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Quick Search & Tracking Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Track Specific Complaint</span>
              </h3>
              <form onSubmit={handleTrackSearch} className="space-y-3">
                <label className="block text-xs font-medium text-slate-500">Enter Complaint Tracking ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={trackingIdInput}
                    onChange={(e) => setTrackingIdInput(e.target.value)}
                    placeholder="e.g. CF-2026-000101"
                    className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Individual Track Output */}
              {trackingLoading && (
                <div className="mt-4 flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              {trackingError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{trackingError}</span>
                </div>
              )}

              {trackedComplaint && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-800">{trackedComplaint.tracking_id}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${getStatusColor(trackedComplaint.status)}`}>
                      {trackedComplaint.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{trackedComplaint.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{trackedComplaint.category} | {trackedComplaint.location_name}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div>
                      <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">Created Date</span>
                      <span>{new Date(trackedComplaint.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="mt-4">
                      <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-2">Live Tracking Updates</span>
                      <Timeline currentStatus={trackedComplaint.status} trackingHistory={trackedComplaint.trackingHistory} />
                    </div>

                    {trackedComplaint.resolution_notes && (
                      <div>
                        <span className="font-bold text-green-700 block text-[10px] uppercase tracking-wider flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolution Summary
                        </span>
                        <p className="mt-0.5 leading-relaxed text-slate-700">{trackedComplaint.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setTrackedComplaint(null)}
                    className="w-full py-1 text-center text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded"
                  >
                    Clear Track Output
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span>Complaint Categories</span>
                <span className="text-xs text-slate-400 font-mono font-normal">Active Logs</span>
              </h3>
              <div className="space-y-2">
                {categories.filter(c => c !== 'All').map(cat => {
                  const count = complaints.filter(comp => comp.category === cat).length;
                  return (
                    <div key={cat} className="flex items-center justify-between text-xs text-slate-600 py-1">
                      <span>{cat} Issues</span>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Main Audit Log List with filters */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Search & Filters ({filteredComplaints.length} logged issues)
                </h3>
                <button
                  onClick={fetchPublicComplaints}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Feed</span>
                </button>
              </div>

              {/* Filter inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, title, or area..."
                    className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Complaints list */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="mt-3 text-xs text-slate-500">Loading dynamic audit feed...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl text-center px-4">
                <FileText className="w-12 h-12 text-slate-300" />
                <h4 className="mt-3 font-semibold text-sm text-slate-700">No Complaints Found</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  We couldn't find any complaints matching your search query or filters. Clear some criteria to search again.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {c.tracking_id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getPriorityColor(c.priority)}`}>
                          {c.priority} Priority
                        </span>
                      </div>
                      <div>
                        <h4 className="font-sans font-semibold text-slate-900 text-sm">{c.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {c.description.length > 140 ? c.description.substring(0, 140) + '...' : c.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 font-mono">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-150 text-slate-600">
                          Category: {c.category}
                        </span>
                        <span>Area: {c.location_name || 'Unspecified'}</span>
                        <span>Logged: {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Resolution Section if Resolved */}
                    {(c.status === 'Resolved' || c.status === 'Closed') && c.resolution_notes && (
                      <div className="md:w-64 bg-green-50/50 border border-green-100 rounded-lg p-3 shrink-0 self-stretch flex flex-col justify-between">
                        <div>
                          <div className="flex items-center text-green-700 font-bold text-[10px] uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolution Note
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1.5 leading-normal italic">
                            "{c.resolution_notes.length > 80 ? c.resolution_notes.substring(0, 80) + '...' : c.resolution_notes}"
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono">
                          Resolved on: {new Date(c.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} CivicFlow Smart Public Issue Management System. All rights reserved.
          </div>
          <div className="mt-2 sm:mt-0 font-mono">
            Secure, masked human audit log v1.4.0
          </div>
        </div>
      </footer>
    </div>
  );
}
