import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AgenciesPage from "./pages/AgenciesPage";
import AdminRoute from "./components/AdminRoute";
import NotFound from "./pages/NotFound";
import AgencyAccountsPage from "./pages/AgencyAccountsPage";
import AuthCallback from './components/AuthCallback';
import EditorPage from './pages/EditorPage';
import InboxPage from "./components/InboxPage";
import AddAccountPage from "./pages/AddAccountPage";
import FacebookCallback from './components/FacebookCallback';

import DashboardPage from './pages/DashboardPage';


const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/facebook/callback" element={<FacebookCallback />} />
      {/* Protected routes wrapped by the Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Index />} />
        <Route path="/editor/:accountId/:flowType" element={<EditorPage />} />
        <Route path="/agency/:agencyId/clients" element={<AgencyAccountsPage />} />
        <Route path="/inbox" element={<InboxPage />} />.
<Route path="/add-account/:platform" element={<AddAccountPage />} />

<Route path="/dashboard/:accountId" element={<DashboardPage />} />
        <Route
          path="/agencies"
          element={
            <AdminRoute>
              <AgenciesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/agency/:agencyId/clients"
          element={<AdminRoute> <AgencyAccountsPage /> </AdminRoute>}
        />

      </Route>

      {/* You can add other protected pages here, like /settings */}


      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
