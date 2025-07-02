import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AgenciesPage from "./pages/AgenciesPage";
import AdminRoute from "./components/AdminRoute";
import NotFound from "./pages/NotFound";
import AgencyClientsPage from "./pages/AgencyClientsPage";
import AuthCallback from './components/AuthCallback';

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
<Route path="/auth/callback" element={<AuthCallback />} />
      {/* Protected routes wrapped by the Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Index />} />



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
          element={<AdminRoute> <AgencyClientsPage /> </AdminRoute>}
        />

      </Route>

      {/* You can add other protected pages here, like /settings */}


      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
