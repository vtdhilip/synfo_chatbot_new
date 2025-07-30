import React from 'react';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * NotFound component:
 * Displays a styled 404 page when a route is not matched.
 * Provides a link to go back to the homepage, consistent with the app's design.
 */
const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full border border-slate-200">
        <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center bg-brand-50 rounded-full">
            <SearchX className="w-9 h-9 text-brand" />
        </div>
        
        <h1 className="text-5xl font-bold text-slate-800 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-brand hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2 -ml-1" />
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
