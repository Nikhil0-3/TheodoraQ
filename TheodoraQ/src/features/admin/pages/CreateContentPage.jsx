// src/pages/CreateContentPage.jsx
import React, { useState } from 'react';
import {
  Box, Typography, Button, Tabs, Tab, TextField, Paper,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  IconButton, Alert, Chip, Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loader from '../../../components/Loader';

// TabPanel helper component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const CreateContentPage = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { token } = useAuth();
  const navigate = useNavigate();

  // AI Generator State
  const [prompt, setPrompt] = useState('');
  const [quizType, setQuizType] = useState('mcq');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Manual Creator State
  const [manualTitle, setManualTitle] = useState('My New Quiz');
  const [manualTimeLimit, setManualTimeLimit] = useState(10);
  const [manualSubgroup, setManualSubgroup] = useState('');
  const [manualQuestions, setManualQuestions] = useState([
    { text: 'Sample Question 1', type: 'mcq', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'Option A' }
  ]);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // 3. Update the generate function
  const handleGenerate = async () => {
    setIsLoading(true); // Show loading spinner
    setAiResult(null); // Clear old results

    try {
      // 4. Call our new backend API!
      // The proxy in vite.config.js makes "/api" work
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt, quizType }),
      });

      const data = await response.json();
      
      // Check if the request was successful
      if (data.success) {
        // Extract the actual quiz data from the response
        setAiResult(data.data);
      } else {
        // Handle error response from backend
        setAiResult({
          error: true,
          message: data.message || 'Failed to generate quiz',
          rawText: data.rawText
        });
      }
      
    } catch (error) {
      setAiResult({
        error: true,
        message: 'Network error: Could not connect to server'
      });
    }

    setIsLoading(false); // Hide loading spinner
  };

  // Manual Quiz Creator Functions
  const handleQuestionChange = (e, qIndex) => {
    const newQuestions = [...manualQuestions];
    newQuestions[qIndex][e.target.name] = e.target.value;
    setManualQuestions(newQuestions);
  };

  const handleOptionChange = (e, qIndex, oIndex) => {
    const newQuestions = [...manualQuestions];
    newQuestions[qIndex].options[oIndex] = e.target.value;
    setManualQuestions(newQuestions);
  };

  const handleAddOption = (qIndex) => {
    const newQuestions = [...manualQuestions];
    newQuestions[qIndex].options.push(`Option ${newQuestions[qIndex].options.length + 1}`);
    setManualQuestions(newQuestions);
  };

  const handleDeleteOption = (qIndex, oIndex) => {
    const newQuestions = [...manualQuestions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(oIndex, 1);
      setManualQuestions(newQuestions);
    }
  };

  const handleAddQuestion = () => {
    setManualQuestions([
      ...manualQuestions,
      { text: 'New Question', type: 'mcq', options: ['Option A', 'Option B'], answer: 'Option A' }
    ]);
  };

  const handleDeleteQuestion = (qIndex) => {
    if (manualQuestions.length > 1) {
      setManualQuestions(manualQuestions.filter((_, index) => index !== qIndex));
    }
  };

  const handleQuestionTypeChange = (e, qIndex) => {
    const newQuestions = [...manualQuestions];
    const newType = e.target.value;
    newQuestions[qIndex].type = newType;
    
    // Update options and answer based on type
    if (newType === 'true_false') {
      newQuestions[qIndex].options = ['True', 'False'];
      newQuestions[qIndex].answer = 'True';
    } else if (newType === 'short_answer') {
      newQuestions[qIndex].options = [];
      newQuestions[qIndex].answer = 'Sample answer';
    } else if (newType === 'mcq' && newQuestions[qIndex].options.length === 0) {
      newQuestions[qIndex].options = ['Option A', 'Option B', 'Option C', 'Option D'];
      newQuestions[qIndex].answer = 'Option A';
    }
    
    setManualQuestions(newQuestions);
  };

  const handleSaveManualQuiz = async () => {
    setManualError('');
    setManualSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/quiz/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: manualTitle, 
          questions: manualQuestions,
          timeLimit: manualTimeLimit,
          subgroup: manualSubgroup
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save quiz');
      }

      setManualSuccess('Quiz saved successfully! Redirecting to content library...');
      setTimeout(() => navigate('/admin/content'), 2000);

    } catch (err) {
      setManualError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      {/* Page Title */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Create New Content
      </Typography>

      {/* Tabs */}
      <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Generate with AI" />
        <Tab label="Create Manually" />
      </Tabs>

      {/* "Generate with AI" Tab Content */}
      <TabPanel value={currentTab} index={0}>
        <Paper sx={{ p: 3, background: '#f9f9f9' }}>
          <Typography variant="h6" gutterBottom>
            AI Content Generator
          </Typography>
          
          {/* Gemini-like Prompt Box */}
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="e.g., 'Create a 10-question multiple-choice quiz on the Roman Republic.'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            sx={{ mb: 2, background: '#fff' }}
          />
          
          {/* Form controls at the bottom */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            
            {/* Options */}
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={quizType}
                label="Question Type"
                onChange={(e) => setQuizType(e.target.value)}
                sx={{ background: '#fff' }}
              >
                <MenuItem value="mcq">Multiple Choice</MenuItem>
                <MenuItem value="short_answer">Short Answer</MenuItem>
                <MenuItem value="true_false">True/False</MenuItem>
              </Select>
            </FormControl>
            
            {/* Generate Button */}
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
            </Button>
          </Box>
        </Paper>
        
        {/* "Editable Draft" Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5">Editable Draft</Typography>
          <Paper sx={{ p: 3, mt: 2, minHeight: 200, border: '1px dashed grey' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Loader />
              </Box>
            ) : aiResult ? (
              aiResult.error ? (
                // Display error message
                <Box sx={{ color: 'error.main' }}>
                  <Typography variant="h6" color="error">Error</Typography>
                  <Typography>{aiResult.message}</Typography>
                  {aiResult.rawText && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Raw AI Response:</Typography>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{aiResult.rawText}</pre>
                    </Box>
                  )}
                </Box>
              ) : (
                // Display successful result
                <Box>
                  <Typography variant="h6">{aiResult.title}</Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(aiResult.questions, null, 2)}</pre>
                </Box>
              )
            ) : (
              <Typography color="text.secondary">
                Your generated questions will appear here...
              </Typography>
            )}
          </Paper>
        </Box>
      </TabPanel>

      {/* "Create Manually" Tab Content */}
      <TabPanel value={currentTab} index={1}>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Quiz Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Quiz Settings
            </Typography>
            <TextField
              label="Quiz Title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Time Limit (minutes)"
              type="number"
              value={manualTimeLimit}
              onChange={(e) => setManualTimeLimit(parseInt(e.target.value) || 10)}
              inputProps={{ min: 1, max: 180 }}
              sx={{ width: 200 }}
            />
            <TextField
              label="Subgroup (e.g., BCE, BCY)"
              value={manualSubgroup || ''}
              onChange={(e) => setManualSubgroup(e.target.value.toUpperCase())}
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
              helperText="Specify the branch or subgroup for this quiz."
            />
          </Paper>

          {/* Questions */}
          {manualQuestions.map((q, qIndex) => (
            <Paper key={qIndex} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Question {qIndex + 1}
                </Typography>
                <IconButton 
                  onClick={() => handleDeleteQuestion(qIndex)} 
                  color="error"
                  disabled={manualQuestions.length === 1}
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
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={q.type}
                  label="Question Type"
                  onChange={(e) => handleQuestionTypeChange(e, qIndex)}
                >
                  <MenuItem value="mcq">Multiple Choice</MenuItem>
                  <MenuItem value="true_false">True/False</MenuItem>
                  <MenuItem value="short_answer">Short Answer</MenuItem>
                </Select>
              </FormControl>

              {/* MCQ Options */}
              {q.type === 'mcq' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Options
                  </Typography>
                  {q.options.map((opt, oIndex) => (
                    <Box key={oIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        label={`Option ${oIndex + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(e, qIndex, oIndex)}
                        fullWidth
                        variant="outlined"
                        size="small"
                      />
                      <IconButton 
                        onClick={() => handleDeleteOption(qIndex, oIndex)}
                        color="error"
                        disabled={q.options.length <= 2}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => handleAddOption(qIndex)}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Add Option
                  </Button>
                </Box>
              )}

              {/* True/False Display */}
              {q.type === 'true_false' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Options
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip label="True" color="primary" />
                    <Chip label="False" color="primary" />
                  </Stack>
                </Box>
              )}

              {/* Short Answer Display */}
              {q.type === 'short_answer' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    This will be a text input field for students
                  </Typography>
                </Box>
              )}

              {/* Answer Field */}
              <TextField
                label="Correct Answer"
                name="answer"
                value={q.answer}
                onChange={(e) => handleQuestionChange(e, qIndex)}
                fullWidth
                multiline={q.type === 'short_answer'}
                rows={q.type === 'short_answer' ? 3 : 1}
                variant="outlined"
                helperText={
                  q.type === 'mcq' 
                    ? "Must exactly match one of the options above"
                    : q.type === 'true_false'
                    ? "Must be either 'True' or 'False'"
                    : "Provide a sample correct answer"
                }
              />
            </Paper>
          ))}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddQuestion}
              variant="outlined"
              size="large"
            >
              Add Question
            </Button>
            
            <Button
              onClick={handleSaveManualQuiz}
              variant="contained"
              color="primary"
              size="large"
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={24} /> : 'Save Quiz'}
            </Button>
          </Box>

          {/* Error/Success Messages */}
          {manualError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {manualError}
            </Alert>
          )}
          {manualSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {manualSuccess}
            </Alert>
          )}
        </Box>
      </TabPanel>
    </Box>
  );
};

export default CreateContentPage;