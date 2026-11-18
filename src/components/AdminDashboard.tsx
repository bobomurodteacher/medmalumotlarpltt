import React, { useState, useMemo } from 'react';
import { MedicalWorkerSubmission, AppConfig } from '../types';
import {
  exportToExcel,
  exportToCSV,
  parseSubmissionsFromSpreadsheetFile
} from '../services/storageService';
import { cyrillicToLatin } from '../utils/transliterate';
import {
  Users,
  Building,
  Briefcase,
  Search,
  Download,
  Trash2,
  Edit,
  Plus,
  ArrowLeft,
  KeyRound,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  Stethoscope,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  RefreshCw,
  Cloud,
  CloudUpload,
  Upload,
  Database
} from 'lucide-react';

interface AdminDashboardProps {
  submissions: MedicalWorkerSubmission[];
  config: AppConfig;
  onUpdateSubmission: (id: string, updated: Partial<MedicalWorkerSubmission>) => Promise<void> | void;
  onDeleteSubmission: (id: string) => Promise<void> | void;
  onDeleteMultipleSubmissions: (ids: string[]) => Promise<void> | void;
  onAddPosition: (pos: string) => void;
  onDeletePosition: (pos: string) => void;
  onClearAllPositions?: () => void;
  onAddWorkplace: (wp: string) => void;
  onDeleteWorkplace: (wp: string) => void;
  onClearAllWorkplaces?: () => void;
  onChangePassword: (newPass: string) => void;
  onBackToForm: () => void;
  onForceSyncFromCloud?: () => Promise<void>;
  onPushAllToCloud?: () => Promise<void>;
  onImportSubmissions?: (
    items: Partial<MedicalWorkerSubmission>[],
    positions: string[],
    workplaces: string[]
  ) => Promise<{ upsertedCount: number; skippedCount: number }>;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  submissions,
  config,
  onUpdateSubmission,
  onDeleteSubmission,
  onDeleteMultipleSubmissions,
  onAddPosition,
  onDeletePosition,
  onClearAllPositions,
  onAddWorkplace,
  onDeleteWorkplace,
  onClearAllWorkplaces,
  onChangePassword,
  onBackToForm,
  onForceSyncFromCloud,
  onPushAllToCloud,
  onImportSubmissions
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'workplaces' | 'positions' | 'security'>('submissions');
  const [isSyncing, setIsSyncing] = useState(false);

