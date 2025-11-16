// src/components/ClassCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  Card, 
  CardActionArea,
  CardContent, 
  Typography, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DeleteIcon from '@mui/icons-material/Delete';

const ClassCard = ({ classInfo, onDelete }) => {
  const navigate = useNavigate();
  
  // State for the menu
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleCardClick = () => {
    navigate(`/admin/classes/${classInfo._id}`); // Use _id from MongoDB
  };

  // Functions to open/close the menu
  const handleMenuOpen = (event) => {
    event.stopPropagation(); // Stop the card click from firing
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  // Function to navigate to Results tab
  const handleResultsClick = (event) => {
    event.stopPropagation();
    // Navigate to class details with Results tab (tab index 3)
    navigate(`/admin/classes/${classInfo._id}?tab=results`);
    handleMenuClose(event);
  };

  // Function to handle the delete click
  const handleDeleteClick = (event) => {
    event.stopPropagation();
    onDelete(classInfo._id); // Call the function from the parent
    handleMenuClose(event);
  };

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      {/* Separate the CardActionArea from the menu button */}
      <Box sx={{ position: 'relative' }}>
        
        {/* The menu button, positioned absolutely */}
        <IconButton
          aria-label="settings"
          onClick={handleMenuOpen}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1, // Ensure it's on top
          }}
        >
          <MoreVertIcon />
        </IconButton>

        {/* The main clickable area */}
        <CardActionArea onClick={handleCardClick}>
          <CardContent>
            <Typography variant="h5" component="div" sx={{ pr: '40px' }}> {/* Add padding to avoid overlap */}
              {classInfo.title}
            </Typography>
            <Typography sx={{ mb: 1.5 }} color="text.secondary">
              {classInfo.courseCode}
            </Typography>
            <Typography variant="body2">
              {classInfo.students?.length || 0} Students
            </Typography>
          </CardContent>
        </CardActionArea>
      </Box>

      {/* The Menu component itself */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleResultsClick}>
          <ListItemIcon>
            <AssessmentIcon fontSize="small" />
          </ListItemIcon>
          View Results
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Delete
        </MenuItem>
        {/* We can add "Edit" or "Archive" here later */}
      </Menu>
    </Card>
  );
};

export default ClassCard;