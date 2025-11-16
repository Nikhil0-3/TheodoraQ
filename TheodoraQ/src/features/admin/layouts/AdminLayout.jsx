// Admin Layout Component
import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from '../../../shared/components/Navbar';
import Sidebar from '../../../shared/components/Sidebar';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // We can use a simple width for the sidebar
  const sidebarWidth = 240;

  // Check if mobile on mount and window resize
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* 1. The Top Navbar */}
      <Navbar 
        sidebarWidth={sidebarWidth} 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      
      {/* 2. The Left Sidebar */}
      <Sidebar 
        width={sidebarWidth} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* 3. The Main View Zone */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 }, // Responsive padding
          marginTop: '64px', // Standard height of AppBar
          transition: 'all 0.3s ease-in-out',
          minWidth: 0, // Prevent overflow
          overflowX: 'hidden',
          width: '100%',
        }}
      >
        <Outlet /> {/* This is where our pages (Dashboard, MyClasses) will appear */}
      </Box>

    </Box>
  );
};

export default AdminLayout;