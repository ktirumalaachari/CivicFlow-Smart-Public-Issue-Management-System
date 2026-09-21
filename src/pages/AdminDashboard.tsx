import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Layers, FileText, CheckCircle, Clock, MapPin, AlertCircle, 
  BarChart2, Shield, RefreshCw, Send, Trash2, Settings, Download, Search, Plus, Edit, Volume2, X, Ban, Check
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-hot-toast';
import { Pie,Bar } from 'react-chartjs-2';
import { Complaint, ComplaintStatus, User, Department, Category, Announcement } from '../types.ts';

// Register ChartJS modules
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);
interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // Sidebar tab control
  const [activeTab, setActiveTab] = useState<'overview' | 'complaints' | 'officers' | 'departments' | 'categories' | 'announcements' | 'heatmap' | 'reports'>('overview');
  
  // Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Workload and Available Officers
  const [officerWorkloads, setOfficerWorkloads] = useState<any[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Assign Officer Modal State
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  // Resolution verification workflow state
  const [verifyingComplaint, setVerifyingComplaint] = useState<Complaint | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState('');

  // Officers Form & Modal state
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<User | null>(null);
  const [officerForm, setOfficerForm] = useState({ name: '', email: '', phone: '', department: '', password: '' });

  // Departments Form & Modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', head: '' });

  // Categories Form & Modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Announcements Form & Modal state
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchAdminData();
    fetchMetadataAndAdminTables();
  }, []);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('civicflow_token')}` }
  });

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch complaints list
      const compRes = await axios.get('/api/admin/complaints', getHeaders());
      setComplaints(compRes.data.complaints || []);

      // 2. Fetch statistics and counts
      const statsRes = await axios.get('/api/dashboard/stats', getHeaders());
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching admin workspace metrics:', err);
      toast.error('Failed to compile administrative metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadataAndAdminTables = async () => {
    try {
      const config = getHeaders();
      
      const deptRes = await axios.get('/api/admin/departments', config);
      setDepartments(deptRes.data.departments || []);

      const catRes = await axios.get('/api/admin/categories', config);
      setCategories(catRes.data.categories || []);

      const annRes = await axios.get('/api/admin/announcements', config);
      setAnnouncements(annRes.data.announcements || []);

      const userRes = await axios.get('/api/admin/users', config);
      setUsers(userRes.data.users || []);

      const officerRes = await axios.get('/api/admin/officers', config);
      setOfficers(officerRes.data.officers || []);

      const workloadRes = await axios.get('/api/officers/workload', config);
      setOfficerWorkloads(workloadRes.data.workload || []);

      const availableRes = await axios.get('/api/officers/available', config);
      setAvailableOfficers(availableRes.data.officers || []);
    } catch (err) {
      console.error('Error fetching administrative metadata matrices:', err);
    }
  };

  // ==========================================
  // DISPATCH & REASSIGNMENT WORKFLOWS
  // ==========================================

  const handleAssignOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningComplaint || !selectedOfficerId) return;

    const assignToast = toast.loading(assigningComplaint.officer_id ? 'Reassigning complaint...' : 'Filing officer dispatch assignment...');
    try {
      if (assigningComplaint.officer_id) {
         await axios.put(`/api/complaints/${assigningComplaint.id}/reassign`, {
           officerId: selectedOfficerId
         }, getHeaders());
      } else {
         await axios.put(`/api/complaints/${assigningComplaint.id}/assign`, {
           officerId: selectedOfficerId
         }, getHeaders());
      }

      toast.success(assigningComplaint.officer_id ? 'Officer reassigned successfully!' : 'Officer dispatched and assigned successfully!', { id: assignToast });
      setAssigningComplaint(null);
      setSelectedOfficerId('');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to assign officer.', { id: assignToast });
    }
  };

  // Verify and close resolved complaint
  const handleVerifyClose = async (complaintId: number) => {
    const actionToast = toast.loading('Verifying resolution & closing case...');
    try {
      await axios.put(`/api/admin/complaints/${complaintId}/verify-close`, {
        feedback: verificationFeedback || 'Resolution verified and closed by Administrator.'
      }, getHeaders());

      toast.success('Complaint verified and permanently closed!', { id: actionToast });
      setVerifyingComplaint(null);
      setVerificationFeedback('');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to verify and close case.', { id: actionToast });
    }
  };

  // Reject resolution and reassign with rework instructions
  const handleReassignRework = async (complaintId: number) => {
    if (!verificationFeedback.trim()) {
      toast.error('Feedback instructions are required for rework reassignment.');
      return;
    }

    const actionToast = toast.loading('Reassigning complaint for rework...');
    try {
      await axios.put(`/api/admin/complaints/${complaintId}/reassign`, {
        feedback: verificationFeedback,
        officerId: verifyingComplaint?.officer_id
      }, getHeaders());

      toast.success('Complaint sent back to officer for correction.', { id: actionToast });
      setVerifyingComplaint(null);
      setVerificationFeedback('');
      setIsReassigning(false);
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to reassign complaint.', { id: actionToast });
    }
  };

  // ==========================================
  // OFFICERS CRUD ACTIONS
  // ==========================================

  const openAddOfficer = () => {
    setEditingOfficer(null);
    setOfficerForm({ name: '', email: '', phone: '', department: '', password: '' });
    setShowOfficerModal(true);
  };

  const openEditOfficer = (officer: User) => {
    setEditingOfficer(officer);
    setOfficerForm({
      name: officer.name,
      email: officer.email,
      phone: officer.phone || '',
      department: officer.department || '',
      password: '' // Keep empty to preserve
    });
    setShowOfficerModal(true);
  };

  const handleOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadToast = toast.loading(editingOfficer ? 'Updating profile...' : 'Provisioning Officer account...');
    try {
      if (editingOfficer) {
        await axios.put(`/api/admin/officers/${editingOfficer.id}`, {
          name: officerForm.name,
          email: officerForm.email,
          phone: officerForm.phone,
          department: officerForm.department
        }, getHeaders());
        toast.success('Officer updated successfully!', { id: loadToast });
      } else {
        await axios.post('/api/admin/officers', officerForm, getHeaders());
        toast.success('Officer account provisioned successfully!', { id: loadToast });
      }
      setShowOfficerModal(false);
      fetchMetadataAndAdminTables();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error occurred.', { id: loadToast });
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    const loadToast = toast.loading(`Updating status to ${status}...`);
    try {
      const res = await axios.put(`/api/admin/users/${userId}/toggle-status`, { status }, getHeaders());
      toast.success(res.data.message, { id: loadToast });
      fetchMetadataAndAdminTables();
    } catch (err) {
      toast.error('Failed to update user status.', { id: loadToast });
    }
  };

  const toggleUserActivation = async (userId: number) => {
    const loadToast = toast.loading('Toggling user state...');
    try {
      const res = await axios.put(`/api/admin/users/${userId}/toggle-status`, {}, getHeaders());
      toast.success(res.data.message, { id: loadToast });
      fetchMetadataAndAdminTables();
    } catch (err) {
      toast.error('Failed to change user state.', { id: loadToast });
    }
  };

  // ==========================================
  // DEPARTMENTS CRUD ACTIONS
  // ==========================================

  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', head: '' });
    setShowDeptModal(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, head: dept.head });
    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadToast = toast.loading('Saving department settings...');
    try {
      if (editingDept) {
        await axios.put(`/api/admin/departments/${editingDept.id}`, deptForm, getHeaders());
        toast.success('Department updated successfully!', { id: loadToast });
      } else {
        await axios.post('/api/admin/departments', deptForm, getHeaders());
        toast.success('Department created successfully!', { id: loadToast });
      }
      setShowDeptModal(false);
      fetchMetadataAndAdminTables();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving department.', { id: loadToast });
    }
  };

  const deleteDept = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    const loadToast = toast.loading('Deleting department...');
    try {
      await axios.delete(`/api/admin/departments/${id}`, getHeaders());
      toast.success('Department deleted successfully!', { id: loadToast });
      fetchMetadataAndAdminTables();
    } catch (err) {
      toast.error('Failed to delete department.', { id: loadToast });
    }
  };

  // ==========================================
  // CATEGORIES CRUD ACTIONS
  // ==========================================

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', description: '' });
    setShowCatModal(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description });
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadToast = toast.loading('Saving category settings...');
    try {
      if (editingCat) {
        await axios.put(`/api/admin/categories/${editingCat.id}`, catForm, getHeaders());
        toast.success('Category updated successfully!', { id: loadToast });
      } else {
        await axios.post('/api/admin/categories', catForm, getHeaders());
        toast.success('Category created successfully!', { id: loadToast });
      }
      setShowCatModal(false);
      fetchMetadataAndAdminTables();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving category.', { id: loadToast });
    }
  };

  const deleteCat = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    const loadToast = toast.loading('Deleting category...');
    try {
      await axios.delete(`/api/admin/categories/${id}`, getHeaders());
      toast.success('Category deleted successfully!', { id: loadToast });
      fetchMetadataAndAdminTables();
    } catch (err) {
      toast.error('Failed to delete category.', { id: loadToast });
    }
  };

  // ==========================================
  // ANNOUNCEMENTS BROADCAST ACTIONS
  // ==========================================

  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) {
      toast.error('Please specify both title and content for broadcasting.');
      return;
    }

    const loadToast = toast.loading('Broadcasting announcements and notifications...');
    try {
      await axios.post('/api/admin/announcements', annForm, getHeaders());
      toast.success('Broadcasting successfully completed!', { id: loadToast });
      setShowAnnModal(false);
      setAnnForm({ title: '', content: '' });
      fetchMetadataAndAdminTables();
    } catch (err) {
      toast.error('Failed to broadcast announcement.', { id: loadToast });
    }
  };

  // ==========================================
  // HELPERS & VISUAL STYLING
  // ==========================================

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tracking ID,Title,Category,Priority,Status,Location,Date Registered\n';
    
    complaints.forEach(c => {
      csvContent += `"${c.tracking_id}","${c.title}","${c.category}","${c.priority}","${c.status}","${c.location_name || 'N/A'}","${new Date(c.created_at).toLocaleDateString()}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CivicFlow_Complaints_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Complaints CSV report downloaded successfully.');
  };

  const categoryChartData = {
    labels: stats?.categoryDistribution?.map((c: any) => c.category) || [],
    datasets: [
      {
        label: 'Issues',
        data: stats?.categoryDistribution?.map((c: any) => c.count) || [],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'],
        borderWidth: 0,
      }
    ]
  };

  const monthlyTrendData = {
    labels: stats?.monthlyDistribution?.map((m: any) => m.month) || [],
    datasets: [
      {
        label: 'Complaints',
        data: stats?.monthlyDistribution?.map((m: any) => m.count) || [],
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }
    ]
  };

  const departmentChartData = {
    labels: stats?.departmentPerformance?.map((d: any) => d.department) || [],
    datasets: [
      {
        label: 'Resolved',
        data: stats?.departmentPerformance?.map((d: any) => d.resolved) || [],
        backgroundColor: '#10b981',
        borderRadius: 4
      },
      {
        label: 'Pending',
        data: stats?.departmentPerformance?.map((d: any) => d.pending) || [],
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }
    ]
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch =
      c.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

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
    <div className="min-h-screen bg-[#f8fafc] flex font-sans" id="admin_dashboard">
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#0f172a] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 shadow-lg" id="sidebar">
        <div className="p-8 pb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none font-display">CivicFlow</h1>
          <p className="text-[10px] opacity-70 uppercase tracking-widest mt-2 font-mono font-bold text-[#38bdf8]">System Administration</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'overview' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'complaints' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Complaints Dispatch & Verify</span>
          </button>

          <button
            onClick={() => setActiveTab('officers')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'officers' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Officer CRUD Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'departments' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manage Departments</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'categories' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configure Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'announcements' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Broadcast Announcements</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'heatmap' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Heatmap Cluster Plotter</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full text-left px-5 py-2.5 rounded-xl flex items-center gap-3 text-xs transition-all cursor-pointer font-bold ${
              activeTab === 'reports' ? 'bg-[#1d4ed8] text-white shadow-md border-l-4 border-[#38bdf8]' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audits & Exports</span>
          </button>
        </nav>

        {/* Sidebar Profile Card */}
        <div className="p-6 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase border border-slate-600">
              {user?.name?.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate leading-none">{user?.name}</span>
              <span className="text-[9px] font-mono text-[#38bdf8] bg-slate-900/40 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">ADMINISTRATOR</span>
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

      {/* Main Panel Content Area */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
            <span className="font-display font-bold text-sm text-slate-900 tracking-tight">
              {activeTab.toUpperCase()} PANEL
            </span>
            <span className="text-slate-300">/</span>
            <span>Admin Control Panel</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Role Auth: OK
            </span>
          </div>
        </header>

        <main className="p-8 flex-grow space-y-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in" id="panel_overview">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Complaints</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats?.stats?.total || 0}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Pending Issues</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-amber-600 tracking-tight">{(stats?.stats?.submitted || 0) + (stats?.stats?.assigned || 0) + (stats?.stats?.inProgress || 0)}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Resolved Cases</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{(stats?.stats?.resolved || 0) + (stats?.stats?.closed || 0)}</span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Avg Resolution Time</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-blue-400 tracking-tight">{stats?.averageResolutionTime || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider font-mono">Citizen Satisfaction</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-extrabold text-white tracking-tight">{stats?.citizenSatisfaction || 0}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-2">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                    <span>Monthly Complaints Trend</span>
                  </h3>
                  <div className="h-64">
                    <Bar data={monthlyTrendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                </div>

                {/* Categories Pie */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                    Issue Categories
                  </h3>
                  <div className="h-64 flex justify-center">
                    <Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Performance */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                    Department Performance
                  </h3>
                  <div className="h-64">
                    <Bar data={departmentChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>

                {/* Officer Leaderboard */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                    Top Officer Performance
                  </h3>
                  <div className="overflow-y-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Officer</th>
                          <th className="p-3 text-center">Assigned</th>
                          <th className="p-3 text-center">Resolved</th>
                          <th className="p-3 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats?.officerPerformance?.sort((a: any, b: any) => b.rate - a.rate).map((o: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-800">{o.name} <br/><span className="text-[10px] text-slate-400 font-normal">{o.department}</span></td>
                            <td className="p-3 text-center text-slate-600">{o.assigned}</td>
                            <td className="p-3 text-center text-slate-600">{o.resolved}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{o.rate}%</td>
                          </tr>
                        ))}
                        {(!stats?.officerPerformance || stats.officerPerformance.length === 0) && (
                          <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">No active officers with cases.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Live Geospatial Heatmap Overview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-red-600 animate-pulse" />
                    <span>Live Incident Heatmap (Mini)</span>
                  </div>
                  <button onClick={() => setActiveTab('heatmap')} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 font-mono tracking-wider">EXPAND FULL &rarr;</button>
                </h3>
                <div className="h-[250px] bg-slate-950 rounded-lg relative overflow-hidden border border-slate-800 p-2 shadow-inner w-full">
                  <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px]"></div>
                  <div className="absolute inset-0 z-15">
                    {stats?.heatmap?.map((pt: any, idx: number) => {
                      const seedX = (idx * 17) % 80 + 10;
                      const seedY = (idx * 23) % 70 + 15;
                      return (
                        <div key={pt.tracking_id} style={{ left: `${seedX}%`, top: `${seedY}%` }} className="absolute group">
                          <span className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full opacity-40 animate-ping ${pt.priority === 'Critical' ? 'bg-red-500' : pt.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                          <span className={`w-3.5 h-3.5 rounded-full border-2 border-white block shadow-md ${pt.priority === 'Critical' ? 'bg-red-600' : pt.priority === 'High' ? 'bg-orange-600' : 'bg-blue-600'}`}></span>
                          <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 w-32 bg-slate-900/95 border border-slate-700 text-[10px] rounded p-2 text-white z-50 text-center pointer-events-none">
                            <strong>{pt.title}</strong><br/>{pt.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLAINTS VERIFY, DISPATCH, REASSIGN */}
          {activeTab === 'complaints' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_complaints">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Case Resolution and Dispatch Control</h3>
                  <p className="text-xs text-slate-400">Dispatch new complaints or audit/verify resolved officer cases.</p>
                </div>
                <button onClick={fetchAdminData} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search complaint text..."
                    className="w-full border border-slate-200 rounded-lg text-xs pl-8 pr-3 py-2.5 focus:outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted">Submitted (Pending Assignment)</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved (Needs verification)</option>
                    <option value="Closed">Closed Cases</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-mono text-slate-500 uppercase">
                      <th className="p-3">Case ID</th>
                      <th className="p-3">Complaint Info</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assignee</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredComplaints.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-950">{c.tracking_id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{c.title}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Reporter ID: {c.citizen_name || 'Anonymous citizen'}</div>
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono">{c.category}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getStatusBadge(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.officer_name ? (
                            <div>
                              <p className="font-bold">{c.officer_name}</p>
                              <p className="text-[10px] text-slate-400">{c.officer_department} Div</p>
                            </div>
                          ) : (
                            <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">Pending Assignment</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {c.status === 'Resolved' && (
                            <button
                              onClick={() => {
                                setVerifyingComplaint(c);
                                setVerificationFeedback('');
                                setIsReassigning(false);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-2xs"
                            >
                              Verify / Audit
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setAssigningComplaint(c);
                              setSelectedOfficerId(c.officer_id?.toString() || '');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-2xs"
                          >
                            {c.officer_id ? 'Reassign' : 'Dispatch'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICERS ACCOUNT CRUD PANEL */}
          {activeTab === 'officers' && (
            <div className="space-y-8" id="panel_officers">
              {/* 1. Pending Officer Requests */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending Officer Approval Requests
                  </h3>
                  <p className="text-xs text-slate-400">Applications submitted by new Officers awaiting administrative authorization.</p>
                </div>

                {officers.filter(off => off.status === 'PENDING').length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg">No pending officer applications found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {officers.filter(off => off.status === 'PENDING').map(off => (
                      <div key={off.id} className="border border-amber-200 bg-amber-50/20 p-5 rounded-xl flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 text-sm">{off.name}</h4>
                          <p className="text-xs text-slate-500 font-mono">{off.email}</p>
                          <p className="text-xs text-slate-500">Dept: <strong className="text-blue-700">{off.department || 'General'}</strong></p>
                          {off.phone && <p className="text-xs text-slate-400 font-mono">Tel: {off.phone}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => updateUserStatus(off.id, 'ACTIVE')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow-2xs flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => updateUserStatus(off.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow-2xs flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Verified Active Officers */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Verified Municipal Officers List</h3>
                    <p className="text-xs text-slate-400">Active municipal engineers currently dispatched to resolve issues.</p>
                  </div>
                  <button
                    onClick={openAddOfficer}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5"
                    id="btn_add_officer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Provision New Officer</span>
                  </button>
                </div>

                {officers.filter(off => off.status === 'ACTIVE' || off.status === undefined).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No active officers provisioned.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {officers.filter(off => off.status === 'ACTIVE' || off.status === undefined).map(off => (
                      <div key={off.id} className="border border-slate-200 p-5 rounded-xl bg-slate-50/50 flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{off.name}</h4>
                            {off.is_active === 0 && (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold font-mono">DEACTIVATED</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono">{off.email}</p>
                          <p className="text-xs text-slate-500">Div: <strong>{off.department || 'General'}</strong></p>
                          {off.phone && <p className="text-xs text-slate-400 font-mono">Tel: {off.phone}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openEditOfficer(off)}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] py-1.5 px-3 rounded shadow-2xs"
                          >
                            <Edit className="w-3 h-3 inline-block mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => updateUserStatus(off.id, 'SUSPENDED')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow-2xs flex items-center justify-center gap-1"
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2b. Officer Workload Tracking */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Officer Workload Monitor</h3>
                    <p className="text-xs text-slate-400">Live tracker of active complaints assigned to each officer.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Officer Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4 text-center">Active Workload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {officerWorkloads.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{w.name}</div>
                          </td>
                          <td className="py-3 px-4">{w.department}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${w.activeWorkload > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {w.activeWorkload} Cases
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Global Users Management */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">System Users Directory (Citizens & Accounts)</h3>
                  <p className="text-xs text-slate-400">Audit registered citizens, suspended users, and general accounts.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              u.role === 'Administrator' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'Officer' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                              u.status === 'PENDING' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                              u.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.status || (u.is_active === 0 ? 'SUSPENDED' : 'ACTIVE')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {u.role !== 'Administrator' && (
                              <>
                                {(u.status === 'SUSPENDED' || u.status === 'REJECTED') ? (
                                  <button
                                    onClick={() => updateUserStatus(u.id, 'ACTIVE')}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] py-1 px-2.5 rounded transition-all"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateUserStatus(u.id, 'SUSPENDED')}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] py-1 px-2.5 rounded transition-all"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEPARTMENTS MANAGEMENT */}
          {activeTab === 'departments' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_departments">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Municipal Departments Office</h3>
                  <p className="text-xs text-slate-400">Maintain executive department divisions.</p>
                </div>
                <button
                  onClick={openAddDept}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Department</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div key={dept.id} className="border border-slate-200 p-5 rounded-xl bg-white space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{dept.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Head: <strong>{dept.head}</strong></p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">STATUS: ACTIVE</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEditDept(dept)}
                          className="p-1.5 border border-slate-200 text-slate-500 rounded hover:bg-slate-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDept(dept.id)}
                          className="p-1.5 border border-red-100 text-red-500 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CATEGORIES CONFIGURATION */}
          {activeTab === 'categories' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_categories">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Complaint Category Configuration</h3>
                  <p className="text-xs text-slate-400">Configure visual category descriptors in public complaint filings.</p>
                </div>
                <button
                  onClick={openAddCat}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(cat => (
                  <div key={cat.id} className="border border-slate-200 p-5 rounded-xl bg-white space-y-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{cat.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{cat.description || 'No description designated.'}</p>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
                      <button
                        onClick={() => openEditCat(cat)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteCat(cat.id)}
                        className="text-[10px] font-bold text-red-600 hover:text-red-900 inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 py-1 px-2.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: BROADCAST ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_announcements">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Announcement Hub & Notification Broadcast</h3>
                  <p className="text-xs text-slate-400">Broadcast important bulletins, weather alerts, or system maintenance alerts directly onto user profiles.</p>
                </div>
                <button
                  onClick={() => {
                    setAnnForm({ title: '', content: '' });
                    setShowAnnModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5"
                  id="btn_broadcast"
                >
                  <Plus className="w-4 h-4" />
                  <span>Broadcast Bulletin</span>
                </button>
              </div>

              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No announcements broadcasted yet.</p>
                ) : (
                  announcements.map(ann => (
                    <div key={ann.id} className="border border-slate-100 p-5 rounded-xl bg-blue-50/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-blue-900 text-xs">{ann.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(ann.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wide">Issued By: {ann.created_by}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_heatmap">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-1 text-red-600 animate-pulse" />
                  <span>Geospatial Issue Density Plotter</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Visualizing municipal complaints density with strict privacy and GDPR-certified location masking.
                </p>
              </div>

              <div className="aspect-video bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 p-4 flex flex-col justify-between shadow-inner">
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px]"></div>
                <div className="text-[10px] text-slate-500 font-mono z-10 uppercase tracking-widest">
                  Live Coordinates Tracking Screen
                </div>

                <div className="absolute inset-0 z-15">
                  {stats?.heatmap?.map((pt: any, idx: number) => {
                    const seedX = (idx * 17) % 80 + 10;
                    const seedY = (idx * 23) % 70 + 15;

                    return (
                      <div
                        key={pt.tracking_id}
                        style={{ left: `${seedX}%`, top: `${seedY}%` }}
                        className="absolute group"
                      >
                        <span className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full opacity-40 animate-ping ${pt.priority === 'Critical' ? 'bg-red-500' : pt.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 border-white block cursor-pointer shadow-md ${pt.priority === 'Critical' ? 'bg-red-600' : pt.priority === 'High' ? 'bg-orange-600' : 'bg-blue-600'}`}></span>

                        <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700 text-[10px] rounded p-2.5 text-white z-50 space-y-1 shadow-xl leading-normal">
                          <div className="font-mono font-bold text-blue-400">{pt.tracking_id}</div>
                          <div className="font-bold">{pt.title}</div>
                          <div>Category: {pt.category}</div>
                          <div className="flex justify-between pt-1 border-t border-slate-800">
                            <span>Severity: <strong className={pt.priority === 'Critical' ? 'text-red-400' : 'text-orange-400'}>{pt.priority}</strong></span>
                            <span>State: {pt.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] text-slate-500 font-mono z-10 flex justify-between border-t border-slate-900 pt-2 bg-slate-950/80">
                  <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block"></span> <span>Critical Issues</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-orange-600 rounded-full inline-block"></span> <span>High Severity</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full inline-block"></span> <span>Normal Severity</span></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDITS & EXPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6" id="panel_reports">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">System Reports Core</h3>
                  <p className="text-xs text-slate-400">Download system data, audit matrices, and complaint reports.</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
                  id="btn_export"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV Ledger</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3.5">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 text-xs">Compliance Protocols</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This module compiles raw telemetry logs on civic complaints and is strictly audited under state guidelines. All data represents masked records to safeguard reporter privacy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==========================================
          MODALS & FORM DRAWERS
          ========================================== */}

      {/* 1. DISPATCH / REASSIGN COMPLAINT MODAL */}
      {assigningComplaint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="modal_dispatch">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">DISPATCH OFFICER ASSIGNMENT</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{assigningComplaint.tracking_id}</h4>
              </div>
              <button onClick={() => setAssigningComplaint(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAssignOfficerSubmit} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Complaint Title</span>
                <p className="font-bold text-slate-800 leading-normal">{assigningComplaint.title}</p>
                <p className="text-slate-500">Category: {assigningComplaint.category} | Location: {assigningComplaint.location_name || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Select Field Officer *</label>
                <select
                  required
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Choose an Officer...</option>
                  {availableOfficers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} - {o.department} Works Div (Active Workload: {o.activeWorkload})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningComplaint(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-all shadow-sm"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RESOLUTION VERIFICATION & AUDIT MODAL */}
      {verifyingComplaint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="modal_audit">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">CASE RESOLUTION AUDIT</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{verifyingComplaint.tracking_id}</h4>
              </div>
              <button onClick={() => setVerifyingComplaint(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900">Officer: {verifyingComplaint.officer_name || 'Unassigned'}</p>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Officer Resolution Notes:</span>
                  <p className="text-slate-700 italic mt-0.5 leading-relaxed bg-white border border-slate-100 p-2 rounded">{verifyingComplaint.resolution_notes || 'No notes submitted.'}</p>
                </div>
                {verifyingComplaint.resolution_image && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Uploaded Proof of Work:</span>
                    <img src={verifyingComplaint.resolution_image} alt="Proof" className="w-full h-32 object-cover rounded-lg border mt-1 border-slate-200 shadow-2xs" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Feedback & Case Audit Notes *</label>
                <textarea
                  rows={3}
                  value={verificationFeedback}
                  onChange={(e) => setVerificationFeedback(e.target.value)}
                  placeholder="Provide closing audit summary or rework instructions..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleReassignRework(verifyingComplaint.id!)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-4 rounded-lg flex items-center space-x-1 transition-all"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Reject & Rework</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyingComplaint(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyClose(verifyingComplaint.id!)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-1 shadow-sm transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify & Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROVISION / EDIT OFFICER MODAL */}
      {showOfficerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="modal_officer_crud">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-900 text-sm">
                {editingOfficer ? 'Modify Officer Details' : 'Provision New Officer Account'}
              </h4>
              <button onClick={() => setShowOfficerModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleOfficerSubmit} className="p-5 space-y-3 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Full Name *</label>
                <input
                  type="text"
                  required
                  value={officerForm.name}
                  onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })}
                  placeholder="Officer Rajesh Kumar"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Email Address (Google Account preferred) *</label>
                <input
                  type="email"
                  required
                  value={officerForm.email}
                  onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                  placeholder="rajesh.water@gov.in"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Works Department Division *</label>
                <select
                  required
                  value={officerForm.department}
                  onChange={(e) => setOfficerForm({ ...officerForm, department: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Division...</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name} Division</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Telephone Contact</label>
                <input
                  type="text"
                  value={officerForm.phone}
                  onChange={(e) => setOfficerForm({ ...officerForm, phone: e.target.value })}
                  placeholder="+91 98765 43211"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {!editingOfficer && (
                <div className="space-y-1">
                  <label className="font-semibold block text-slate-600">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={officerForm.password}
                    onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                    placeholder="password123"
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOfficerModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm"
                >
                  {editingOfficer ? 'Update Profile' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CREATE / EDIT DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingDept ? 'Edit Department Office' : 'Create New Department Office'}
              </h4>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleDeptSubmit} className="p-5 space-y-3 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Sanitation, Drainage"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Head Executive *</label>
                <input
                  type="text"
                  required
                  value={deptForm.head}
                  onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })}
                  placeholder="Shri. Rajesh Kumar"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE / EDIT CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingCat ? 'Edit Complaint Category' : 'Configure Complaint Category'}
              </h4>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCatSubmit} className="p-5 space-y-3 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Category Label *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Roads & Highways"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Description Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Pipeline leaks, public sewage overflowing, broken gutters..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. BROADCAST ANNOUNCEMENT MODAL */}
      {showAnnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">Broadcast Announcement</h4>
              <button onClick={() => setShowAnnModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAnnSubmit} className="p-5 space-y-3 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Bulletin Title *</label>
                <input
                  type="text"
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="e.g. Scheduled Power Outage"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-slate-600">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  placeholder="Specify timeline, affected blocks, and alternative service helplines..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm"
                >
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
