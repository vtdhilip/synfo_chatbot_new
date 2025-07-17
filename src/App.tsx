import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import New Components
import SettingsLayout from './components/SettingsLayout';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import SecuritySettingsPage from './pages/SecuritySettingsPage';

// Import Existing Page Components
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import SubscriptionPage from './pages/SubscriptionPage';
import DashboardPage from './pages/DashboardPage';
// ... other page imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Protected Routes */}
          <Route
            index
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/:accountId"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* --- NEW SETTINGS ROUTES --- */}
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <SettingsLayout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>
          {/* ... other protected routes ... */}
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        {/* ... other public routes ... */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;