// src/App.tsx

import { lazy } from 'react'; // We only need lazy and Suspense from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import Layouts and Protected Route (these are not pages, so they can be imported normally)
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import SettingsLayout from './components/SettingsLayout';
import AuthCallback from './components/AuthCallback';
import FacebookCallback from './components/FacebookCallback';

// --- THIS IS THE CORRECTED SECTION ---
// Lazily load all your page-level components
const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const CreateAccountPage = lazy(() => import('./pages/CreateAccountPage'));
const NotFound = lazy(() => import("./pages/NotFound"));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const InboxPage = lazy(() => import("./components/InboxPage"));
const AddAccountPage = lazy(() => import("./pages/AddAccountPage"));
const AutomationListPage = lazy(() => import("./pages/AutomationListPage"));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentConfirmationPage = lazy(() => import('./pages/PaymentConfirmationPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const SecuritySettingsPage = lazy(() => import('./pages/SecuritySettingsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
// import GlobalLoader from './components/GlobalLoader';

const App = () => (
  <BrowserRouter>
    {/* <Suspense fallback={<GlobalLoader />}> */}
    <Routes>
      {/* Public routes that do not require login */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create-account" element={<CreateAccountPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/facebook/callback" element={<FacebookCallback />} />
      <Route path="/admin" element={<AdminPage />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Index />} />
        <Route path="dashboard/:accountId" element={<DashboardPage />} />
        <Route path="editor/:accountId/:automationType/:automationId?" element={<EditorPage />} />
        <Route path="automations/:accountId/:automationType" element={<AutomationListPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="add-account/:platform" element={<AddAccountPage />} />

        {/* Checkout and payment confirmation should also be protected */}
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="payment/confirm" element={<PaymentConfirmationPage />} />

        {/* Settings pages */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
          <Route path="security" element={<SecuritySettingsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
        </Route>
        
<Route path="/analytics/:accountId" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* </Suspense>  */}
  </BrowserRouter>
);

export default App;