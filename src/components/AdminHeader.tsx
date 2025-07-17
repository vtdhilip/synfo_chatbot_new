import { Search, Filter, Plus, MessageSquare } from 'lucide-react';
import { PlanId, PlanCapabilities, planFeatures } from '../config/plans'; // FIX: Import from plans.ts

interface AdminHeaderProps {
  onAddClient: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  currentPlanId: PlanId;
  automatedExecutions: number;
}

const AdminHeader = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onAddClient,
  currentPlanId,
  automatedExecutions,
}: AdminHeaderProps) => {

  const currentPlanCapabilities: PlanCapabilities = planFeatures[currentPlanId] || planFeatures['free'];
  const automationLimit = currentPlanCapabilities.maxAutomations;
  const automationLimitText = typeof automationLimit === 'number' ? `${automatedExecutions} / ${automationLimit}` : 'Unlimited';
  const automationStatusColor = typeof automationLimit === 'number' && automatedExecutions >= automationLimit * 0.9
    ? 'text-red-500'
    : typeof automationLimit === 'number' && automatedExecutions >= automationLimit * 0.7
      ? 'text-yellow-500'
      : 'text-green-600';
  const automationTooltip = typeof automationLimit === 'number'
    ? `You have used ${automatedExecutions} out of ${automationLimit} automated executions this month.`
    : 'Your plan includes unlimited automated executions.';


  return (
       <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Account Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your Accounts and their integrations</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 shadow-sm" title={automationTooltip}>
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <div className="text-sm">
            <p className="font-semibold text-gray-700">Automated Executions</p>
            <p className={`font-bold ${automationStatusColor}`}>{automationLimitText}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Accounts..."
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={onAddClient}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
