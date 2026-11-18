/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MedicalWorkerSubmission, AppConfig } from './types';
import {
  loadConfig,
  saveConfig,
  loadSubmissions,
  addSubmission,
  updateSubmission,
  deleteSubmission,
  deleteMultipleSubmissions,
  subscribeToSubmissions,
  subscribeToConfig,
  forceSyncFromCloud,
  syncAllSubmissionsToCloud,
  bulkImportSubmissions
} from './services/storageService';
import { UserForm } from './components/UserForm';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [view, setView] = useState<'form' | 'admin'>('form');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [submissions, setSubmissions] = useState<MedicalWorkerSubmission[]>(() => loadSubmissions());
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());

  // Real-time synchronization with Neon PostgreSQL
  useEffect(() => {
    // 1. Initial local load for instant 0ms UI rendering
    setConfig(loadConfig());
    setSubmissions(loadSubmissions());

    // 2. Live sync with Neon PostgreSQL
    const unsubSubmissions = subscribeToSubmissions((cloudSubmissions) => {
      setSubmissions(cloudSubmissions);
    });

    const unsubConfig = subscribeToConfig((cloudConfig) => {
      setConfig(cloudConfig);
    });

    return () => {
      unsubSubmissions();
      unsubConfig();
    };
  }, []);

  const handleAddSubmission = async (data: Omit<MedicalWorkerSubmission, 'id' | 'createdAt'>) => {
    const created = await addSubmission(data);
    setSubmissions(loadSubmissions());
    return created;
  };

  const handleUpdateSubmission = async (id: string, updated: Partial<MedicalWorkerSubmission>) => {
    const updatedList = await updateSubmission(id, updated);
    setSubmissions(updatedList);
  };

  const handleDeleteSubmission = async (id: string) => {
    const updatedList = await deleteSubmission(id);
    setSubmissions(updatedList);
  };

  const handleDeleteMultipleSubmissions = async (ids: string[]) => {
    const updatedList = await deleteMultipleSubmissions(ids);
    setSubmissions(updatedList);
  };

  const handleAddPosition = async (pos: string) => {
    const trimmed = pos.trim();
    if (!trimmed) return;
    if (config.positions.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = { ...config, positions: [...config.positions, trimmed] };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleDeletePosition = async (pos: string) => {
    const updated = { ...config, positions: config.positions.filter((p) => p !== pos) };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleClearAllPositions = async () => {
    const updated = { ...config, positions: [] };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleAddWorkplace = async (wp: string) => {
    const trimmed = wp.trim();
    if (!trimmed) return;
    if (config.workplaces.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = { ...config, workplaces: [...config.workplaces, trimmed] };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleDeleteWorkplace = async (wp: string) => {
    const updated = { ...config, workplaces: config.workplaces.filter((w) => w !== wp) };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleClearAllWorkplaces = async () => {
    const updated = { ...config, workplaces: [] };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleChangePassword = async (newPass: string) => {
    const updated = { ...config, adminPassword: newPass };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleForceSyncFromCloud = async () => {
    const result = await forceSyncFromCloud();
    setSubmissions(result.submissions);
    setConfig(result.config);
  };

  const handlePushAllToCloud = async () => {
    await saveConfig(config);
    await syncAllSubmissionsToCloud(submissions);
    setSubmissions(loadSubmissions());
  };

  const handleImportSubmissions = async (
    items: Partial<MedicalWorkerSubmission>[],
    newPositions: string[],
    newWorkplaces: string[]
  ) => {
    const mergedPositions = Array.from(new Set([...config.positions, ...newPositions]));
    const mergedWorkplaces = Array.from(new Set([...config.workplaces, ...newWorkplaces]));
    if (
      mergedPositions.length !== config.positions.length ||
      mergedWorkplaces.length !== config.workplaces.length
    ) {
      const updatedCfg = {
        ...config,
        positions: mergedPositions,
        workplaces: mergedWorkplaces
      };
      setConfig(updatedCfg);
      await saveConfig(updatedCfg);
    }
    const res = await bulkImportSubmissions(items);
    setSubmissions(loadSubmissions());
    return res;
  };

  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      setView('admin');
      forceSyncFromCloud().then((res) => {
        setSubmissions(res.submissions);
        setConfig(res.config);
      }).catch(console.warn);
    } else {
      forceSyncFromCloud().then((res) => {
        setSubmissions(res.submissions);
        setConfig(res.config);
      }).catch(console.warn);
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsLoginModalOpen(false);
    setView('admin');
    forceSyncFromCloud().then((res) => {
      setSubmissions(res.submissions);
      setConfig(res.config);
    }).catch(console.warn);
  };

  return (
    <div className="min-h-screen">
      {view === 'form' ? (
        <UserForm
          positions={config.positions}
          workplaces={config.workplaces}
          submissions={submissions}
          onSubmitData={handleAddSubmission}
          onOpenAdminLogin={handleOpenAdmin}
        />
      ) : (
        <AdminDashboard
          submissions={submissions}
          config={config}
          onUpdateSubmission={handleUpdateSubmission}
          onDeleteSubmission={handleDeleteSubmission}
          onDeleteMultipleSubmissions={handleDeleteMultipleSubmissions}
          onAddPosition={handleAddPosition}
          onDeletePosition={handleDeletePosition}
          onClearAllPositions={handleClearAllPositions}
          onAddWorkplace={handleAddWorkplace}
          onDeleteWorkplace={handleDeleteWorkplace}
          onClearAllWorkplaces={handleClearAllWorkplaces}
          onChangePassword={handleChangePassword}
          onBackToForm={() => setView('form')}
          onForceSyncFromCloud={handleForceSyncFromCloud}
          onPushAllToCloud={handlePushAllToCloud}
          onImportSubmissions={handleImportSubmissions}
        />
      )}

      {/* Admin Password Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        correctPassword={config.adminPassword}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
