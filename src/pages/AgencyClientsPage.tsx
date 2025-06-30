import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Hook to get the agency ID from the URL
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ClientTable from '@/components/ClientTable'; // Reuse your existing table

// You can import the Client interface from your Index page
import { Client } from './Index'; 

const AgencyClientsPage = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const { agencyId } = useParams<{ agencyId: string }>(); // Get agencyId from URL

    useEffect(() => {
        const fetchAgencyClients = async () => {
            if (!agencyId) return;
            setLoading(true);
            try {
                const clientsRef = collection(db, "clients");
                // Query the clients collection where agencyId matches the one in the URL
                const q = query(clientsRef, where("agencyId", "==", agencyId));

                const querySnapshot = await getDocs(q);
                const clientsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Client[];
                setClients(clientsData);
            } catch (error) {
                console.error("Error fetching agency clients:", error);
            }
            setLoading(false);
        };

        fetchAgencyClients();
    }, [agencyId]); // Re-run when the agencyId in the URL changes

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Clients for Agency</h1>
            {/* We can reuse the same ClientTable component! */}
            <ClientTable 
                clients={clients} 
                loading={loading}
                // You would pass dummy or disabled functions here since an admin
                // might manage clients from the main dashboard, not this view.
                onEdit={() => {}}
                onDelete={() => {}}
                onToggleStatus={() => {}}
                onGetAuthLink={() => {}}
            />
        </div>
    );
};

export default AgencyClientsPage;