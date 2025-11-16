// src/pages/candidate/TakeQuizPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, Radio, RadioGroup,
  FormControlLabel, FormControl, Paper, LinearProgress, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

// --- QuestionRenderer Component ---
// This component decides which input to show based on question type
const QuestionRenderer = ({ question, answer, onAnswerChange }) => {
  switch (question.type) {
    case 'mcq':
      return (
        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={answer || ''}
            onChange={onAnswerChange}
          >
            {question.options.map((option, index) => (
              <FormControlLabel 
                key={index} 
                value={option} 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                    <Typography>{option}</Typography>
                    {question.optionImages && question.optionImages[index] && (
                      <Box sx={{ maxWidth: 300 }}>
                        <img 
                          src={question.optionImages[index]} 
                          alt={`Option ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            maxHeight: '200px', 
                            objectFit: 'contain',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0'
                          }} 
                        />
                      </Box>
                    )}
                  </Box>
                }
                sx={{ 
                  mb: 1, 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  alignItems: 'flex-start',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      );
    
    case 'true_false':
      return (
        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={answer || ''}
            onChange={onAnswerChange}
          >
            {question.options.map((option, index) => (
              <FormControlLabel 
                key={index} 
                value={option} 
                control={<Radio />} 
                label={option}
                sx={{ 
                  mb: 1, 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      );
      
    case 'short_answer':
      return (
        <TextField
          label="Your Answer"
          variant="outlined"
          fullWidth
          multiline
          rows={3}
          value={answer || ''}
          onChange={onAnswerChange}
          placeholder="Type your answer here..."
          helperText="Note: Capitalization doesn't matter, but spelling must be exact."
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      );
      
    default:
      return (
        <Alert severity="error">
          Unknown question type: {question.type}
        </Alert>
      );
  }
};
// --- End of QuestionRenderer Component ---

const TakeQuizPage = () => {
  const { assignmentId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Stores user's answers
  const [timeLeft, setTimeLeft] = useState(null); // Time left in seconds
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  
  // Refs for timer management
  const timerIntervalRef = useRef(null); // Holds the interval
  const hasSubmittedRef = useRef(false); // Prevents double submission
  
  // Handle submit - defined before using in effects
  const handleSubmit = async (isAutoSubmit = false) => {
    // Prevent submitting twice (e.g., timer hits 0 and user clicks submit)
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    // Close confirmation dialog if open
    setConfirmDialogOpen(false);

    // Stop the timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    try {
      const response = await fetch(`/api/candidate/submit-quiz/${assignmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answers })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit quiz');
      }

      // Clean up localStorage
      localStorage.removeItem(`quizEndTime_${assignmentId}`);
      localStorage.removeItem(`quizTimeLimit_${assignmentId}`);
      localStorage.removeItem(`quizUpdatedAt_${assignmentId}`);

      // Store result and show result dialog
      setQuizResult({
        score: data.score,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        isAutoSubmit: isAutoSubmit
      });
      setResultDialogOpen(true);

    } catch (error) {
      console.error('Submit error:', error);
      alert(error.message);
      hasSubmittedRef.current = false; // Allow re-submission on error
    }
  };

  // Handle closing result dialog and navigating back
  const handleCloseResult = () => {
    setResultDialogOpen(false);
    
    // Navigate back after closing
    if (quiz?.classId) {
      navigate(`/candidate/class/${quiz.classId}/assignments`);
    } else {
      navigate('/candidate/my-classes');
    }
  };

  // Handle opening confirmation dialog
  const handleSubmitClick = () => {
    setConfirmDialogOpen(true);
  };

  // Handle closing confirmation dialog
  const handleCancelSubmit = () => {
    setConfirmDialogOpen(false);
  };

  // Handle confirming submission
  const handleConfirmSubmit = () => {
    handleSubmit(false);
  };
  
  // Fetch the quiz data and setup refresh-proof timer
  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/candidate/assignment/${assignmentId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }
        
        const result = await response.json();
        console.log('📝 Fetched quiz data:', result.data);
        console.log('⏱️ Time limit from server:', result.data.timeLimit, 'minutes');
        console.log('📊 Has submitted:', result.data.hasSubmitted);
        console.log('📅 Is past due:', result.data.isPastDue);
        
        // Check if candidate has already submitted - redirect back to assignments
        if (result.data.hasSubmitted) {
          console.log('❌ Candidate has already submitted this quiz, redirecting...');
          // Redirect back to assignments page
          if (result.data.classId) {
            navigate(`/candidate/class/${result.data.classId}/assignments`);
          } else {
            navigate('/candidate/my-classes');
          }
          return;
        }

        // Check if quiz is past due date
        if (result.data.isPastDue) {
          console.log('❌ Quiz is past due date');
          setError('This quiz is past the due date and can no longer be taken.');
          setIsLoading(false);
          return;
        }
        
        setQuiz(result.data);
        
        // Initialize answers state
        const initialAnswers = {};
        result.data.questions.forEach(q => { 
          initialAnswers[q._id] = '' 
        });
        setAnswers(initialAnswers);
        
        // --- REFRESH-PROOF TIMER SETUP ---
        const storageKey = `quizEndTime_${assignmentId}`;
        const timeLimitKey = `quizTimeLimit_${assignmentId}`;
        const updatedAtKey = `quizUpdatedAt_${assignmentId}`;
        
        let quizEndTime = localStorage.getItem(storageKey);
        const storedTimeLimit = localStorage.getItem(timeLimitKey);
        const storedUpdatedAt = localStorage.getItem(updatedAtKey);

        // Check if timeLimit is valid
        if (!result.data.timeLimit || result.data.timeLimit <= 0) {
          console.error('❌ Invalid time limit:', result.data.timeLimit);
          setError('Invalid quiz time limit. Please contact your instructor.');
          return;
        }

        // Check if assignment was updated after timer was started
        const assignmentWasUpdated = storedUpdatedAt && result.data.updatedAt && 
                                      new Date(result.data.updatedAt) > new Date(storedUpdatedAt);
        
        // Check if time limit changed
        const timeLimitChanged = storedTimeLimit && parseInt(storedTimeLimit) !== result.data.timeLimit;

        if (assignmentWasUpdated || timeLimitChanged) {
          console.log('⚠️ Assignment was updated! Clearing old timer and restarting...');
          console.log('   Old time limit:', storedTimeLimit, 'minutes');
          console.log('   New time limit:', result.data.timeLimit, 'minutes');
          localStorage.removeItem(storageKey);
          quizEndTime = null;
        }

        if (!quizEndTime) {
          // Timer not started yet - create end time
          const endTime = Date.now() + result.data.timeLimit * 60 * 1000;
          localStorage.setItem(storageKey, endTime);
          localStorage.setItem(timeLimitKey, result.data.timeLimit.toString());
          localStorage.setItem(updatedAtKey, result.data.updatedAt || new Date().toISOString());
          quizEndTime = endTime;
          console.log('✅ Timer started. End time:', new Date(endTime).toLocaleTimeString());
          console.log('✅ Quiz duration:', result.data.timeLimit, 'minutes');
        } else {
          // Timer was already started (e.g., after refresh)
          quizEndTime = parseInt(quizEndTime, 10);
          const timeRemaining = Math.round((quizEndTime - Date.now()) / 1000);
          console.log('🔄 Resuming timer. Time remaining:', timeRemaining, 'seconds');
          
          // If stored time has already expired, clear it and restart
          if (timeRemaining <= 0) {
            console.log('⚠️ Stored timer expired, restarting with fresh time');
            localStorage.removeItem(storageKey);
            localStorage.removeItem(timeLimitKey);
            localStorage.removeItem(updatedAtKey);
            const endTime = Date.now() + result.data.timeLimit * 60 * 1000;
            localStorage.setItem(storageKey, endTime);
            localStorage.setItem(timeLimitKey, result.data.timeLimit.toString());
            localStorage.setItem(updatedAtKey, result.data.updatedAt || new Date().toISOString());
            quizEndTime = endTime;
          }
        }

        // Start the countdown interval
        timerIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const remaining = Math.round((quizEndTime - now) / 1000); // in seconds

          if (remaining <= 0) {
            setTimeLeft(0);
            clearInterval(timerIntervalRef.current);
            // Auto-submit when time runs out
            if (!hasSubmittedRef.current) {
              alert("Time's up! Your quiz will be submitted automatically.");
              handleSubmit(true); // true = auto-submit
            }
          } else {
            setTimeLeft(remaining);
          }
        }, 1000);
        // --- END TIMER SETUP ---
        
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && assignmentId) {
      fetchQuiz();
    }

    // Cleanup: stop timer when component unmounts
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [assignmentId, token]);

  // Handle changing an answer
  const handleAnswerChange = (e) => {
    const { value } = e.target;
    const questionId = quiz.questions[currentQuestionIndex]._id;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Handle navigation
  const goToNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Format time remaining (MM:SS)
  const formatTime = (seconds) => {
    if (seconds === null) return '...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = quiz ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {error.includes('already submitted') ? (
              <>
                <Typography variant="h5" color="success.main" gutterBottom>
                  ✅ Quiz Already Submitted
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  {error}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  You cannot retake this quiz unless your instructor allows retakes or changes the quiz questions.
                </Typography>
              </>
            ) : error.includes('past due') ? (
              <>
                <Typography variant="h5" color="error.main" gutterBottom>
                  ⏰ Quiz Closed
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  {error}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Contact your instructor if you need an extension.
                </Typography>
              </>
            ) : (
              <>
                <Alert severity="error">{error}</Alert>
              </>
            )}
          </Box>
          <Button 
            variant="contained" 
            onClick={() => {
              if (quiz?.classId) {
                navigate(`/candidate/class/${quiz.classId}/assignments`);
              } else {
                navigate('/candidate/my-classes');
              }
            }}
            sx={{ mt: 2 }}
          >
            Back to Assignments
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Quiz not found.</Typography>
        <Button onClick={() => navigate('/candidate/my-classes')} sx={{ mt: 2 }}>
          Back to My Classes
        </Button>
      </Box>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isTimeRunningOut = timeLeft && timeLeft < 60; // Less than 1 minute
  
  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">{quiz.title}</Typography>
          <Chip 
            icon={<AccessTimeIcon />}
            label={formatTime(timeLeft)}
            color={isTimeRunningOut ? 'error' : 'primary'}
            sx={{ fontSize: '1.2rem', py: 2.5, px: 1 }}
          />
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </Typography>
      </Paper>

      {/* Question */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
          {currentQuestion.text}
        </Typography>

        {/* Question Image */}
        {currentQuestion.questionImage && (
          <Box sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            <img 
              src={currentQuestion.questionImage} 
              alt="Question" 
              style={{ 
                width: '100%', 
                maxHeight: '400px', 
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }} 
            />
          </Box>
        )}
        
        {/* Use QuestionRenderer to display the appropriate input type */}
        <QuestionRenderer
          question={currentQuestion}
          answer={answers[currentQuestion._id]}
          onAnswerChange={handleAnswerChange}
        />
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          variant="outlined" 
          onClick={goToPrev} 
          disabled={currentQuestionIndex === 0}
          size="large"
        >
          Previous
        </Button>
        
        <Typography variant="body2" color="text.secondary">
          {Object.values(answers).filter(a => a !== '').length} of {quiz.questions.length} answered
        </Typography>
        
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleSubmitClick}
            size="large"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={goToNext}
            size="large"
          >
            Next
          </Button>
        )}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelSubmit}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Submit Quiz?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            Are you sure you want to submit your quiz? You have answered{' '}
            <strong>{Object.values(answers).filter(a => a !== '').length}</strong> out of{' '}
            <strong>{quiz.questions.length}</strong> questions.
            <br /><br />
            Once submitted, you cannot change your answers.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSubmit} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} variant="contained" color="success" autoFocus>
            Submit Quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={handleCloseResult}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {quizResult && (
            <Box>
              {/* Icon based on score */}
              <Box sx={{ mb: 3 }}>
                {quizResult.score >= 70 ? (
                  <Box sx={{ fontSize: 80 }}>🎉</Box>
                ) : quizResult.score >= 50 ? (
                  <Box sx={{ fontSize: 80 }}>👍</Box>
                ) : (
                  <Box sx={{ fontSize: 80 }}>📝</Box>
                )}
              </Box>

              {/* Title */}
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {quizResult.isAutoSubmit ? "Time's Up!" : 'Quiz Submitted!'}
              </Typography>

              {/* Score Display */}
              <Box sx={{ my: 4, p: 3, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                  {quizResult.score.toFixed(1)}%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  You got <strong>{quizResult.correctCount}</strong> out of <strong>{quizResult.totalQuestions}</strong> questions correct
                </Typography>
              </Box>

              {/* Performance Message */}
              <Box sx={{ mb: 3 }}>
                {quizResult.score >= 90 ? (
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 'medium' }}>
                    Outstanding! 🌟
                  </Typography>
                ) : quizResult.score >= 70 ? (
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 'medium' }}>
                    Great Job! ✅
                  </Typography>
                ) : quizResult.score >= 50 ? (
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 'medium' }}>
                    Good Effort! 💪
                  </Typography>
                ) : (
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                    Keep Practicing! 📚
                  </Typography>
                )}
              </Box>

              {/* Additional Info */}
              {quizResult.isAutoSubmit && (
                <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                  Your quiz was automatically submitted because time ran out.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={handleCloseResult} 
            variant="contained" 
            size="large"
            sx={{ px: 6, py: 1.5, borderRadius: 2 }}
          >
            Back to Assignments
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TakeQuizPage;
