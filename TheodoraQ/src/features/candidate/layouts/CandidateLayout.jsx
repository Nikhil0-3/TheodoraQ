// Candidate Layout Component
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Box, AppBar, Toolbar, Typography, List, ListItem, 
  ListItemButton, ListItemText, Drawer, Button, IconButton,
  Menu, MenuItem, Divider, ListItemIcon, Avatar, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ClassIcon from '@mui/icons-material/Class';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../auth/contexts/AuthContext';
import lightLogo from '../../../assets/light_mode_theodoraQ_logo.svg';
import darkLogo from '../../../assets/dark_mode_theodoraQ_logo.svg';

const drawerWidth = 240;

const CandidateLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

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

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    setLogoutDialogOpen(false);
    await logout();
    navigate('/');
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/candidate/profile');
  };

  const menuItems = [
    { text: 'Dashboard', path: '/candidate/dashboard', icon: <DashboardIcon /> },
    { text: 'My Classes', path: '/candidate/my-classes', icon: <ClassIcon /> },
    { text: 'Join a Class', path: '/candidate/join-class', icon: <AddCircleIcon /> },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <AppBar 
        position="fixed" 
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src={lightLogo}
              alt="TheodoraQ Logo"
              sx={{
                height: 56,
                width: 'auto',
                mr: 1.5,
                display: { xs: 'none', sm: 'block' }
              }}
            />
            <Box
              component="img"
              src={lightLogo}
              alt="TheodoraQ"
              sx={{
                height: 44,
                width: 'auto',
                mr: 1,
                display: { xs: 'block', sm: 'none' }
              }}
            />
            <Typography 
              variant="h6" 
              noWrap
              sx={{ 
                display: { xs: 'none', md: 'block' },
                fontWeight: 'bold',
                letterSpacing: 0.5,
              }}
            >
              TheodoraQ
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user && (
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: 1,
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {user.name}
              </Typography>
            )}
            <IconButton color="inherit" onClick={handleMenuOpen}>
              {user?.profilePicture ? (
                <Avatar 
                  src={`http://localhost:5000${user.profilePicture}`}
                  alt={user.name}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="textSecondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleProfileClick}>
              <PersonIcon fontSize="small" sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogoutClick}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>

          {/* Logout Confirmation Dialog */}
          <Dialog
            open={logoutDialogOpen}
            onClose={handleLogoutCancel}
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <DialogTitle id="logout-dialog-title">
              Confirm Logout
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="logout-dialog-description">
                Are you sure you want to logout? You will need to sign in again to access your account.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleLogoutCancel} color="primary">
                Cancel
              </Button>
              <Button onClick={handleLogoutConfirm} color="error" variant="contained" autoFocus>
                Logout
              </Button>
            </DialogActions>
          </Dialog>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          width: isSidebarOpen ? drawerWidth : 0,
          flexShrink: 0,
          transition: 'width 0.3s ease-in-out',
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            transition: 'transform 0.3s ease-in-out',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => handleNavigation(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 },
          marginTop: '64px',
          transition: 'all 0.3s ease-in-out',
          minWidth: 0,
          overflowX: 'hidden',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default CandidateLayout;
