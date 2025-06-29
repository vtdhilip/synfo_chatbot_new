import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AdminHeader from "@/components/AdminHeader";
import ClientTable from "@/components/ClientTable";
import ClientModal from "@/components/ClientModal";
import MessageAlert from "@/components/MessageAlert";
import { generateFacebookAuthLink } from '../utils/facebookAuth';

// This is the single source of truth for the Client data type.
export interface Client {
  id: string; // The Firestore document ID
  clientName: string;
  instagramPageId: string;
  metaPageToken: string;
  platform: 'SHOPIFY' | 'WOOCOMMERCE';
  shopifyStoreName?: string;
  shopifyAccessToken?: string;
  woocommerceSiteUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
  subscriptionStatus: 'active' | 'inactive';
  agencyId: string;
  agencyName: string;
}

// This is the initial state for the form, using camelCase.
export const initialFormData: Omit<Client, 'id' | 'agencyId' | 'agencyName'> = {
  clientName: "",
  instagramPageId: "",
  metaPageToken: "",
  platform: "SHOPIFY",
  shopifyStoreName: "",
  shopifyAccessToken: "",
  woocommerceSiteUrl: "",
  woocommerceConsumerKey: "",
  woocommerceConsumerSecret: "",
  subscriptionStatus: "active",
};

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole, agencyName } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchClients = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const clientsCollectionRef = collection(db, "clients");
      const q = userRole === 'admin' 
        ? query(clientsCollectionRef) 
        : query(clientsCollectionRef, where("agencyId", "==", currentUser.uid));
      
      const querySnapshot = await getDocs(q);
      const clientsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Client[];
      setClients(clientsData);
    } catch (err) {
      showMessage("Failed to fetch clients.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) { fetchClients(); }
  }, [currentUser, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showMessage("You must be logged in.", "error");
    if (!formData.clientName || !formData.instagramPageId) return showMessage("Client Name and Instagram ID are required.", "error");

    setLoading(true);
    const clientData = {
      ...formData,
      agencyId: currentUser.uid,
      agencyName: userRole === 'admin' ? 'Admin' : agencyName || 'Agency',
    };

    try {
      if (editingClient) {
        const clientDocRef = doc(db, 'clients', editingClient.id);
        await setDoc(clientDocRef, clientData, { merge: true });
        showMessage("Client updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'clients'), clientData);
        showMessage("Client added successfully!", "success");
      }
      closeModal();
      fetchClients();
    } catch (err) {
      showMessage("Error saving client.", "error");
    }
    setLoading(false);
  };

  const deleteClient = async (clientId: string) => {
    if (!window.confirm("Are you sure?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      showMessage("Client deleted successfully.", "success");
      fetchClients();
    } catch (err) {
      showMessage("Error deleting client.", "error");
    }
    setLoading(false);
  };

  const toggleStatus = async (client: Client) => {
    setLoading(true);
    const newStatus = client.subscriptionStatus === 'active' ? 'inactive' : 'active';
    try {
      const clientDocRef = doc(db, 'clients', client.id);
      await setDoc(clientDocRef, { subscriptionStatus: newStatus }, { merge: true });
      fetchClients();
    } catch (err) {
      showMessage("Error updating status.", "error");
    }
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData(initialFormData);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };
  
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleGetAuthLink = (client: Client) => { 
    const authLink = generateFacebookAuthLink(client.instagramPageId, client.id);
    navigator.clipboard.writeText(authLink).then(() => {
        showMessage(`Auth link copied for ${client.clientName}!`, "success");
    });
  };

  const filteredClients = clients.filter((client) => {
    return (
      (client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true) &&
      (filterStatus === "all" || client.subscriptionStatus === filterStatus)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <AdminHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onAddClient={openAddModal}
        />
        {message && <MessageAlert message={message} type={messageType} onClose={() => setMessage("")} />}
        <ClientTable
          clients={filteredClients}
          loading={loading}
          onEdit={openEditModal}
          onDelete={deleteClient}
          onToggleStatus={toggleStatus}
          onGetAuthLink={handleGetAuthLink}
        />
        <ClientModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          clientData={formData}
          onInputChange={handleInputChange}
          editingClient={editingClient}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Index;
