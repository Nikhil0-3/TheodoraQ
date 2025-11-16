import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
} from '@mui/material';

const RenameQuizDialog = ({ open, onClose, quiz, onSuccess }) => {
  const [newTitle, setNewTitle] = useState(quiz?.title || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (quiz) {
      setNewTitle(quiz.title);
      setError('');
    }
  }, [quiz]);

  const handleSubmit = async () => {
    try {
      setError('');
      setIsSubmitting(true);

      // Validation
      if (!newTitle.trim()) {
        setError('Quiz title cannot be empty');
        setIsSubmitting(false);
        return;
      }

      if (newTitle.trim() === quiz.title) {
        setError('Please enter a different title');
        setIsSubmitting(false);
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');

      // Make API call to update quiz
      const response = await fetch(
        `http://localhost:5000/api/quiz/${quiz._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newTitle.trim(),
            timeLimit: quiz.timeLimit,
            questions: quiz.questions, // Keep existing questions
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to rename quiz');
      }

      console.log('✅ Quiz renamed successfully');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(data.data);
      }

      // Close dialog
      onClose();

    } catch (err) {
      console.error('❌ Error renaming quiz:', err);
      setError(err.message || 'Failed to rename quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError('');
    setNewTitle(quiz?.title || '');
    onClose();
  };

  if (!quiz) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        Rename Quiz
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Quiz Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new quiz title"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isSubmitting) {
                handleSubmit();
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !newTitle.trim()}
        >
          {isSubmitting ? 'Renaming...' : 'Rename'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameQuizDialog;
