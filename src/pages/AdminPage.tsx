import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { XCircle, X, Search, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react';

// Define a minimal User type
interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'agency';
  agencyName?: string;
  subscription?: {
    planId: string;
    status: string;
  };
  createdAt: Timestamp;
}

// REDESIGNED PlanForm component for adding/editing plans
const PlanForm = ({ plan, onClose, onSave, onError }: { plan: any; onClose: () => void; onSave: () => void; onError: (msg: string) => void; }) => {
    const [formData, setFormData] = useState({
        id: plan?.id || '',
        name: plan?.name || '',
        price: plan?.price || 0,
        displayOrder: plan?.displayOrder || 0,
        maxAutomations: plan?.maxAutomations || '0',
        razorpayPlanId: plan?.razorpayPlanId || '',
        action: {
            type: plan?.action?.type || 'checkout',
            url: plan?.action?.url || '',
        }
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name.startsWith('action.')) {
            const actionField = name.split('.')[1];
            setFormData(prev => ({ ...prev, action: { ...prev.action, [actionField]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const functions = getFunctions();
            const adminApiCallable = httpsCallable(functions, 'adminApi');
            const action = plan ? 'updatePlan' : 'createPlan';

            const { id, ...data } = formData;
            const payload = action === 'updatePlan'
                ? { planId: plan.id, updates: data }
                : { ...data, id: id.toLowerCase().replace(/\s+/g, '-') };

            await adminApiCallable({ action, payload });
            onSave();
        } catch (error: any) {
            console.error("Error saving plan:", error);
            onError(error.message || 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const inputStyles = "w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-200";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl transform transition-all">
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{plan ? 'Edit Plan' : 'Add New Plan'}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!plan && (
                        <div>
                            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Plan ID*</label>
                            <input name="id" placeholder="e.g., 'professional-plan'" value={formData.id} onChange={handleChange} required className={inputStyles} />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Plan Name*</label>
                        <input name="name" placeholder="e.g., 'Professional'" value={formData.name} onChange={handleChange} required className={inputStyles} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Price (in paise)*</label>
                            <input name="price" type="number" placeholder="e.g., 99900" value={formData.price} onChange={handleChange} required min="0" className={inputStyles} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Display Order*</label>
                            <input name="displayOrder" type="number" placeholder="e.g., 1" value={formData.displayOrder} onChange={handleChange} required className={inputStyles} />
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Max Automations*</label>
                        <input name="maxAutomations" type="text" placeholder="e.g., 5000 or 'unlimited'" value={formData.maxAutomations} onChange={handleChange} required className={inputStyles} />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Razorpay Plan ID</label>
                        <input name="razorpayPlanId" type="text" placeholder="plan_..." value={formData.razorpayPlanId} onChange={handleChange} className={inputStyles} />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Button Action</label>
                        <select name="action.type" value={formData.action.type} onChange={handleChange} className={inputStyles}>
                            <option value="checkout">Go to Checkout</option>
                            <option value="redirect">Redirect to URL</option>
                        </select>
                    </div>
                    {formData.action.type === 'redirect' && (
                        <div>
                           <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Redirect URL*</label>
                            <input name="action.url" placeholder="https://wa.me/..." value={formData.action.url} onChange={handleChange} required className={inputStyles} />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 mt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Save Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// REDESIGNED AdminPage Component
const AdminPage: React.FC = () => {
    const { userRole, isAppLoading: authLoading } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const [plans, setPlans] = useState<any[]>([]);
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);

    // Fetch Users and Plans
    useEffect(() => {
        if (userRole !== 'admin') {
            setLoading(false);
            return;
        }

        const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
            setLoading(false);
        });

        const unsubPlans = onSnapshot(query(collection(db, 'plans'), orderBy('displayOrder')), (snapshot) => {
            setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubUsers();
            unsubPlans();
        };
    }, [userRole]);


    const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(null), 5000);
    };

    const handleUpdateUser = useCallback(async (targetUserId: string, field: 'role' | 'planId', newValue: string) => {
        setIsUpdating(targetUserId);
        try {
            const functions = getFunctions();
            const adminApiCallable = httpsCallable(functions, 'adminApi');
            await adminApiCallable({
                action: 'updateUser',
                payload: { userId: targetUserId, [field]: newValue }
            });
            showMessage('User updated successfully!', 'success');
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setIsUpdating(null);
        }
    }, []);

    const handleAddNewPlan = () => {
        setEditingPlan(null);
        setShowPlanForm(true);
    };

    const handleEditPlan = (plan: any) => {
        setEditingPlan(plan);
        setShowPlanForm(true);
    };

    const handleDeletePlan = async (plan: any) => {
        if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`)) return;
        try {
            const functions = getFunctions();
            const adminApiCallable = httpsCallable(functions, 'adminApi');
            await adminApiCallable({ action: 'deletePlan', payload: { planId: plan.id } });
            showMessage('Plan deleted successfully', 'success');
        } catch (error: any) {
            showMessage(error.message, 'error');
        }
    };

    const filteredUsers = users.filter(user =>
        (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterRole === 'all' || user.role === filterRole)
    );
    
    const tableHeaderClasses = "px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider";
    const tableCellClasses = "px-6 py-4 whitespace-nowrap text-sm text-slate-700";
    const inputBaseStyles = "w-full bg-slate-100 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/50 focus:border-brand transition";
    
    if (authLoading || loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading Admin Dashboard...</p></div>;
    }
    
    if (userRole !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center border border-red-200">
                    <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
                    <p className="text-slate-500 mt-2">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
                <p className="text-lg text-slate-500 mb-8">Manage users and subscription plans.</p>

                {message && (
                    <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}
                
                {/* --- USER MANAGEMENT SECTION --- */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-5">User Management</h2>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                             <Search className="w-5 h-5 text-slate-400 absolute top-1/2 left-3.5 transform -translate-y-1/2" />
                             <input type="text" placeholder="Search by email or name..." className={`${inputBaseStyles} pl-11 pr-4 py-2.5`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="relative">
                            <select className={`${inputBaseStyles} pl-4 pr-10 py-2.5 appearance-none`} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="agency">Agency</option>
                            </select>
                            <ChevronDown className="w-5 h-5 text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className={tableHeaderClasses}>User</th>
                                    <th className={tableHeaderClasses}>Role</th>
                                    <th className={tableHeaderClasses}>Subscription</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                                        <td className={tableCellClasses}>
                                            <div className="font-medium text-slate-900">{user.displayName || 'N/A'}</div>
                                            <div className="text-slate-500">{user.email}</div>
                                        </td>
                                        <td className={tableCellClasses}>
                                            <select value={user.role} onChange={(e) => handleUpdateUser(user.uid, 'role', e.target.value)} disabled={isUpdating === user.uid} className={`${inputBaseStyles} text-sm py-1.5`}>
                                                <option value="agency">Agency</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className={tableCellClasses}>
                                             <select value={user.subscription?.planId || 'free'} onChange={(e) => handleUpdateUser(user.uid, 'planId', e.target.value)} disabled={isUpdating === user.uid} className={`${inputBaseStyles} text-sm py-1.5`}>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                <option value="free">Free</option>
                                             </select>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-10 text-slate-500">No users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- PLAN MANAGEMENT SECTION --- */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                        <h2 className="text-2xl font-bold text-slate-800">Plan Management</h2>
                        <button onClick={handleAddNewPlan} className="inline-flex items-center px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors">
                            <Plus className="w-4 h-4 mr-2 -ml-1" />
                            Add New Plan
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className={tableHeaderClasses}>Plan Name</th>
                                    <th className={tableHeaderClasses}>Price</th>
                                    <th className={tableHeaderClasses}>Automations</th>
                                    <th className={`${tableHeaderClasses} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {plans.map(plan => (
                                    <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                                        <td className={`${tableCellClasses} font-medium text-slate-900`}>{plan.name}</td>
                                        <td className={tableCellClasses}>₹{(plan.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={tableCellClasses}>{String(plan.maxAutomations)}</td>
                                        <td className={`${tableCellClasses} text-right space-x-2`}>
                                            <button onClick={() => handleEditPlan(plan)} className="p-2 text-slate-500 hover:text-brand transition-colors rounded-md hover:bg-brand-50">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePlan(plan)} className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-md hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {plans.length === 0 && (
                                     <tr><td colSpan={4} className="text-center py-10 text-slate-500">No plans configured yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showPlanForm && (
                    <PlanForm
                        plan={editingPlan}
                        onClose={() => setShowPlanForm(false)}
                        onSave={() => {
                            setShowPlanForm(false);
                            showMessage('Plan saved successfully!', 'success');
                        }}
                        onError={(msg) => showMessage(msg, 'error')}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminPage;