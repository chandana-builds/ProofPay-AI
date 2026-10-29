import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewInvestigationView } from './components/investigation/NewInvestigationView';
import { InvestigationDetailView } from './components/investigation/InvestigationDetailView';
import { InvestigationHistoryView } from './components/history/InvestigationHistoryView';
import { VendorDatabaseView } from './components/vendors/VendorDatabaseView';
import { SettingsView } from './components/settings/SettingsView';

import { DashboardStats, SystemStatus, InvestigationDetail } from './types';
import { fetchDashboardStats, fetchSystemStatus, fetchInvestigation } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Detail view state
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null);
  const [investigationDetail, setInvestigationDetail] = useState<InvestigationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const loadInitialData = async () => {
    setStatsLoading(true);
    try {
      const [statsRes, statusRes] = await Promise.all([
        fetchDashboardStats(),
        fetchSystemStatus(),
      ]);
      setStats(statsRes);
      setSystemStatus(statusRes);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectInvestigation = async (id: string) => {
    setSelectedInvestigationId(id);
    setDetailLoading(true);
    setActiveTab('investigation-detail');
    try {
      const detail = await fetchInvestigation(id);
      setInvestigationDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInvestigationCreated = (id: string) => {
    loadInitialData();
    handleSelectInvestigation(id);
  };

  const handleRefreshDetail = async () => {
    if (selectedInvestigationId) {
      const detail = await fetchInvestigation(selectedInvestigationId);
      setInvestigationDetail(detail);
      const updatedStats = await fetchDashboardStats();
      setStats(updatedStats);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        systemStatus={systemStatus}
        onNavigate={(tab) => setActiveTab(tab)}
        activeTab={activeTab}
      />

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 flex">
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          holdCount={stats?.on_hold_count}
          verificationCount={stats?.verification_required_count}
        />

        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] bg-slate-950/90">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={statsLoading}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectInvestigation={handleSelectInvestigation}
            />
          )}

          {activeTab === 'new-investigation' && (
            <NewInvestigationView
              onInvestigationCreated={handleInvestigationCreated}
              onCancel={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'investigation-detail' && (
            detailLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-400">Loading evidence report and policy findings...</p>
                </div>
              </div>
            ) : investigationDetail ? (
              <InvestigationDetailView
                investigation={investigationDetail}
                onBack={() => setActiveTab('history')}
                onRefresh={handleRefreshDetail}
              />
            ) : (
              <div className="p-8 text-center text-slate-400">
                Investigation not found.
              </div>
            )
          )}

          {activeTab === 'history' && (
            <InvestigationHistoryView
              onSelectInvestigation={handleSelectInvestigation}
              onNewInvestigation={() => setActiveTab('new-investigation')}
            />
          )}

          {activeTab === 'vendors' && <VendorDatabaseView />}

          {activeTab === 'settings' && (
            <SettingsView
              systemStatus={systemStatus}
              onRefresh={loadInitialData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
