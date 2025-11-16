// src/pages/MyClasses.jsx
import React, { useState, useEffect } from 'react'; // 1. Import useEffect
import {
  Box, Typography, Button, Grid,
  Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClassCard from '../components/ClassCard';
import { useAuth } from '../../auth/contexts/AuthContext'; // Import useAuth

// 2. We'll use state for classes now
// const mockClasses = [...];

const MyClasses = () => {
  const [classes, setClasses] = useState([]); // 3. State for classes
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 4. State for the form fields
  const [className, setClassName] = useState('');
  const [courseCode, setCourseCode] = useState('');

  // State for the delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  // Get token from AuthContext
  const { token } = useAuth();

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  // 5. Fetch existing classes on component mount
  useEffect(() => {
    if (token) {
      fetchClasses();
    }
  }, [token]); // Re-fetch when token changes

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      // Silent error handling - could add user notification here
    }
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset form fields
    setClassName(''); 
    setCourseCode('');
  };

  // 6. Handle class creation
  const handleCreateClass = async () => {
    // Validate input
    if (!className.trim() || !courseCode.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const classData = {
      title: className,
      courseCode: courseCode,
    };

    try {
      // 7. Call the new API
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(classData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create class');
      }

      // Add the new class to our state
      setClasses(prevClasses => [...prevClasses, data.data]);
      
      handleCloseModal(); // Close the modal

    } catch (error) {
      alert('Failed to create class: ' + error.message);
    }
  };

  // Functions to handle the delete process
  const handleOpenDeleteModal = (id) => {
    setClassToDelete(id); // Set which class we're about to delete
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setClassToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;

    try {
      // Call the DELETE API
      const response = await fetch(`/api/classes/${classToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include', // Include cookies for authentication
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete class');
      }

      // Remove from the frontend state
      setClasses(prevClasses => 
        prevClasses.filter(c => c._id !== classToDelete)
      );
      
      handleCloseDeleteModal();

    } catch (error) {
      alert('Failed to delete class: ' + error.message);
    }
  };

  return (
    <Box>
      {/* 1. Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Classes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
        >
          Create New Class
        </Button>
      </Box>

      {/* 2. Grid of Class Cards (now uses state) */}
      <Grid container spacing={3}>
        {classes.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              No classes yet. Create your first class to get started!
            </Typography>
          </Grid>
        ) : (
          classes.map(classInfo => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={classInfo._id}> {/* Use _id from MongoDB */}
              <ClassCard 
                classInfo={classInfo}
                onDelete={handleOpenDeleteModal}
              />
            </Grid>
          ))
        )}
      </Grid>

      {/* 3. "Create Class" Modal (connect state) */}
      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>Create a New Class</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Class Name"
            type="text"
            fullWidth
            variant="standard"
            sx={{ mb: 2 }}
            value={className} // 9. Connect value
            onChange={(e) => setClassName(e.target.value)} // 10. Connect onChange
          />
          <TextField
            margin="dense"
            label="Course Code (e.g., CS101)"
            type="text"
            fullWidth
            variant="standard"
            value={courseCode} // 9. Connect value
            onChange={(e) => setCourseCode(e.target.value)} // 10. Connect onChange
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleCreateClass}>Create</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
      >
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this class? This action
            cannot be undone. All associated data (students, assignments, grades)
            will be permanently lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

export default MyClasses;