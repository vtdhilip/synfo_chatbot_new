import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import AccountsTable from '@/components/AccountsTable'; // Using the new AccountsTable
import { Account } from './Index'; // Using the renamed Account interface
import { ArrowLeft } from 'lucide-react';

const AgencyAccountsPage = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const { agencyId } = useParams<{ agencyId: string }>();

    useEffect(() => {
        const fetchAgencyAccounts = async () => {
            if (!agencyId) return;
            setLoading(true);
            try {
                const accountsRef = collection(db, "clients"); // Still 'clients' collection in DB
                const q = query(accountsRef, where("agencyId", "==", agencyId));

                const querySnapshot = await getDocs(q);
                const accountsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Account[];
                setAccounts(accountsData);
            } catch (error) {
                console.error("Error fetching agency accounts:", error);
            }
            setLoading(false);
        };

        fetchAgencyAccounts();
    }, [agencyId]);

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/agencies" className="flex items-center text-blue-600 hover:underline mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agencies List
            </Link>
            <h1 className="text-3xl font-bold mb-6">Accounts for Agency</h1>
            <AccountsTable 
                accounts={accounts} 
                loading={loading}
                // These functions would need to be implemented or passed down if actions are needed on this page
                onEdit={() => {}}
                onDelete={() => {}}
                
                onGetAuthLink={() => {}}
            />
        </div>
    );
};

export default AgencyAccountsPage;