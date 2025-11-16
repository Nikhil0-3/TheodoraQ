import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/contexts/AuthContext';
import EditQuizModal from './EditQuizModal';
import AssignQuizModal from './AssignQuizModal';

const QuizTab = ({ classId }) => {
  const { token } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quiz generation state
  const [prompt, setPrompt] = useState('');
  const [quizType, setQuizType] = useState('mcq');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [quizToAssign, setQuizToAssign] = useState(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  // Fetch quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/quiz', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        setQuizzes(result.data);
      } else {
        setError(result.message || 'Failed to fetch quizzes');
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!prompt.trim()) {
      setError('Please enter a topic or prompt for quiz generation');
      return;
    }

    // Ensure numberOfQuestions is a valid number
    const validQuestionCount = Math.max(1, Math.min(50, parseInt(numberOfQuestions) || 5));
    if (validQuestionCount !== numberOfQuestions) {
      setNumberOfQuestions(validQuestionCount);
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, quizType, numberOfQuestions: validQuestionCount }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Don't save or refresh list yet - just open edit modal with generated data
        setSuccess('Quiz generated! Review and edit before saving.');
        setPrompt('');
        
        // Open edit modal with the generated quiz (not saved yet)
        setSelectedQuiz(result.data);
        setEditModalOpen(true);
      } else {
        setError(result.message || 'Failed to generate quiz');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Failed to generate quiz. Please check your internet connection and API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/api/quiz/${quizToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess('Quiz deleted successfully');
        fetchQuizzes();
      } else {
        setError(result.message || 'Failed to delete quiz');
      }
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz');
    } finally {
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    }
  };

  const handleAssignClick = (quiz) => {
    setQuizToAssign(quiz);
    setAssignModalOpen(true);
  };

  const handleQuizSaved = (savedQuiz) => {
    // Fetch updated quiz list
    fetchQuizzes();
    
    // Close edit modal
    setEditModalOpen(false);
    
    // Check if this was a new quiz (no _id in selectedQuiz) or an edit
    const isNewQuiz = !selectedQuiz || !selectedQuiz._id;
    
    setSelectedQuiz(null);
    
    // If this was a new quiz creation, open assign modal
    if (isNewQuiz && savedQuiz && savedQuiz._id) {
      setSuccess('Quiz created successfully! Now assign it to a class.');
      setQuizToAssign(savedQuiz);
      setAssignModalOpen(true);
    } else {
      setSuccess('Quiz updated successfully');
    }
  };

  const handleAssignSuccess = () => {
    setSuccess('Quiz assigned successfully');
    setAssignModalOpen(false);
    setQuizToAssign(null);
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          Quiz Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate quizzes with AI or create them manually, then assign to students
        </Typography>
      </Box>

      {/* Alert Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Quiz Generation Section */}
      <Card 
        sx={{ 
          mb: 4, 
          bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AutoAwesomeIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              AI Quiz Generator
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4} width="100%">
              <TextField
                fullWidth
                label="Topic or Prompt"
                placeholder="e.g., Python Functions, World War II, Photosynthesis"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerateQuiz();
                  }
                }}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={quizType}
                  label="Question Type"
                  onChange={(e) => setQuizType(e.target.value)}
                  disabled={isGenerating}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <MenuItem value="mcq">Multiple Choice</MenuItem>
                  <MenuItem value="true_false">True/False</MenuItem>
                  <MenuItem value="short_answer">Short Answer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="number"
                label="No. of Questions"
                value={numberOfQuestions}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for editing, otherwise validate
                  if (value === '') {
                    setNumberOfQuestions('');
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      setNumberOfQuestions(Math.max(1, Math.min(50, num)));
                    }
                  }
                }}
                onBlur={(e) => {
                  // Set to default if empty on blur
                  if (e.target.value === '' || e.target.value === '0') {
                    setNumberOfQuestions(5);
                  }
                }}
                disabled={isGenerating}
                InputProps={{ inputProps: { min: 1, max: 50, step: 1 } }}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleGenerateQuiz}
                disabled={isGenerating || !prompt.trim()}
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{ height: '56px', fontWeight: 600 }}
              >
                {isGenerating ? 'Generating...' : 'Generate Quiz'}
              </Button>
            </Grid>
          </Grid>

          <Alert severity="info" variant="outlined" sx={{ mt: 3, bgcolor: 'background.paper' }}>
            <Typography variant="body2">
              💡 <strong>Tip:</strong> Be specific with your prompt for better results. 
              You can generate 1-50 questions, and review/edit them before saving.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedQuiz(null);
            setEditModalOpen(true);
          }}
          sx={{ fontWeight: 600 }}
        >
          Create Quiz Manually
        </Button>
      </Box>

      {/* Quiz List Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Your Quizzes ({quizzes.length})
        </Typography>
      </Box>

      {/* Quiz List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={50} />
        </Box>
      ) : quizzes.length === 0 ? (
        <Card 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            bgcolor: 'background.paper',
            border: '2px dashed',
            borderColor: 'divider',
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom color="text.secondary">
            No quizzes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate your first quiz using AI or create one manually!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedQuiz(null);
              setEditModalOpen(true);
            }}
          >
            Create Your First Quiz
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz._id} sx={{ width: '31.333%' }}>
              <Card 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
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
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, flexWrap: 'nowrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AssignmentIcon />}
                    onClick={() => handleAssignClick(quiz)}
                  >
                    Assign
                  </Button>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditQuiz(quiz)}
                      title="Edit Quiz"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(quiz)}
                      title="Delete Quiz"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {editModalOpen && (
        <EditQuizModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedQuiz(null);
          }}
          quiz={selectedQuiz}
          onSave={handleQuizSaved}
          token={token}
        />
      )}

      {/* Assign Quiz Modal */}
      {assignModalOpen && quizToAssign && (
        <AssignQuizModal
          open={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setQuizToAssign(null);
          }}
          quiz={quizToAssign}
          classId={classId}
          onSuccess={handleAssignSuccess}
          token={token}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizTab;
