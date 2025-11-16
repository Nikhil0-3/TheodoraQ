// Shared Navbar Component
import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Typography, InputBase, Box, Menu, MenuItem, Avatar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../features/auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import lightLogo from '../../assets/light_mode_theodoraQ_logo.svg';
import darkLogo from '../../assets/dark_mode_theodoraQ_logo.svg';

// We receive props from AdminLayout
const Navbar = ({ sidebarWidth, onMenuClick, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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
    const role = user?.role || 'admin';
    navigate(`/${role}/profile`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to classes page with search query
      const role = user?.role || 'admin';
      navigate(`/${role}/classes?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: '100%',
      }}
    >
      <Toolbar>
        {/* Hamburger Icon to toggle sidebar */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* Logo and Brand Name */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            flexGrow: 1,
          }}
        >
          <Box
            component="img"
            src={lightLogo}
            alt="TheodoraQ Logo"
            sx={{
              height: 40,
              width: 'auto',
              display: { xs: 'none', sm: 'block' }
            }}
          />
          <Box
            component="img"
            src={lightLogo}
            alt="TheodoraQ"
            sx={{
              height: 32,
              width: 'auto',
              display: { xs: 'block', sm: 'none' }
            }}
          />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              letterSpacing: 0.5,
              display: { xs: 'none', md: 'block' }
            }}
          >
            TheodoraQ
          </Typography>
        </Box>
        
        {/* Global Search (Hidden on mobile) */}
        <Box 
          component="form"
          onSubmit={handleSearch}
          sx={{ 
            position: 'relative', 
            borderRadius: 1, 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            mr: 2,
            display: { xs: 'none', md: 'block' },
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.25)',
            }
          }}
        >
          <Box sx={{ p: '0 10px', height: '100%', position: 'absolute', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <SearchIcon />
          </Box>
          <InputBase
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              color: 'inherit', 
              pl: '35px', 
              pr: 1,
              py: 0.5,
              width: '250px',
            }}
          />
        </Box>
        
        {/* User Name (Hidden on mobile) */}
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
        
        {/* Avatar Logo with Menu */}
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
  );
};

export default Navbar;