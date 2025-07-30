// src/components/AdminHeader.tsx

import React from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';
import { PlanId, PlanCapabilities, planFeatures } from '../config/plans';

interface AdminHeaderProps {
  onAddClient: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  currentPlanId: PlanId;
  automatedExecutions: number;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onAddClient,
  currentPlanId,
  automatedExecutions,
}) => {
  const currentPlanCapabilities: PlanCapabilities = planFeatures[currentPlanId] || planFeatures['free'];
  const automationLimit = currentPlanCapabilities.maxAutomations;
  
  const usagePercentage = typeof automationLimit === 'number' && automationLimit > 0
    ? (automatedExecutions / automationLimit) * 100
    : 0;

  const usageColor = usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <>
      {/* Main Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Your Accounts</h1>
          <p className="text-lg text-slate-500 mt-1">Manage all your connected Instagram accounts.</p>
        </div>
        <button onClick={onAddClient} className="inline-flex items-center justify-center px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-brand-600 transition-colors">
          <Plus className="w-5 h-5 mr-2 -ml-1" />
          Add New Account
        </button>
      </header>

      {/* Plan & Usage Card */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <p className="text-sm font-semibold text-brand">{currentPlanCapabilities.name || 'Free Plan'}</p>
                <p className="text-slate-600 mt-1">Monthly Automation Usage</p>
            </div>
            <div className="w-full md:w-auto">
                <div className="flex justify-between items-center text-sm font-medium text-slate-600 mb-1">
                    <span>{automatedExecutions.toLocaleString()}</span>
                    <span>{typeof automationLimit === 'number' ? automationLimit.toLocaleString() : 'Unlimited'}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className={`${usageColor} h-2.5 rounded-full`} style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
                </div>
            </div>
        </div>
      </div>

      {/* Accounts List Header with Search & Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-slate-200">
          <div className="relative w-full sm:w-auto flex-grow">
            <Search className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="w-full bg-slate-100 border-slate-200 rounded-lg pl-11 pr-4 py-2.5 focus:ring-2 focus:ring-brand/50 focus:border-brand transition" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select 
              className="w-full bg-slate-100 border-slate-200 rounded-lg pl-4 pr-10 py-2.5 appearance-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <ChevronDown className="w-5 h-5 text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {/* The AccountsTable component would be rendered below this header */}
      </div>
    </>
  );
};

export default AdminHeader;
