import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 1. Import Link
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Agency {
    id: string;
    email: string;
    agencyName: string;
}

const AgenciesPage = () => {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAgencies = async () => {
             setLoading(true);

            try {

                // Create a query to get all documents from the 'users' collection

                // where the 'role' field is equal to 'agency'

                const usersRef = collection(db, "users");

                const q = query(usersRef, where("role", "==", "agency"));



                const querySnapshot = await getDocs(q);

                const agenciesData = querySnapshot.docs.map(doc => ({ 

                    id: doc.id, 

                    ...doc.data() 

                })) as Agency[];



                setAgencies(agenciesData);

            } catch (error) {

                console.error("Error fetching agencies:", error);

            }

            setLoading(false);
        };
        fetchAgencies();
    }, []);

    if (loading) return <div className="p-8">Loading Agencies...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Manage Agencies</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <ul className="divide-y divide-gray-200">
                    {agencies.length > 0 ? (
                        agencies.map(agency => (
                            <li key={agency.id} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{agency.agencyName}</p>
                                    <p className="text-sm text-gray-500">{agency.email}</p>
                                </div>
                                {/* 2. Change the button to a Link */}
                                <Link
                                  to={`/agency/${agency.id}/clients`}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                    View Clients
                                </Link>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-500">No agencies found.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default AgenciesPage;