  // Excel / CSV Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Submissions search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('');
  const [selectedWorkplaceFilter, setSelectedWorkplaceFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Editing state
  const [editingItem, setEditingItem] = useState<MedicalWorkerSubmission | null>(null);

  // New item inputs & messages
  const [newWorkplaceInput, setNewWorkplaceInput] = useState('');
  const [workplaceMessage, setWorkplaceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newPositionInput, setNewPositionInput] = useState('');
  const [positionMessage, setPositionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  // Custom Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Custom In-App Confirmation Modal (Works 100% reliably in iFrames without window.confirm)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmButtonText: "O'chirish",
    isDestructive: true,
    onConfirm: () => {}
  });

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.jshshir.includes(q) ||
        item.passport.toLowerCase().includes(q) ||
        item.workplace.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.phoneNumber && item.phoneNumber.includes(q));

      const matchesPos = !selectedPositionFilter || item.position === selectedPositionFilter;
      const matchesWp = !selectedWorkplaceFilter || item.workplace === selectedWorkplaceFilter;

      return matchesSearch && matchesPos && matchesWp;
    });
  }, [submissions, searchQuery, selectedPositionFilter, selectedWorkplaceFilter]);

  // Bulk select handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubmissions.map((s) => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportExcel = () => {
    const listToExport =
      selectedIds.length > 0
        ? submissions.filter((s) => selectedIds.includes(s.id))
        : filteredSubmissions;
    exportToExcel(listToExport);
    showToast(`${listToExport.length} ta ma'lumot Excelga yuklandi`);
  };

  const handleExportCSV = () => {
    const listToExport =
      selectedIds.length > 0
        ? submissions.filter((s) => selectedIds.includes(s.id))
        : filteredSubmissions;
    exportToCSV(listToExport);
    showToast(`${listToExport.length} ta ma'lumot CSV ga yuklandi`);
  };

  const handleSyncCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onForceSyncFromCloud) {
        await onForceSyncFromCloud();
      }
      showToast("Neon bazasi bilan ma'lumotlar to'liq sinxronlashtirildi!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sinxronlashda xatolik yuz berdi";
      showToast(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onPushAllToCloud) {
        await onPushAllToCloud();
      }
      showToast("Barcha lavozim, ish joyi va xodimlar Neon bazasiga yuklandi!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bazaga yuklashda xatolik yuz berdi";
      showToast(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    setIsImporting(true);
    try {
      const parsed = await parseSubmissionsFromSpreadsheetFile(file);
      if (parsed.items.length === 0) {
        setImportStatus({
          type: 'error',
          text: "Faylda mos keladigan xodim yozuvlari topilmadi (Familya Ismi, Lavozimi, Ish joyi, Passport va 14 xonali JSHSHIR ustunlari bo'lishi kerak)."
        });
        return;
      }
      if (onImportSubmissions) {
        const res = await onImportSubmissions(parsed.items, parsed.positions, parsed.workplaces);
        setImportStatus({
          type: 'success',
          text: `${res.upsertedCount} ta xodim Neon bazasiga muvaffaqiyatli ko'chirildi! (${parsed.positions.length} ta lavozim, ${parsed.workplaces.length} ta ish joyi biriktirildi)`
        });
        showToast(`${res.upsertedCount} ta xodim Neon bazasiga yuklandi!`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Faylni o'qishda xatolik yuz berdi";
      setImportStatus({ type: 'error', text: msg });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // Delete handlers using Custom Modal (100% reliable)
  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setConfirmModal({
      isOpen: true,
      title: "Xodimlarni o'chirish",
      message: `Tanlangan ${count} ta xodim ma'lumotlarini butunlay o'chirishni tasdiqlaysizmi?`,
      confirmButtonText: "Ha, barchasini o'chirish",
      isDestructive: true,
      onConfirm: () => {
        onDeleteMultipleSubmissions(selectedIds);
        setSelectedIds([]);
        closeConfirmModal();
        showToast(`${count} ta xodim ma'lumotlari muvaffaqiyatli o'chirildi!`);
      }
    });
  };

  const triggerDeleteSingle = (sub: MedicalWorkerSubmission) => {
    setConfirmModal({
      isOpen: true,
      title: "Xodimni o'chirish",
      message: `"${sub.fullName}" (${sub.id}) ma'lumotlarini o'chirishni tasdiqlaysizmi?`,
      confirmButtonText: "Ha, o'chirish",
      isDestructive: true,
      onConfirm: () => {
        onDeleteSubmission(sub.id);
        setSelectedIds((prev) => prev.filter((id) => id !== sub.id));
        closeConfirmModal();
        showToast(`"${sub.fullName}" ma'lumotlari o'chirildi!`);
      }
    });
  };

  // Add workplace handler
  const handleCreateWorkplace = (e: React.FormEvent) => {
    e.preventDefault();
    const val = cyrillicToLatin(newWorkplaceInput.trim());
    if (!val) {
      setWorkplaceMessage({ type: 'error', text: 'Iltimos, ish joyi nomini kiriting!' });
      return;
    }
    if (config.workplaces.some((w) => w.toLowerCase() === val.toLowerCase())) {
      setWorkplaceMessage({ type: 'error', text: `"${val}" ish joyi allaqachon mavjud!` });
      return;
    }
    onAddWorkplace(val);
    setNewWorkplaceInput('');
    setWorkplaceMessage({ type: 'success', text: `"${val}" muvaffaqiyatli qo'shildi!` });
    showToast(`"${val}" ish joyi qo'shildi!`);
    setTimeout(() => setWorkplaceMessage(null), 3000);
  };

  // Delete workplace handler
  const triggerDeleteWorkplace = (wp: string) => {
    const workersCount = submissions.filter((s) => s.workplace === wp).length;
    setConfirmModal({
      isOpen: true,
      title: "Ish joyini o'chirish",
      message: `"${wp}" ish joyini ro'yxatdan o'chirishni tasdiqlaysizmi? ${
        workersCount > 0 ? `(${workersCount} ta xodim ushbu joyga biriktirilgan)` : ''
      }`,
      confirmButtonText: "Ha, o'chirish",
      isDestructive: true,
      onConfirm: () => {
        onDeleteWorkplace(wp);
        closeConfirmModal();
        showToast(`"${wp}" ish joyi o'chirildi!`);
      }
    });
  };

  // Add position handler
  const handleCreatePosition = (e: React.FormEvent) => {
    e.preventDefault();
    const val = cyrillicToLatin(newPositionInput.trim());
    if (!val) {
      setPositionMessage({ type: 'error', text: 'Iltimos, lavozim nomini kiriting!' });
      return;
    }
    if (config.positions.some((p) => p.toLowerCase() === val.toLowerCase())) {
      setPositionMessage({ type: 'error', text: `"${val}" lavozimi allaqachon mavjud!` });
      return;
    }
    onAddPosition(val);
    setNewPositionInput('');
    setPositionMessage({ type: 'success', text: `"${val}" muvaffaqiyatli qo'shildi!` });
    showToast(`"${val}" lavozimi qo'shildi!`);
    setTimeout(() => setPositionMessage(null), 3000);
  };

  // Delete position handler
  const triggerDeletePosition = (pos: string) => {
    const workersCount = submissions.filter((s) => s.position === pos).length;
    setConfirmModal({
      isOpen: true,
      title: "Lavozimni o'chirish",
      message: `"${pos}" lavozimini ro'yxatdan o'chirishni tasdiqlaysizmi? ${
        workersCount > 0 ? `(${workersCount} ta xodim bu lavozimga biriktirilgan)` : ''
      }`,
      confirmButtonText: "Ha, o'chirish",
      isDestructive: true,
      onConfirm: () => {
        onDeletePosition(pos);
        closeConfirmModal();
        showToast(`"${pos}" lavozimi o'chirildi!`);
      }
    });
  };

  // Clear all workplaces handler
  const triggerClearAllWorkplaces = () => {
    setConfirmModal({
      isOpen: true,
      title: "Barcha ish joylarini tozalash",
      message: "Barcha ish joylarini ro'yxatdan butunlay o'chirmoqchimisiz? Faqat siz yangidan kiritgan ish joylari saqlanadi.",
      confirmButtonText: "Ha, barchasini tozalash",
      isDestructive: true,
      onConfirm: () => {
        if (onClearAllWorkplaces) {
          onClearAllWorkplaces();
        }
        closeConfirmModal();
        showToast("Barcha ish joylari tozalandi!");
      }
    });
  };

  // Clear all positions handler
  const triggerClearAllPositions = () => {
    setConfirmModal({
      isOpen: true,
      title: "Barcha lavozimlarni tozalash",
      message: "Barcha lavozimlarni ro'yxatdan butunlay o'chirmoqchimisiz? Faqat siz yangidan kiritgan lavozimlar saqlanadi.",
      confirmButtonText: "Ha, barchasini tozalash",
      isDestructive: true,
      onConfirm: () => {
        if (onClearAllPositions) {
          onClearAllPositions();
        }
        closeConfirmModal();
        showToast("Barcha lavozimlar tozalandi!");
      }
    });
  };

  // Change password handler
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newPasswordInput.trim();
    if (!val) return;
    onChangePassword(val);
    setNewPasswordInput('');
    setPasswordChangeSuccess(true);
    showToast("Admin paroli muvaffaqiyatli yangilandi!");
    setTimeout(() => setPasswordChangeSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Global Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 border border-teal-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-slate-900/90 border-b border-teal-500/20 backdrop-blur-xl sticky top-0 z-30 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-0 sm:h-16 gap-2 sm:gap-0">
            <div className="flex items-center justify-between sm:justify-start space-x-3">
              <button
                id="btn-back-to-form"
                onClick={onBackToForm}
                className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center space-x-1.5 text-xs font-semibold border border-slate-800 hover:border-slate-700 cursor-pointer"
                title="Foydalanuvchi formasiga qaytish"
              >
                <ArrowLeft className="w-4 h-4 text-teal-400" />
                <span>Formaga qaytish</span>
              </button>
              <div className="h-5 w-px bg-slate-800" />
              <h1 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Stethoscope className="w-4 h-4" />
                </span>
                <span>Admin</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 font-bold">
                  {submissions.length} xodim
                </span>
              </h1>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 bg-slate-950 p-1 rounded-xl text-xs font-semibold overflow-x-auto border border-slate-800">
              <button
                id="tab-submissions"
                onClick={() => setActiveTab('submissions')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'submissions'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ma'lumotlar ({submissions.length})</span>
              </button>

              <button
                id="tab-workplaces"
                onClick={() => setActiveTab('workplaces')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'workplaces'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Ish joylari ({config.workplaces.length})</span>
              </button>

              <button
                id="tab-positions"
                onClick={() => setActiveTab('positions')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'positions'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Lavozimlar ({config.positions.length})</span>
              </button>

              <button
                id="tab-security"
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Parol</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* TAB 1: SUBMISSIONS LIST */}
        {activeTab === 'submissions' && (
          <div className="space-y-5">
            {/* Filter & Export Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg shadow-black/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="lg:col-span-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4 text-teal-400" />
                  </div>
                  <input
                    id="admin-search"
                    type="text"
                    placeholder="Ism, JSHSHIR, Passport, Telefon orqali qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter: Lavozim */}
                <div>
                  <select
                    id="admin-filter-pos"
                    value={selectedPositionFilter}
                    onChange={(e) => setSelectedPositionFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Barcha lavozimlar</option>
                    {config.positions.map((p) => (
                      <option key={p} value={p} className="bg-slate-900">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter: Ish joyi */}
                <div>
                  <select
                    id="admin-filter-wp"
                    value={selectedWorkplaceFilter}
                    onChange={(e) => setSelectedWorkplaceFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Barcha ish joylari</option>
                    {config.workplaces.map((w) => (
                      <option key={w} value={w} className="bg-slate-900">
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions & Export Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">
                    Ko'rsatilmoqda: <strong className="text-teal-300">{filteredSubmissions.length}</strong> / {submissions.length}
                  </span>
                  {(searchQuery || selectedPositionFilter || selectedWorkplaceFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedPositionFilter('');
                        setSelectedWorkplaceFilter('');
                      }}
                      className="text-teal-400 hover:text-teal-300 hover:underline font-semibold cursor-pointer"
                    >
                      Filtrni tozalash
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-sync-cloud-admin"
                    onClick={handleSyncCloud}
                    disabled={isSyncing}
                    className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold transition border border-teal-500/30 cursor-pointer text-xs"
                    title="Neon PostgreSQL bazasidan barcha ma'lumotlarni qayta yangilab olish"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-teal-400' : 'text-teal-400'}`} />
                    <span>{isSyncing ? 'Sinxronlanmoqda...' : 'Bazadan yangilash'}</span>
                  </button>

                  <button
                    id="btn-push-cloud-admin"
                    onClick={handlePushAllCloud}
                    disabled={isSyncing}
                    className="inline-flex items-center px-3 py-2 rounded-xl bg-teal-950/80 hover:bg-teal-900 text-teal-200 font-semibold transition border border-teal-500/40 cursor-pointer text-xs"
                    title="Barcha xodimlar, lavozimlar va ish joylarini Neon bazasiga saqlash"
                  >
                    <CloudUpload className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                    <span>Bazaga saqlash</span>
                  </button>

                  <button
                    id="btn-import-data-admin"
                    onClick={() => {
                      setImportStatus(null);
                      setIsImportModalOpen(true);
                    }}
                    className="inline-flex items-center px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 font-semibold transition border border-cyan-500/40 cursor-pointer text-xs"
                    title="Excel yoki CSV fayldan xodimlar ma'lumotlarini Neon bazasiga yuklash"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    <span>Excel / CSV Import</span>
                  </button>

                  <button
                    id="btn-export-excel-admin"
                    onClick={handleExportExcel}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer border border-teal-400/30"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                    Excelga yuklash {selectedIds.length > 0 && `(${selectedIds.length})`}
                  </button>

                  <button
                    id="btn-export-csv-admin"
                    onClick={handleExportCSV}
                    className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    CSV
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      id="btn-bulk-delete"
                      onClick={triggerBulkDelete}
                      className="inline-flex items-center px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-950/50 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Tanlanganlarni o'chirish ({selectedIds.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submissions Data Display: Mobile Cards (<md) + Desktop Table (>=md) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-sm text-slate-200">Hech qanday ma'lumot topilmadi</p>
                  <p className="text-xs mt-1 text-slate-400">Yangi xodim ma'lumotlari kiritilganda bu yerda ko'rinadi.</p>
                </div>
              ) : (
                <>
                  {/* MOBILE CARD VIEW (Visible on small screens < md) */}
                  <div className="block md:hidden divide-y divide-slate-800">
                    <div className="p-3 bg-slate-950/80 flex items-center justify-between border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <button
                        onClick={handleToggleSelectAll}
                        className="flex items-center space-x-2 text-slate-300 hover:text-white py-1 cursor-pointer"
                      >
                        {selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-teal-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>Barchasini tanlash ({filteredSubmissions.length})</span>
                      </button>
                    </div>

                    {filteredSubmissions.map((sub, index) => {
                      const isSelected = selectedIds.includes(sub.id);
                      return (
                        <div
                          key={sub.id}
                          className={`p-4 transition-colors space-y-2.5 ${
                            isSelected ? 'bg-teal-950/30' : 'bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5 min-w-0">
                              <button
                                onClick={() => handleToggleSelectOne(sub.id)}
                                className="mt-0.5 text-slate-400 hover:text-white cursor-pointer shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-teal-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[11px] font-mono font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded border border-teal-500/30">
                                    {sub.id}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono font-semibold">#{index + 1}</span>
                                </div>
                                <h4 className="text-sm font-bold text-white mt-1 leading-snug break-words">
                                  {sub.fullName}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                id={`edit-sub-m-${sub.id}`}
                                onClick={() => setEditingItem(sub)}
                                className="p-2 text-teal-400 hover:bg-teal-500/20 active:bg-teal-500/30 rounded-xl transition cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                id={`delete-sub-m-${sub.id}`}
                                onClick={() => triggerDeleteSingle(sub)}
                                className="p-2 text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-xl transition cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-1 border-t border-slate-800/80">
                            <div>
                              <span className="text-slate-400">Lavozim: </span>
                              <span className="font-semibold text-teal-300">{sub.position}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Ish joyi: </span>
                              <span className="font-medium text-slate-200">{sub.workplace}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
                              <span>
                                <span className="text-slate-400">Passport: </span>
                                <span className="font-mono font-bold text-slate-200">{sub.passport}</span>
                              </span>
                              {sub.phoneNumber && (
                                <span>
                                  <span className="text-slate-400">Tel: </span>
                                  <span className="font-mono text-slate-300">{sub.phoneNumber}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span>
                                <span className="text-slate-400">JSHSHIR: </span>
                                <span className="font-mono font-bold text-teal-300">{sub.jshshir}</span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(sub.createdAt).toLocaleDateString('uz-UZ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW (Visible on >= md screens) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3.5 pl-4 pr-2 w-10">
                            <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white cursor-pointer" title="Hammasini tanlash">
                              {selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-teal-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-3.5 px-3">№ / ID</th>
                          <th className="py-3.5 px-3">Familya Ismi</th>
                          <th className="py-3.5 px-3">Lavozimi</th>
                          <th className="py-3.5 px-3">Ish joyi</th>
                          <th className="py-3.5 px-3">Telefon</th>
                          <th className="py-3.5 px-3">Passport</th>
                          <th className="py-3.5 px-3">JSHSHIR (14)</th>
                          <th className="py-3.5 px-3">Yuborilgan sana</th>
                          <th className="py-3.5 pr-4 pl-3 text-right">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredSubmissions.map((sub, index) => {
                          const isSelected = selectedIds.includes(sub.id);
                          return (
                            <tr
                              key={sub.id}
                              className={`hover:bg-slate-800/60 transition-colors ${
                                isSelected ? 'bg-teal-950/30' : ''
                              }`}
                            >
                              <td className="py-3.5 pl-4 pr-2">
                                <button onClick={() => handleToggleSelectOne(sub.id)} className="text-slate-400 hover:text-white cursor-pointer">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-teal-400" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-400">
                                <span className="font-bold text-slate-300 mr-1">{index + 1}.</span>
                                <span className="text-[11px] text-teal-400 font-semibold">{sub.id}</span>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-white">{sub.fullName}</td>
                              <td className="py-3.5 px-3 text-teal-300 font-medium">{sub.position}</td>
                              <td className="py-3.5 px-3 text-slate-300 max-w-[200px] truncate" title={sub.workplace}>
                                {sub.workplace}
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-400">{sub.phoneNumber || '-'}</td>
                              <td className="py-3.5 px-3 font-mono font-semibold text-slate-200">{sub.passport}</td>
                              <td className="py-3.5 px-3 font-mono font-bold text-teal-300">{sub.jshshir}</td>
                              <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                                {new Date(sub.createdAt).toLocaleDateString('uz-UZ')}
                              </td>
                              <td className="py-3.5 pr-4 pl-3 text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    id={`edit-sub-${sub.id}`}
                                    onClick={() => setEditingItem(sub)}
                                    className="p-1.5 text-teal-400 hover:bg-teal-500/20 rounded-lg transition cursor-pointer"
                                    title="Tahrirlash"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    id={`delete-sub-${sub.id}`}
                                    onClick={() => triggerDeleteSingle(sub)}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
                                    title="O'chirish"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WORKPLACES MANAGEMENT */}
        {activeTab === 'workplaces' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Add Workplace Form */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h2 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
                <Building className="w-5 h-5 text-teal-400" />
                <span>Yangi Ish Joyi Qo'shish</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Bu yerga kiritilgan ish joyi foydalanuvchilarning ro'yxatdan o'tish formasidagi tanlovida darhol ko'rinadi.
              </p>

              <form onSubmit={handleCreateWorkplace} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <input
                    id="input-new-workplace"
                    type="text"
                    placeholder="Masalan: 7-sonli Markaziy Poliklinika yoki Yangi Shifoxona"
                    value={newWorkplaceInput}
                    onChange={(e) => {
                      setNewWorkplaceInput(e.target.value);
                      if (workplaceMessage) setWorkplaceMessage(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    id="btn-add-workplace"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition flex items-center justify-center space-x-1.5 shadow-md shadow-teal-950/40 cursor-pointer active:scale-95 min-h-[42px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'shish</span>
                  </button>
                </div>

                {workplaceMessage && (
                  <p className={`text-xs font-medium flex items-center ${workplaceMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {workplaceMessage.type === 'success' ? <Check className="w-3.5 h-3.5 mr-1" /> : <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                    {workplaceMessage.text}
                  </p>
                )}
              </form>
            </div>

            {/* List of active workplaces */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Mavjud Ish Joylari Ro'yxati</span>
                  <span className="text-xs text-teal-300 font-bold bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                    {config.workplaces.length} ta
                  </span>
                </h3>

                {config.workplaces.length > 0 && (
                  <button
                    id="btn-clear-all-workplaces"
                    onClick={triggerClearAllWorkplaces}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Barcha ish joylarini tozalash</span>
                  </button>
                )}
              </div>

              {config.workplaces.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  <Building className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Hozircha ish joylari mavjud emas</p>
                  <p className="text-xs text-slate-500 mt-1">Yuqoridagi maydon orqali kerakli shifoxona yoki poliklinika nomini qo'shing.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {config.workplaces.map((wp, index) => {
                    const count = submissions.filter((s) => s.workplace === wp).length;
                    return (
                      <div key={wp} className="py-3 sm:py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-2 sm:px-3 rounded-xl transition gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                          <span className="text-xs font-mono text-slate-500 w-5 shrink-0">{index + 1}.</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-100 break-words">{wp}</p>
                            <span className="text-[11px] text-teal-400">{count} nafar xodim ro'yxatdan o'tgan</span>
                          </div>
                        </div>

                        <button
                          id={`btn-delete-wp-${index}`}
                          onClick={() => triggerDeleteWorkplace(wp)}
                          className="p-2 text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-xl transition cursor-pointer shrink-0"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: POSITIONS MANAGEMENT */}
        {activeTab === 'positions' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Add Position Form */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h2 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-teal-400" />
                <span>Yangi Lavozim Qo'shish</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Bu yerga kiritilgan lavozim foydalanuvchilarning ro'yxatdan o'tish formasidagi tanlovida darhol ko'rinadi.
              </p>

              <form onSubmit={handleCreatePosition} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <input
                    id="input-new-position"
                    type="text"
                    placeholder="Masalan: Shifokor-Urolog, Rentgenolog yoki Bosh Hamshira"
                    value={newPositionInput}
                    onChange={(e) => {
                      setNewPositionInput(e.target.value);
                      if (positionMessage) setPositionMessage(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    id="btn-add-position"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition flex items-center justify-center space-x-1.5 shadow-md shadow-teal-950/40 cursor-pointer active:scale-95 min-h-[42px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'shish</span>
                  </button>
                </div>

                {positionMessage && (
                  <p className={`text-xs font-medium flex items-center ${positionMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {positionMessage.type === 'success' ? <Check className="w-3.5 h-3.5 mr-1" /> : <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                    {positionMessage.text}
                  </p>
                )}
              </form>
            </div>

            {/* List of active positions */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Mavjud Lavozimlar Ro'yxati</span>
                  <span className="text-xs text-teal-300 font-bold bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                    {config.positions.length} ta
                  </span>
                </h3>

                {config.positions.length > 0 && (
                  <button
                    id="btn-clear-all-positions"
                    onClick={triggerClearAllPositions}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Barcha lavozimlarni tozalash</span>
                  </button>
                )}
              </div>

              {config.positions.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Hozircha lavozimlar mavjud emas</p>
                  <p className="text-xs text-slate-500 mt-1">Yuqoridagi maydon orqali kerakli lavozim nomini qo'shing.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {config.positions.map((pos, index) => {
                    const count = submissions.filter((s) => s.position === pos).length;
                    return (
                      <div key={pos} className="py-3 sm:py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-2 sm:px-3 rounded-xl transition gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                          <span className="text-xs font-mono text-slate-500 w-5 shrink-0">{index + 1}.</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-100 break-words">{pos}</p>
                            <span className="text-[11px] text-teal-400">{count} nafar xodim bu lavozimda</span>
                          </div>
                        </div>

                        <button
                          id={`btn-delete-pos-${index}`}
                          onClick={() => triggerDeletePosition(pos)}
                          className="p-2 text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-xl transition cursor-pointer shrink-0"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-400/30 text-teal-300 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Admin Parolini O'zgartirish</h3>
                <p className="text-xs text-slate-400">Admin paneliga kirish xavfsizlik parolini yangilang</p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Yangi Parol
                </label>
                <div className="relative">
                  <input
                    id="input-change-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Yangi parolni kiriting..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-300 transition cursor-pointer"
                    title={showNewPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordChangeSuccess && (
                <div className="p-3 bg-emerald-500/15 text-emerald-300 text-xs rounded-xl flex items-center border border-emerald-500/30">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                  Parol muvaffaqiyatli o'zgartirildi!
                </div>
              )}

              <button
                id="btn-save-new-password"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition shadow-md cursor-pointer"
              >
                Parolni saqlash
              </button>
            </form>
          </div>
        )}
      </main>

      {/* In-App Confirmation Modal (100% Reliable, works in all iFrames) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl shadow-black text-slate-100 relative">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-center text-white mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-center text-slate-300 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={closeConfirmModal}
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmModal.onConfirm}
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-950/60 cursor-pointer"
              >
                {confirmModal.confirmButtonText || "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Submission Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-teal-500/30 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit className="w-4 h-4 text-teal-400" />
                <span>Ma'lumotlarni tahrirlash</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const normalizedItem: MedicalWorkerSubmission = {
                  ...editingItem,
                  fullName: cyrillicToLatin(editingItem.fullName.trim()),
                  position: cyrillicToLatin(editingItem.position.trim()),
                  workplace: cyrillicToLatin(editingItem.workplace.trim()),
                  phoneNumber: editingItem.phoneNumber ? cyrillicToLatin(editingItem.phoneNumber.trim()) : '',
                  passport: cyrillicToLatin(editingItem.passport.trim()).toUpperCase(),
                  jshshir: editingItem.jshshir.trim()
                };
                onUpdateSubmission(editingItem.id, normalizedItem);
                setEditingItem(null);
                showToast("Ma'lumotlar muvaffaqiyatli saqlandi!");
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-300 mb-1">Familya Ismi *</label>
                <input
                  type="text"
                  required
                  value={editingItem.fullName}
                  onChange={(e) => setEditingItem({ ...editingItem, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Lavozim *</label>
                <select
                  value={editingItem.position}
                  onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {config.positions.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Ish joyi *</label>
                <select
                  value={editingItem.workplace}
                  onChange={(e) => setEditingItem({ ...editingItem, workplace: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {config.workplaces.map((w) => (
                    <option key={w} value={w} className="bg-slate-900">
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Telefon Raqami</label>
                <input
                  type="text"
                  value={editingItem.phoneNumber || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, phoneNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Passport seriya va raqam *</label>
                <input
                  type="text"
                  required
                  value={editingItem.passport}
                  onChange={(e) => setEditingItem({ ...editingItem, passport: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">JSHSHIR (14 raqam) *</label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={editingItem.jshshir}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, jshshir: e.target.value.replace(/\D/g, '').slice(0, 14) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Excel / CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-cyan-500/30 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Excel / CSV fayldan Neon bazasiga yuklash</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Tayyor <strong>.xlsx</strong> yoki <strong>.csv</strong> faylni tanlang. Undagi barcha xodimlar, lavozimlar va ish joylari avtomatik ravishda Neon PostgreSQL bazasiga qo'shiladi.
              </p>
              <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-teal-500/40 bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer">
                <Upload className="w-7 h-7 text-teal-400 mb-2" />
                <span className="text-xs font-bold text-white">
                  {isImporting ? "Yuklanmoqda..." : "Excel (.xlsx) yoki CSV faylni tanlang"}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Takroriy JSHSHIR lar avtomatik yangilanadi
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  disabled={isImporting}
                  onChange={handleFileImportChange}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {importStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{importStatus.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
