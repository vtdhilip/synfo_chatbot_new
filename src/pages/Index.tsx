
import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminHeader from "@/components/AdminHeader";
import ClientTable from "@/components/ClientTable";
import ClientModal from "@/components/ClientModal";
import MessageAlert from "@/components/MessageAlert";
import { generateFacebookAuthLink } from '../utils/facebookAuth';

// Use Vite's env variable for API URL, fallback to localhost if not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/clients";

interface Client {
  _id: string;

  name: string;
  instagramId: string;
  metaToken: string;
  platform: 'SHOPIFY' | 'WOOCOMMERCE';
  shopifyStore?: string;
  shopifyToken?: string;
  woocommerceSiteUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
  subscriptionStatus: 'active' | 'inactive';
  createdAt: string;
}

const initialClientData: Omit<Client, '_id' | 'createdAt'> = {
  name: "",
  instagramId: "",
  metaToken: "",
  platform: "SHOPIFY",
  shopifyStore: "",
  shopifyToken: "",
  woocommerceSiteUrl: "",
  woocommerceConsumerKey: "",
  woocommerceConsumerSecret: "",
  subscriptionStatus: "active",
};

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientData, setClientData] = useState(initialClientData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setClients(res.data);
    } catch (err) {
      showMessage("Failed to fetch clients. Please check your API connection.", "error");
      console.error("Fetch clients error:", err);
    }
    setLoading(false);
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };
  const handleGetAuthLink = (client: Client) => {
    try {
      const authLink = generateFacebookAuthLink(client.instagramId, client._id);
      
      // Copy to clipboard
      navigator.clipboard.writeText(authLink).then(() => {
        showMessage(`Authentication link copied to clipboard for ${client.name}!`, "success");
      }).catch(() => {
        // Fallback: open in new tab
        window.open(authLink, '_blank');
        showMessage(`Authentication link opened in new tab for ${client.name}!`, "info");
      });
    } catch (error) {
      showMessage("Failed to generate authentication link. Please try again.", "error");
      console.error("Generate auth link error:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClientData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (editingClient) {
        await axios.put(`${API_URL}/${editingClient._id}`, clientData);
        showMessage("Client updated successfully!", "success");
      } else {
        await axios.post(`${API_URL}/add`, clientData);
        showMessage("Client added successfully!", "success");
      }
      closeModal();
      fetchClients();
    } catch (err) {
      showMessage("Error saving client. Please try again.", "error");
      console.error("Save client error:", err);
    }
    setLoading(false);
  };

  const openEditModal = (client: Client) => {
    setClientData({
      name: client.name || "",
      instagramId: client.instagramId || "",
      metaToken: client.metaToken || "",
      platform: client.platform || "SHOPIFY",
      shopifyStore: client.shopifyStore || "",
      shopifyToken: client.shopifyToken || "",
      woocommerceSiteUrl: client.woocommerceSiteUrl || "",
      woocommerceConsumerKey: client.woocommerceConsumerKey || "",
      woocommerceConsumerSecret: client.woocommerceConsumerSecret || "",
      subscriptionStatus: client.subscriptionStatus || "active",
    });
    setEditingClient(client);
    setIsModalOpen(true);
    setMessage("");
  };

  const openAddModal = () => {
    setClientData(initialClientData);
    setEditingClient(null);
    setIsModalOpen(true);
    setMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setMessage("");
  };

  const deleteClient = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/${id}`);
        showMessage("Client deleted successfully.", "success");
        fetchClients();
      } catch (err) {
        showMessage("Error deleting client. Please try again.", "error");
        console.error("Delete client error:", err);
      }
      setLoading(false);
    }
  };

  const toggleStatus = async (client: Client) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/${client._id}`, {
        ...client,
        subscriptionStatus: client.subscriptionStatus === "active" ? "inactive" : "active",
      });
      fetchClients();
      showMessage(`Client status updated to ${client.subscriptionStatus === "active" ? "inactive" : "active"}.`, "success");
    } catch (err) {
      showMessage("Error updating client status. Please try again.", "error");
      console.error("Toggle status error:", err);
    }
    setLoading(false);
  };

  const filteredClients = clients.filter((client) => {
    return (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
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
        
        {message && (
          <MessageAlert
            message={message}
            type={messageType}
            onClose={() => setMessage("")}
          />
        )}
        
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
          clientData={clientData}
          onInputChange={handleInputChange}
          editingClient={editingClient}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Index;
