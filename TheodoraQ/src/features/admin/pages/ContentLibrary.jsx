// src/pages/ContentLibrary.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Grid, Card, CardContent, CircularProgress,
  CardActions, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';
import AssignQuizModal from '../components/AssignQuizModal';
import RenameQuizDialog from '../components/RenameQuizDialog';
import Loader from '../../../components/Loader';

const ContentLibrary = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for the assignment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // State for the delete confirmation dialog
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  // State for rename dialog
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [quizToRename, setQuizToRename] = useState(null);

  // Fetch quizzes when the page loads
  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:5000/api/quiz', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch quizzes');
        }
        
        const result = await response.json();
        setQuizzes(result.data || []);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchQuizzes();
    }
  }, [token]);

  const handleCreateNew = () => {
    navigate('/admin/content/new');
  };

  // Functions to open/close the assignment modal
  const handleOpenAssignModal = (quiz) => {
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setIsModalOpen(false);
    setSelectedQuiz(null);
  };

  // Functions for Edit
  const handleEdit = (quizId) => {
    navigate(`/admin/content/edit/${quizId}`);
  };

  // Functions for Rename
  const handleOpenRenameDialog = (quiz) => {
    setQuizToRename(quiz);
    setIsRenameDialogOpen(true);
  };

  const handleCloseRenameDialog = () => {
    setQuizToRename(null);
    setIsRenameDialogOpen(false);
  };

  const handleRenameSuccess = () => {
    // Refresh the quiz list
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/quiz', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setQuizzes(result.data || []);
        }
      } catch (error) {
        console.error('Error refreshing quizzes:', error);
      }
    };
    fetchQuizzes();
  };

  // Functions for Delete
  const handleOpenDeleteModal = (quizId) => {
    setQuizToDelete(quizId);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setQuizToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!quizToDelete) return;
    
    try {
      const response = await fetch(`/api/quiz/${quizToDelete}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete quiz');
      }

      // Remove from state
      setQuizzes(prev => prev.filter(q => q._id !== quizToDelete));
      handleCloseDeleteModal();

    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert(`Failed to delete quiz: ${error.message}`);
    }
    
    fetchQuizzes();
  };

  // Filter quizzes based on search query
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (quiz.questions?.length || 0).toString().includes(searchQuery)
  );

  return (
    <Box>
      {/* 1. Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Content Library
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create New Content
        </Button>
      </Box>

      {/* 2. Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search quizzes by title or number of questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 600 }}
        />
      </Box>

      {/* 3. Grid of Content Cards */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {error}
        </Typography>
      )}
      
      <Grid container spacing={3}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 4 }}>
            <Loader />
          </Box>
        ) : filteredQuizzes.length > 0 ? (
          filteredQuizzes.map(quiz => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quiz._id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {quiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Type: Quiz
                  </Typography>
                  <Typography variant="body2">
                    {quiz.questions?.length || 0} Questions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Created: {new Date(quiz.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                {/* CardActions with Assign, Rename, Edit, and Delete buttons */}
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, flexWrap: 'nowrap' }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => handleOpenAssignModal(quiz)}
                  >
                    Assign
                  </Button>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Button 
                      size="small" 
                      onClick={() => handleOpenRenameDialog(quiz)}
                    >
                      Rename
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => handleEdit(quiz._id)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => handleOpenDeleteModal(quiz._id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
            {quizzes.length === 0 ? (
              <>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  You haven't created any content yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click "Create New Content" to generate your first quiz with AI!
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No quizzes found matching "{searchQuery}"
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Try searching with a different keyword
                </Typography>
              </>
            )}
          </Box>
        )}
      </Grid>

      {/* Render the assignment modal */}
      <AssignQuizModal
        open={isModalOpen}
        onClose={handleCloseAssignModal}
        quiz={selectedQuiz}
        token={token}
      />

      {/* Rename Quiz Dialog */}
      <RenameQuizDialog
        open={isRenameDialogOpen}
        onClose={handleCloseRenameDialog}
        quiz={quizToRename}
        onSuccess={handleRenameSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onClose={handleCloseDeleteModal}>
        <DialogTitle>Delete Quiz?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this quiz? This action cannot be undone.
            {/* TODO: Add warning if the quiz is assigned to classes */}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContentLibrary;