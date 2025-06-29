
import { Outlet } from 'react-router-dom';
import GlobalHeader from './GlobalHeader'; // Import your new shared header

const Layout = () => {
  return (
    <div>
      <GlobalHeader />
      <main>
        {/* The actual page component (e.g., your dashboard) will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
