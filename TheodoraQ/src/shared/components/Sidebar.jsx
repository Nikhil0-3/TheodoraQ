// Shared Sidebar Component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ClassIcon from '@mui/icons-material/Class';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import StatsIcon from './icons/StatsIcon';

// We receive props from AdminLayout
const Sidebar = ({ width, isOpen, onClose, isMobile }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'My Classes', icon: <ClassIcon />, path: '/admin/classes' },
  { text: 'Content Library', icon: <LibraryBooksIcon />, path: '/admin/content' },
  { text: 'Results', icon: <AssessmentIcon />, path: '/admin/results' },
  { text: 'Analytics', icon: <StatsIcon />, path: '/admin/analytics' },
  { text: 'Integrity Monitor', icon: <SecurityIcon />, path: '/admin/cheat-activity' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar /> {/* This adds empty space to align with AppBar */}
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation(item.path)}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={isOpen}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: isOpen ? width : 0,
        flexShrink: 0,
        transition: 'width 0.3s ease-in-out',
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          transition: 'transform 0.3s ease-in-out',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;