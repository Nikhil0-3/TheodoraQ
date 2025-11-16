// src/features/admin/pages/EditQuizPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Paper, IconButton,
  CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel,
  Card, CardMedia, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

const EditQuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch quiz data on load
  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/quiz/${quizId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }
        
        const result = await response.json();
        const quizData = result.data || result;
        
        // Ensure all questions have image fields (for backward compatibility)
        if (quizData.questions) {
          quizData.questions = quizData.questions.map(q => ({
            ...q,
            questionImage: q.questionImage || '',
            optionImages: q.optionImages || (q.options ? new Array(q.options.length).fill('') : [])
          }));
        }
        
        setQuiz(quizData);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (token && quizId) {
      fetchQuiz();
    }
  }, [quizId, token]);

  // Handle saving the entire quiz
  const handleSaveQuiz = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    
    try {
      // Log what we're about to save
      console.log('Saving quiz with data:', {
        title: quiz.title,
        timeLimit: quiz.timeLimit,
        questionsCount: quiz.questions.length,
        questions: quiz.questions.map((q, i) => ({
          index: i,
          text: q.text,
          hasQuestionImage: !!q.questionImage,
          optionImagesCount: q.optionImages?.filter(img => img).length || 0
        }))
      });
      
      const response = await fetch(`/api/quiz/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: quiz.title, 
          questions: quiz.questions,
          timeLimit: quiz.timeLimit,
          subgroup: quiz.subgroup || ''
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save error response:', errorData);
        throw new Error(errorData.message || 'Failed to save quiz');
      }
      
      const result = await response.json();
      console.log('Quiz saved successfully:', result);
      
      setSuccess('Quiz saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Question Management Functions ---

  const handleTitleChange = (e) => {
    setQuiz({ ...quiz, title: e.target.value });
  };

  const handleTimeLimitChange = (e) => {
    setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) || 10 });
  };

  const handleQuestionChange = (e, qIndex) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex][e.target.name] = e.target.value;
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleOptionChange = (e, qIndex, oIndex) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options[oIndex] = e.target.value;
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleAddOption = (qIndex) => {
    const newQuestions = [...quiz.questions];
    const optionNumber = newQuestions[qIndex].options.length + 1;
    newQuestions[qIndex].options.push(`Option ${optionNumber}`);
    // Also add empty image slot
    if (!newQuestions[qIndex].optionImages) {
      newQuestions[qIndex].optionImages = [];
    }
    newQuestions[qIndex].optionImages.push('');
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleDeleteOption = (qIndex, oIndex) => {
    const newQuestions = [...quiz.questions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(oIndex, 1);
      // Also remove image slot
      if (newQuestions[qIndex].optionImages) {
        newQuestions[qIndex].optionImages.splice(oIndex, 1);
      }
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      text: 'New Question',
      type: 'mcq',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      answer: 'Option 1',
      questionImage: '', // Add image field
      optionImages: ['', '', '', ''] // Add option images
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const handleDeleteQuestion = (qIndex) => {
    if (quiz.questions.length > 1) {
      const newQuestions = quiz.questions.filter((_, index) => index !== qIndex);
      setQuiz({ ...quiz, questions: newQuestions });
    } else {
      setError('Quiz must have at least one question');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleTypeChange = (e, qIndex) => {
    const newQuestions = [...quiz.questions];
    const newType = e.target.value;
    
    newQuestions[qIndex].type = newType;
    
    // Update options based on type
    if (newType === 'true_false') {
      newQuestions[qIndex].options = ['True', 'False'];
      newQuestions[qIndex].answer = 'True';
      newQuestions[qIndex].optionImages = ['', ''];
    } else if (newType === 'short_answer') {
      newQuestions[qIndex].options = [];
      newQuestions[qIndex].optionImages = [];
      newQuestions[qIndex].answer = '';
    } else if (newType === 'mcq' && newQuestions[qIndex].options.length === 0) {
      newQuestions[qIndex].options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
      newQuestions[qIndex].answer = 'Option 1';
      newQuestions[qIndex].optionImages = ['', '', '', ''];
    }
    
    setQuiz({ ...quiz, questions: newQuestions });
  };

  // --- Image Handling Functions ---
  
  const handleQuestionImageUpload = (e, qIndex) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newQuestions = [...quiz.questions];
        newQuestions[qIndex].questionImage = reader.result;
        setQuiz({ ...quiz, questions: newQuestions });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQuestionImage = (qIndex) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].questionImage = '';
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleOptionImageUpload = (e, qIndex, oIndex) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newQuestions = [...quiz.questions];
        if (!newQuestions[qIndex].optionImages) {
          newQuestions[qIndex].optionImages = new Array(newQuestions[qIndex].options.length).fill('');
        }
        newQuestions[qIndex].optionImages[oIndex] = reader.result;
        setQuiz({ ...quiz, questions: newQuestions });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveOptionImage = (qIndex, oIndex) => {
    const newQuestions = [...quiz.questions];
    if (newQuestions[qIndex].optionImages) {
      newQuestions[qIndex].optionImages[oIndex] = '';
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  // --- Render ---

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader />
      </Box>
    );
  }

  if (error && !quiz) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button onClick={() => navigate('/admin/content')} startIcon={<ArrowBackIcon />}>
          Back to Library
        </Button>
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>Quiz not found.</Alert>
        <Button onClick={() => navigate('/admin/content')} startIcon={<ArrowBackIcon />}>
          Back to Library
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          onClick={() => navigate('/admin/content')} 
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to Library
        </Button>
        <Typography variant="h4">Edit Quiz</Typography>
        <Box sx={{ width: 150 }} /> {/* Spacer for centering */}
      </Box>

      {/* Success/Error Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Quiz Title */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quiz Settings</Typography>
        <TextField
          label="Quiz Title"
          value={quiz.title}
          onChange={handleTitleChange}
          fullWidth
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Time Limit (minutes)"
          type="number"
          value={quiz.timeLimit || 10}
          onChange={handleTimeLimitChange}
          fullWidth
          variant="outlined"
          inputProps={{ min: 1, max: 180 }}
          helperText="Time limit for completing the quiz (1-180 minutes)"
        />
        <TextField
          label="Branch Code"
          value={quiz.subgroup || ''}
          onChange={e => setQuiz({ ...quiz, subgroup: e.target.value.toUpperCase() })}
          placeholder="e.g., BCE"
          fullWidth
          margin="normal"
          sx={{ mb: 2 }}
          helperText="Edit the branch code for this quiz."
        />
      </Paper>

      {/* Questions */}
      <Typography variant="h5" gutterBottom>Questions ({quiz.questions.length})</Typography>
      
      {quiz.questions.map((q, qIndex) => (
        <Paper key={qIndex} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Question {qIndex + 1}</Typography>
            <IconButton 
              onClick={() => handleDeleteQuestion(qIndex)} 
              color="error"
              disabled={quiz.questions.length === 1}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          
          <TextField
            label="Question Text"
            name="text"
            value={q.text}
            onChange={(e) => handleQuestionChange(e, qIndex)}
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          {/* Question Image Upload */}
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              component="label"
              size="small"
            >
              {q.questionImage ? 'Change Question Image' : 'Add Question Image'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleQuestionImageUpload(e, qIndex)}
              />
            </Button>
            {q.questionImage && (
              <Card sx={{ mt: 2, maxWidth: 400, position: 'relative' }}>
                <IconButton
                  onClick={() => handleRemoveQuestionImage(qIndex)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                  }}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
                <CardMedia
                  component="img"
                  image={q.questionImage}
                  alt="Question"
                  sx={{ maxHeight: 300, objectFit: 'contain' }}
                />
              </Card>
            )}
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Question Type</InputLabel>
            <Select
              value={q.type}
              label="Question Type"
              onChange={(e) => handleTypeChange(e, qIndex)}
            >
              <MenuItem value="mcq">Multiple Choice</MenuItem>
              <MenuItem value="true_false">True/False</MenuItem>
              <MenuItem value="short_answer">Short Answer</MenuItem>
            </Select>
          </FormControl>

          {/* MCQ Options */}
          {q.type === 'mcq' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Options:</Typography>
              {q.options.map((opt, oIndex) => (
                <Box key={oIndex} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label={`Option ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(e, qIndex, oIndex)}
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                    {q.options.length > 2 && (
                      <IconButton 
                        onClick={() => handleDeleteOption(qIndex, oIndex)} 
                        color="error"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  {/* Option Image Upload */}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ImageIcon />}
                      component="label"
                      size="small"
                    >
                      {q.optionImages && q.optionImages[oIndex] ? 'Change Image' : 'Add Image'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleOptionImageUpload(e, qIndex, oIndex)}
                      />
                    </Button>
                    {q.optionImages && q.optionImages[oIndex] && (
                      <Card sx={{ mt: 1, maxWidth: 200, position: 'relative' }}>
                        <IconButton
                          onClick={() => handleRemoveOptionImage(qIndex, oIndex)}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                          }}
                          size="small"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <CardMedia
                          component="img"
                          image={q.optionImages[oIndex]}
                          alt={`Option ${oIndex + 1}`}
                          sx={{ maxHeight: 150, objectFit: 'contain' }}
                        />
                      </Card>
                    )}
                  </Box>
                </Box>
              ))}
              <Button 
                startIcon={<AddIcon />} 
                onClick={() => handleAddOption(qIndex)}
                size="small"
                variant="outlined"
              >
                Add Option
              </Button>
            </Box>
          )}

          {/* True/False Options (Display only) */}
          {q.type === 'true_false' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Options:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label="True" color="primary" variant="outlined" />
                <Chip label="False" color="primary" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Students will choose between True or False
              </Typography>
            </Box>
          )}

          {/* Short Answer - Paragraph Field */}
          {q.type === 'short_answer' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Answer Format:</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Students will type a paragraph response. Set the expected answer below for reference.
              </Typography>
            </Box>
          )}

          {/* Answer Field */}
          {q.type === 'short_answer' ? (
            <TextField
              label="Expected Answer (for reference)"
              name="answer"
              value={q.answer}
              onChange={(e) => handleQuestionChange(e, qIndex)}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              sx={{ mt: 2 }}
              helperText="This is the model answer you expect. Students can write their own response."
            />
          ) : (
            <TextField
              label="Correct Answer"
              name="answer"
              value={q.answer}
              onChange={(e) => handleQuestionChange(e, qIndex)}
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
              helperText={
                q.type === 'mcq' 
                  ? "Must exactly match one of the options above" 
                  : "Must be either 'True' or 'False'"
              }
            />
          )}
        </Paper>
      ))}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddQuestion}
          variant="outlined"
          size="large"
        >
          Add Question
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => navigate('/admin/content')}
            variant="outlined"
            size="large"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveQuiz}
            variant="contained"
            color="primary"
            size="large"
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EditQuizPage;
