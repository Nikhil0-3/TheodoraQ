import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Divider,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';

const EditQuizModal = ({ open, onClose, quiz, onSave, token }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with quiz data or empty state
  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || '');
      setQuestions(quiz.questions || []);
    } else {
      // Creating new quiz
      setTitle('');
      setQuestions([]);
    }
  }, [quiz]);

  const handleAddQuestion = () => {
    const newQuestion = {
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      answer: '',
      questionImage: '',
      optionImages: ['', '', '', ''],
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleDeleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    
    // Auto-adjust options based on question type
    if (field === 'type') {
      if (value === 'mcq') {
        newQuestions[index].options = ['', '', '', ''];
        newQuestions[index].optionImages = ['', '', '', ''];
      } else if (value === 'true_false') {
        newQuestions[index].options = ['True', 'False'];
        newQuestions[index].optionImages = ['', ''];
        if (!['True', 'False'].includes(newQuestions[index].answer)) {
          newQuestions[index].answer = '';
        }
      } else if (value === 'short_answer') {
        newQuestions[index].options = [];
        newQuestions[index].optionImages = [];
      }
    }
    
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const handleImageUpload = (qIndex, field, optIndex = null) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const newQuestions = [...questions];
        
        if (field === 'questionImage') {
          newQuestions[qIndex].questionImage = base64;
        } else if (field === 'optionImage' && optIndex !== null) {
          if (!newQuestions[qIndex].optionImages) {
            newQuestions[qIndex].optionImages = [];
          }
          newQuestions[qIndex].optionImages[optIndex] = base64;
        }
        
        setQuestions(newQuestions);
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const handleRemoveImage = (qIndex, field, optIndex = null) => {
    const newQuestions = [...questions];
    
    if (field === 'questionImage') {
      newQuestions[qIndex].questionImage = '';
    } else if (field === 'optionImage' && optIndex !== null) {
      newQuestions[qIndex].optionImages[optIndex] = '';
    }
    
    setQuestions(newQuestions);
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      setError('Quiz title is required');
      return false;
    }
    
    if (questions.length === 0) {
      setError('At least one question is required');
      return false;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.text.trim()) {
        setError(`Question ${i + 1}: Question text is required`);
        return false;
      }
      
      if (!q.answer || !q.answer.trim()) {
        setError(`Question ${i + 1}: Answer is required`);
        return false;
      }
      
      if (q.type === 'mcq') {
        if (q.options.some(opt => !opt.trim())) {
          setError(`Question ${i + 1}: All MCQ options must be filled`);
          return false;
        }
        if (!q.options.includes(q.answer)) {
          setError(`Question ${i + 1}: Answer must match one of the options exactly`);
          return false;
        }
      }
      
      if (q.type === 'true_false') {
        if (!['True', 'False'].includes(q.answer)) {
          setError(`Question ${i + 1}: True/False answer must be "True" or "False"`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    setError('');
    
    if (!validateQuiz()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Check if this is an existing quiz (has _id) or a new one
      const isExistingQuiz = quiz && quiz._id;
      
      const url = isExistingQuiz
        ? `http://localhost:5000/api/quiz/${quiz._id}`
        : 'http://localhost:5000/api/quiz/manual';
      
      const method = isExistingQuiz ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          timeLimit: 10, // Default time limit, can be changed during assignment
          questions,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Pass the saved quiz data back to parent
        // For new quiz creation, result.data contains the new quiz with _id
        // For updates, pass the existing quiz
        onSave(result.data || quiz);
      } else {
        setError(result.message || 'Failed to save quiz');
      }
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError('Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
          {quiz?._id ? 'Edit Quiz' : 'Create New Quiz'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {quiz?._id ? 'Make changes to your quiz' : 'Build your quiz from scratch'}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {/* Quiz Metadata */}
        <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Quiz Details
            </Typography>
            <TextField
              fullWidth
              label="Quiz Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive quiz title"
              required
              sx={{ bgcolor: 'background.paper' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Time limit can be set when assigning this quiz to a class
            </Typography>
          </CardContent>
        </Card>
        
        {/* Questions Section */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Questions ({questions.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            size="small"
          >
            Add Question
          </Button>
        </Box>
        
        {questions.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No questions yet. Click "Add Question" to get started!
            </Typography>
          </Card>
        ) : (
          questions.map((question, qIndex) => (
            <Card 
              key={qIndex} 
              sx={{ 
                mb: 2, 
                bgcolor: 'background.paper', 
                border: '1px solid', 
                borderColor: 'divider',
                '&:hover': {
                  boxShadow: 3,
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent>
                {/* Question Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Chip 
                    label={`Question ${qIndex + 1}`} 
                    color="primary" 
                    size="medium"
                    sx={{ fontWeight: 600 }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveQuestion(qIndex, 'up')}
                      disabled={qIndex === 0}
                      title="Move up"
                      sx={{ 
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveQuestion(qIndex, 'down')}
                      disabled={qIndex === questions.length - 1}
                      title="Move down"
                      sx={{ 
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      title="Delete question"
                      sx={{ 
                        bgcolor: 'error.lighter',
                        '&:hover': { bgcolor: 'error.light' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              
                {/* Question Content Section */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Question Content
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8} width="100%">
                      <TextField
                        fullWidth
                        label="Question Text"
                        value={question.text}
                        onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                        multiline
                        rows={2}
                        required
                        placeholder="Enter your question here..."
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Question Type</InputLabel>
                        <Select
                          value={question.type}
                          label="Question Type"
                          onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                        >
                          <MenuItem value="mcq">Multiple Choice</MenuItem>
                          <MenuItem value="true_false">True/False</MenuItem>
                          <MenuItem value="short_answer">Short Answer</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Question Image */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {question.questionImage ? (
                          <>
                            <img
                              src={question.questionImage}
                              alt="Question"
                              style={{ 
                                maxWidth: '200px', 
                                maxHeight: '200px', 
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0'
                              }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRemoveImage(qIndex, 'questionImage')}
                            >
                              Remove Image
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ImageIcon />}
                            onClick={() => handleImageUpload(qIndex, 'questionImage')}
                          >
                            Add Question Image (Optional)
                          </Button>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
                
                {/* Options Section (for MCQ and True/False) */}
                {(question.type === 'mcq' || question.type === 'true_false') && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                      Answer Options
                    </Typography>
                    {question.options.map((option, optIndex) => (
                      <Box key={optIndex} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          minWidth: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}>
                          {String.fromCharCode(65 + optIndex)}
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          value={option}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          disabled={question.type === 'true_false'}
                          required
                          placeholder={`Enter option ${String.fromCharCode(65 + optIndex)}`}
                        />
                        {question.type === 'mcq' && (
                          <Box sx={{ ml: 1 }}>
                            {question.optionImages?.[optIndex] ? (
                              <Box sx={{ position: 'relative', width: 48, height: 48 }}>
                                <img
                                  src={question.optionImages[optIndex]}
                                  alt={`Option ${optIndex + 1}`}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover', 
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  sx={{ 
                                    position: 'absolute', 
                                    top: -8, 
                                    right: -8, 
                                    bgcolor: 'background.paper',
                                    boxShadow: 1,
                                    '&:hover': { bgcolor: 'error.light' }
                                  }}
                                  onClick={() => handleRemoveImage(qIndex, 'optionImage', optIndex)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              <IconButton
                                size="small"
                                onClick={() => handleImageUpload(qIndex, 'optionImage', optIndex)}
                                title="Add image to this option"
                                sx={{ 
                                  bgcolor: 'background.paper',
                                  '&:hover': { bgcolor: 'action.selected' }
                                }}
                              >
                                <ImageIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
                
                {/* Correct Answer Section */}
                <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                  <Typography variant="subtitle2" color="success.dark" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Correct Answer
                  </Typography>
                  {question.type === 'mcq' || question.type === 'true_false' ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Correct Answer *</InputLabel>
                      <Select
                        value={question.answer}
                        label="Select Correct Answer *"
                        onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)}
                        required
                      >
                        {question.options.map((option, idx) => (
                          <MenuItem key={idx} value={option}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={String.fromCharCode(65 + idx)} 
                                size="small" 
                                color="primary"
                              />
                              {option || `Option ${idx + 1}`}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Choose which option is the correct answer</FormHelperText>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      label="Expected Answer"
                      value={question.answer}
                      onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)}
                      placeholder="Enter the expected correct answer"
                      required
                      helperText="Provide the most widely accepted answer for this question"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
        ))
        )}
        
        {/* Add Question Button */}
        {questions.length > 0 && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            sx={{ mt: 2 }}
          >
            Add Another Question
          </Button>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSaving} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          size="large"
          sx={{ minWidth: 120 }}
        >
          {isSaving ? 'Saving...' : quiz?._id ? 'Save Changes' : 'Create Quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditQuizModal;
