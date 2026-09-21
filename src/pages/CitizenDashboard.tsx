import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Plus, Radio, Mic, MapPin, CheckCircle, Clock, RotateCw, 
  User, Shield, Lock, FileImage, Layers, HelpCircle, Eye, AlertCircle, Sparkles, Navigation 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Complaint, ComplaintStatus, ComplaintCategory, ComplaintPriority } from '../types.ts';
import Timeline from '../components/Timeline.tsx';

import CivicMap from '../components/CivicMap.tsx';

interface CitizenDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function CitizenDashboard({ user, onLogout }: CitizenDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'submit' | 'profile'>('overview');

  // State lists
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Complaint form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Road');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Web Speech API state
  const [isListening, setIsListening] = useState(false);

  // Profile configuration state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // AI categorization state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Selected complaint for detailed modal tracking
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<Complaint | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    fetchCitizenData();
    fetchNotifications();

    const token = localStorage.getItem('civicflow_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/notifications/stream?token=${token}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          toast.success(`${data.title}\n${data.message}`, { duration: 6000 });
          fetchNotifications();
          fetchCitizenData(); // Refresh the list of complaints too to show live status!
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchCitizenData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/citizen/complaints', {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      const list: Complaint[] = response.data.complaints || [];
      setComplaints(list);

      // Compute stats
      setStats({
        total: list.length,
        pending: list.filter(c => c.status === 'Submitted').length,
        inProgress: list.filter(c => c.status === 'Assigned' || c.status === 'In Progress').length,
        resolved: list.filter(c => c.status === 'Resolved' || c.status === 'Closed').length
      });
    } catch (err) {
      console.error('Error fetching citizen dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/complaints/notifications/list', {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.warn('Could not fetch notifications');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await axios.put('/api/complaints/notifications/read', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear notifications');
    }
  };

  // Web Speech API Voice Complaint autofill
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Web Speech API is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Listening... Speak your complaint clearly.');
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setDescription(prev => prev ? `${prev} ${speechToText}` : speechToText);
      toast.success('Voice input added successfully.');
    };

    recognition.onerror = (err: any) => {
      console.error('Speech error:', err);
      toast.error('Speech recognition failed. Ensure mic permission is granted.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submit
  const handleComplaintSubmit = async (e: React.FormEvent, skipDuplicateCheck = false) => {
    e.preventDefault();
    if (!title || !description || !category || !locationName) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (!skipDuplicateCheck) {
      setIsCheckingDuplicate(true);
      try {
        const dupResponse = await axios.post('/api/complaints/check-duplicate', {
          title, description, category, location_name: locationName
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
        });

        if (dupResponse.data.isDuplicate) {
          setDuplicateWarning(dupResponse.data.duplicate);
          setIsCheckingDuplicate(false);
          return; // Stop submission and show modal
        }
      } catch (err) {
        console.error('Failed to check duplicate:', err);
      }
      setIsCheckingDuplicate(false);
    }

    submitComplaintData();
  };

  const submitComplaintData = async () => {
    setDuplicateWarning(null);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('location_name', locationName);
    formData.append('location_lat', lat.toString());
    formData.append('location_lng', lng.toString());
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const submitToast = toast.loading('Logging complaint into ledger...');
    try {
      await axios.post('/api/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('civicflow_token')}`
        }
      });
      toast.success('Complaint submitted successfully! An officer will look into it soon.', { id: submitToast });
      
      // Clear form
      setTitle('');
      setDescription('');
      setLocationName('');
      setImageFile(null);
      setImagePreview(null);
      
      // Refresh dashboard data
      fetchCitizenData();
      fetchNotifications();
      setActiveTab('overview');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint.', { id: submitToast });
    }
  };

  const supportExistingComplaint = async () => {
    if (!duplicateWarning) return;
    const supportToast = toast.loading('Supporting existing complaint...');
    try {
      await axios.post(`/api/complaints/${duplicateWarning.id}/support`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      toast.success('You have supported the existing complaint.', { id: supportToast });
      setDuplicateWarning(null);
      
      setTitle('');
      setDescription('');
      setLocationName('');
      setImageFile(null);
      setImagePreview(null);
      
      setActiveTab('overview');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to support complaint.', { id: supportToast });
    }
  };

  // AI Categorization
  const handleAnalyzeComplaint = async () => {
    if (!title && !description) {
      toast.error('Please enter a title or description first for the AI to analyze.');
      return;
    }

    setIsAnalyzing(true);
    const aiToast = toast.loading('AI is analyzing your complaint...');
    
    try {
      const response = await axios.post('/api/complaints/analyze', {
        title,
        description
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });

      const { category, priority, keywords } = response.data;
      
      if (category) setCategory(category);
      if (priority) setPriority(priority);

      const keywordStr = keywords && keywords.length > 0 ? keywords.join(', ') : 'None detected';
      toast.success(`AI detected Category: ${category} | Priority: ${priority}\nKeywords: ${keywordStr}`, { id: aiToast, duration: 5000 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'AI categorization failed. Try manual selection.', { id: aiToast });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update Profile
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.put('/api/auth/profile', { name: profileName, phone: profilePhone }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      toast.success('Profile metrics updated successfully.');
      // Refresh local user variables
      user.name = profileName;
      user.phone = profilePhone;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  // Update Password
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    try {
      await axios.put('/api/auth/password', { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
      });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating password.');
    }
  };

  // Interactive local map coordinate picker helper
  const mapHotspots = [
    { name: 'Maple Street Crossing, Sector 4', lat: 12.9716, lng: 77.5946 },
    { name: 'Outer Ring Road Expressway, Block B', lat: 12.9740, lng: 77.6010 },
    { name: 'Victoria Lane Residential Area', lat: 12.9650, lng: 77.5890 },
    { name: 'Greenpark Avenue Market Lane', lat: 12.9800, lng: 77.6200 },
    { name: 'Downtown Central Circle', lat: 12.9702, lng: 77.5912 }
  ];

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CivicFlow-App'
          }
        }
      );
      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();
      if (data && data.display_name) {
        const address = data.address || {};
        const landmark = address.suburb || address.neighbourhood || address.residential || address.road || address.amenity || address.village || address.city || 'Selected Location';
        const city = address.city || address.town || address.county || '';
        const finalName = landmark && city ? `${landmark}, ${city}` : data.display_name;
        
        setLocationName(finalName);
        toast.success('Address reverse-geocoded!');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    
    const geoToast = toast.loading('Detecting current GPS location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        toast.success('Current location detected successfully!', { id: geoToast });
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to detect location. Please grant permission or select manually.', { id: geoToast });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapHotspotSelect = (spot: any) => {
    setLat(spot.lat);
    setLng(spot.lng);
    setLocationName(spot.name);
    toast.success(`Dropped coordinate pin at ${spot.name}`);
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Assigned': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved': return 'bg-green-50 text-green-700 border-green-200';
      case 'Closed': return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans" id="citizen_dashboard">
      {/* Left Sidebar */}
      <aside className="w-[260px] bg-[#1e3a8a] text-white flex flex-col shrink-0 min-h-screen border-r border-blue-950 shadow-lg">
        <div className="p-8 pb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none font-display">CivicFlow</h1>
          <p className="text-[10px] opacity-70 uppercase tracking-widest mt-2 font-mono font-bold text-blue-300">Smart Issue Manager</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 text-sm transition-all cursor-pointer font-bold ${
              activeTab === 'overview' 
                ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#60a5fa]' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Complaints</span>
          </button>

          <button
            onClick={() => setActiveTab('submit')}
            className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 text-sm transition-all cursor-pointer font-bold ${
              activeTab === 'submit' 
                ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#60a5fa]' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>File Issue</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 text-sm transition-all cursor-pointer font-bold ${
              activeTab === 'profile' 
                ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#60a5fa]' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Footer info inside sidebar */}
        <div className="p-6 border-t border-blue-900/60 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-white uppercase font-display border border-blue-500">
              {user?.name?.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate leading-none">{user?.name}</span>
              <span className="text-[9px] font-mono text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">CITIZEN</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-2 text-center text-xs font-bold text-blue-200 hover:text-white border border-blue-700 hover:bg-blue-800 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Right Main Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
            <span className="font-display font-bold text-sm text-slate-900 tracking-tight">
              {activeTab === 'overview' ? 'My Complaints Log' : activeTab === 'submit' ? 'File Smart Complaint' : 'Account Config'}
            </span>
            <span className="text-slate-300">/</span>
            <span>Citizen Workspace</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications panel dropdown trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markNotificationsRead();
                }}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 relative text-slate-600 transition-colors cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                {notifications.some(n => n.is_read === 0) && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-3 max-h-96 overflow-y-auto animate-fade-in">
                  <span className="text-xs font-extrabold text-slate-900 block border-b border-slate-100 pb-2 uppercase tracking-wider font-mono">Live Ingestion Alerts ({notifications.length})</span>
                  {notifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4 font-mono">No recent notifications logged.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded-xl text-xs leading-normal border ${n.is_read === 0 ? 'bg-blue-50/50 border-blue-100 text-slate-800' : 'bg-slate-50/50 border-slate-100 text-slate-500'}`}>
                        <div className="font-extrabold text-slate-900">{n.title}</div>
                        <p className="mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-none">{user?.name}</span>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block font-bold">CITIZEN PORTAL</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 flex-grow w-full space-y-8">
        {/* TAB 1: OVERVIEW & LIST */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Bento statistics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">Reported Issues</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-display">{stats.total}</span>
                  <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-mono">Tickets</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">Pending Review</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-extrabold text-yellow-600 tracking-tight font-display">{stats.pending}</span>
                  <span className="text-yellow-600 text-xs font-bold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100 font-mono">In Queue</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">In Remediation</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-extrabold text-amber-500 tracking-tight font-display">{stats.inProgress}</span>
                  <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-mono">Active</span>
                </div>
              </div>

              <div className="bg-[#1e3a8a] border-none p-6 rounded-2xl flex flex-col justify-between shadow-md hover:shadow-lg text-white transition-all">
                <span className="text-xs font-bold text-blue-200 block uppercase tracking-wider font-mono">Resolved Cases</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-extrabold text-white tracking-tight font-display">{stats.resolved}</span>
                  <span className="text-white/80 text-xs font-bold bg-blue-700/50 px-2 py-0.5 rounded-full border border-blue-500/50 font-mono">Fixed</span>
                </div>
              </div>
            </div>

            {/* Dashboard Map Overview */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-sans font-bold text-slate-900 text-sm mb-4">Civic Issue Heatmap & Zones</h3>
              <div className="h-[450px]">
                <CivicMap mode="dashboard" complaints={complaints} />
              </div>
            </div>

            {/* Reported Complaints Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm">Complaint History Ledger</h3>
                  <p className="text-xs text-slate-400">Review status updates and resolution receipts for your logged items.</p>
                </div>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center justify-center space-x-1 transition-all active:scale-98 self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>File New Complaint</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center">
                  <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : complaints.length === 0 ? (
                <div className="py-16 text-center max-w-sm mx-auto flex flex-col items-center">
                  <HelpCircle className="w-12 h-12 text-slate-300" />
                  <h4 className="font-bold text-slate-700 text-sm mt-3">No complaints filed yet</h4>
                  <p className="text-xs text-slate-400 mt-1">If you have spotted potholes, pipeline leaks, or streetlight failures, click the button above to log it.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider">
                        <th className="p-3">Tracking ID</th>
                        <th className="p-3">Complaint Details</th>
                        <th className="p-3">Category / Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date Submitted</th>
                        <th className="p-3 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {complaints.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{c.tracking_id}</td>
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-900">{c.title}</div>
                            <div className="text-slate-400 text-[11px] truncate mt-0.5">{c.location_name || 'No location coordinates provided'}</div>
                          </td>
                          <td className="p-3">
                            <div>{c.category}</div>
                            <span className="text-[10px] text-slate-400">Priority: {c.priority}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getStatusBadge(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedComplaint(c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center space-x-1 font-semibold"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-[10px]">Track</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUBMIT COMPLAINT FORM */}
        {activeTab === 'submit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span>File Smart Public Complaint</span>
                <span className="text-xs text-blue-600 font-mono">Civic Integrity Ledger</span>
              </h3>

              <form onSubmit={handleComplaintSubmit} className="space-y-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Title of Issue *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Major water leak on sector 3 main pipeline"
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                      className="w-full border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 text-xs"
                    >
                      <option value="Road">Roads & Potholes</option>
                      <option value="Water">Water Supplies & Leaks</option>
                      <option value="Electricity">Streetlights & Power</option>
                      <option value="Sanitation">Public Sanitation</option>
                      <option value="Waste">Garbage & Waste Disposal</option>
                      <option value="Traffic">Traffic Blockages</option>
                      <option value="Health">Community Health Risks</option>
                      <option value="Other">Other Issues</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Perceived Severity *</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="w-full border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 text-xs"
                    >
                      <option value="Low">Low (Minor inconvenience)</option>
                      <option value="Medium">Medium (Standard issue)</option>
                      <option value="High">High (Disruptive issue)</option>
                      <option value="Critical">Critical (Immediate danger/blockage)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="font-extrabold text-slate-700 block text-[11px] uppercase tracking-wider font-mono">Description of Complaint *</label>
                  <div className="flex items-center gap-4 bg-[#f8fafc] p-4 rounded-xl border border-dashed border-slate-300 shadow-3xs">
                    <button
                      type="button"
                      onClick={startVoiceInput}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white border-none cursor-pointer shrink-0 transition-all ${
                        isListening 
                          ? 'bg-red-500 animate-pulse shadow-[0_4px_12px_rgba(239,68,68,0.3)]' 
                          : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Voice Dictation {isListening ? 'Active' : 'Ready'}</p>
                      <p className="text-[11px] text-slate-500">{isListening ? 'Listening... Speak clearly to dictate details.' : 'Click mic to describe your problem using voice.'}</p>
                    </div>
                  </div>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Provide details about the issue. (You can also use the Voice Dictation above to automatically transcribe description)."
                    className="w-full border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white leading-relaxed transition-all"
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                   <button
                     type="button"
                     onClick={handleAnalyzeComplaint}
                     disabled={isAnalyzing}
                     className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs py-1.5 px-3 rounded-lg border border-purple-200 transition-all flex items-center space-x-1.5 active:scale-98 disabled:opacity-50"
                   >
                     <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                     <span>Predict Category & Priority with AI</span>
                   </button>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Specific Landmark / Area Name *</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Enter landmark, crossing lane, block details..."
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-150">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Location Latitude</label>
                    <span className="font-mono text-xs text-slate-700 font-bold">{lat.toFixed(6)}</span>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Location Longitude</label>
                    <span className="font-mono text-xs text-slate-700 font-bold">{lng.toFixed(6)}</span>
                  </div>
                </div>

                {/* Upload Image Section */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Upload Issue Photo (Max 5MB)</label>
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

                    {imagePreview && (
                      <div className="relative border border-slate-200 rounded-lg w-24 h-24 overflow-hidden">
                        <img src={imagePreview} alt="Issue Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute right-1 top-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 text-[10px]"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit to Municipal Board</span>
                </button>
              </form>
            </div>

            {/* Map Picker Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-blue-600" /> Map Location Picker</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Interactive Panel</span>
                </h3>

                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Click anywhere on the map to drop a pin, or select a predefined hotspot below. This automatically sets the coordinates and reverse geocodes the address.
                </p>

                <div className="aspect-square bg-slate-100 rounded-xl relative border border-slate-200 shadow-inner" style={{ minHeight: '300px' }}>
                  <CivicMap
                    mode="interactive"
                    lat={lat}
                    lng={lng}
                    onLocationSelect={(newLat, newLng, address) => {
                      setLat(newLat);
                      setLng(newLng);
                      setLocationName(address);
                    }}
                  />
                </div>

                {/* Hotspot buttons */}
                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 block uppercase font-mono">Select Location Hotspot</label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {mapHotspots.map(spot => (
                      <button
                        key={spot.name}
                        type="button"
                        onClick={() => handleMapHotspotSelect(spot)}
                        className={`w-full text-left text-xs py-2 px-3 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${locationName === spot.name ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                      >
                        <span className="truncate pr-2">{spot.name}</span>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* General Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center">
                <User className="w-4 h-4 mr-1 text-blue-600" />
                <span>Account Profile Settings</span>
              </h3>

              <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Registered Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 leading-none">Email address is bound to your account and cannot be modified.</p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Phone Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-all"
                >
                  Save Profile Configuration
                </button>
              </form>
            </div>

            {/* Change Password Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center">
                <Lock className="w-4 h-4 mr-1 text-blue-600" />
                <span>Update Security Password</span>
              </h3>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Current Password *</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">New Password *</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-all"
                >
                  Update Password Key
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* TRACK DETAILS MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400">TRACKING AUDIT LOG</span>
                <h4 className="font-bold text-slate-900 text-sm leading-none mt-1">{selectedComplaint.tracking_id}</h4>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto text-xs text-slate-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issue Title</span>
                <p className="font-semibold text-sm text-slate-900 leading-normal mt-0.5">{selectedComplaint.title}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">State Timeline Workflow</span>
                <Timeline currentStatus={selectedComplaint.status} trackingHistory={(selectedComplaint as any).trackingHistory} />
              </div>

              {/* Resolution proof */}
              {selectedComplaint.resolution_notes && (
                <div className="p-3 bg-green-50 border border-green-200 text-slate-700 rounded-lg space-y-2">
                  <span className="text-[10px] uppercase font-bold text-green-800 tracking-wider flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Work Resolution Receipt
                  </span>
                  <p className="text-[11px] leading-relaxed italic text-slate-800">
                    "{selectedComplaint.resolution_notes}"
                  </p>
                  {selectedComplaint.resolution_image && (
                    <div className="border border-green-200 rounded-lg overflow-hidden mt-2 max-h-40">
                      <img src={selectedComplaint.resolution_image} alt="Resolution Work Proof" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Uploaded Complaint photo */}
              {selectedComplaint.image_url && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reported Issue Photo</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-1.5 max-h-40">
                    <img src={selectedComplaint.image_url} alt="Issue" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-150 flex justify-end space-x-2">
              {selectedComplaint.status === 'Resolved' && (
                <button
                  onClick={async () => {
                    try {
                      await axios.put(`/api/complaints/${selectedComplaint.id}/status`, { status: 'Closed' }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
                      });
                      toast.success('Resolution confirmed and complaint closed.');
                      setSelectedComplaint(null);
                      fetchCitizenData();
                    } catch (e) {
                      toast.error('Failed to confirm resolution.');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition-all"
                >
                  Confirm Resolution (Close)
                </button>
              )}
              <button
                onClick={() => setSelectedComplaint(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-1.5 px-4 rounded-lg transition-all"
              >
                Close Audit Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-orange-100 flex justify-between items-center bg-orange-50 text-orange-800">
              <h4 className="font-bold text-sm">Potential Duplicate Detected</h4>
              <button
                onClick={() => setDuplicateWarning(null)}
                className="text-orange-400 hover:text-orange-600 p-1 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="text-sm">This issue appears to have already been reported by someone else:</p>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="font-bold text-slate-900">{duplicateWarning.title}</p>
                <p className="mt-1 line-clamp-2 text-slate-600">{duplicateWarning.description}</p>
                <div className="mt-2 text-[10px] uppercase font-bold text-slate-400">
                  {duplicateWarning.location_name} &bull; {new Date(duplicateWarning.created_at || '').toLocaleDateString()}
                </div>
              </div>
              <p>Would you like to support the existing complaint to increase its priority, or create a new one anyway?</p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end space-x-2">
              <button
                onClick={supportExistingComplaint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition-all flex items-center"
              >
                Support Existing Complaint
              </button>
              <button
                onClick={(e) => handleComplaintSubmit(e as any, true)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-1.5 px-4 rounded-lg transition-all"
              >
                Create New Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} CivicFlow. All rights reserved.
      </footer>
      </div>
    </div>
  );
}
