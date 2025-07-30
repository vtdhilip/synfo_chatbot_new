import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, Shield, CreditCard, ArrowLeft } from 'lucide-react';

const settingsLinks = [
  { name: 'Profile', href: '/settings/profile', icon: User },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'Subscription', href: '/settings/subscription', icon: CreditCard },
];

const SettingsLayout: React.FC = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NavLink
        to="/"
        className="inline-flex items-center text-blue-600 hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </NavLink>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and subscription.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-1/4">
          <nav className="flex flex-col space-y-2">
            {settingsLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <link.icon className="w-5 h-5 mr-3" />
                <span>{link.name}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;