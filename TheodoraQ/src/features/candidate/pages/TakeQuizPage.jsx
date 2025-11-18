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
import ProctoringSys from '../../../utils/ProctoringSys';

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
  
  // Anti-cheat tracking states
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [escCount, setEscCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // AI Proctoring system
  const [proctoringSys, setProctoringSys] = useState(null);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [showProctoringDialog, setShowProctoringDialog] = useState(false);
  const [proctoringPermissionGranted, setProctoringPermissionGranted] = useState(false);
  const [quizReadyToStart, setQuizReadyToStart] = useState(false);
  
  // Refs for timer management
  const timerIntervalRef = useRef(null); // Holds the interval
  const hasSubmittedRef = useRef(false); // Prevents double submission
  const warningTimeoutRef = useRef(null); // For warning display timeout
  const quizContainerRef = useRef(null); // For fullscreen container
  const intentionalExitRef = useRef(false); // Track intentional fullscreen exits
  
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

    // Get proctoring data if proctoring was active
    let proctoringData = null;
    if (proctoringSys && proctoringActive) {
      try {
        proctoringData = proctoringSys.getViolations();
        console.log('🎥 Proctoring data collected:', proctoringData);
        
        // CRITICAL: Stop monitoring and revoke all permissions
        proctoringSys.stopMonitoring();
        setProctoringActive(false);
        setCameraPreview(null);
        
        console.log('✅ Camera and microphone permissions revoked');
      } catch (error) {
        console.error('❌ Error collecting proctoring data:', error);
        // Still try to stop monitoring even if error
        try {
          proctoringSys.stopMonitoring();
        } catch (e) {
          console.error('❌ Error stopping monitoring:', e);
        }
      }
    }

    try {
      const response = await fetch(`/api/candidate/submit-quiz/${assignmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          answers: answers,
          tabSwitchCount: tabSwitchCount,
          escCount: escCount,
          wasFullscreen: isFullscreen,
          proctoringData: proctoringData
        })
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
        isAutoSubmit: isAutoSubmit,
        showResults: data.showResults,
        isLateSubmission: data.isLateSubmission
      });

      // Exit fullscreen after submission
      await exitFullscreen();

      setResultDialogOpen(true);

        // Force page reload after short delay to restore all permissions
        setTimeout(() => {
          window.location.reload();
        }, 1500); // 1.5s delay to allow result dialog to show

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
  const handleSubmitClick = async () => {
    // Exit fullscreen before showing dialog
    await exitFullscreen();
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
        console.log('🔓 Allow late submissions:', result.data.allowLateSubmissions);
        
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

        // Check if quiz is past due date AND late submissions are not allowed
        if (result.data.isPastDue && !result.data.allowLateSubmissions) {
          console.log('❌ Quiz is past due date and late submissions not allowed');
          setError('This quiz is past the due date and late submissions are not allowed.');
          setIsLoading(false);
          return;
        }
        
        setQuiz(result.data);
        
        // Check if proctoring is enabled - show permission dialog
        if (result.data.proctoringEnabled) {
          console.log('🎥 Proctoring enabled - requesting permissions...');
          console.log('📊 Quiz data:', result.data);
          setShowProctoringDialog(true);
          console.log('📋 Dialog state set to true');
          // Don't start quiz yet - wait for permission grant
          setIsLoading(false); // Stop loading to show dialog
          return; // Exit early - timer will start after permission granted
        } else {
          console.log('ℹ️ No proctoring for this quiz');
          // No proctoring - quiz ready to start immediately
          setQuizReadyToStart(true);
        }
        
        // Initialize answers state
        const initialAnswers = {};
        result.data.questions.forEach(q => { 
          initialAnswers[q._id] = '' 
        });
        setAnswers(initialAnswers);
        
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
      // Cleanup proctoring system
      if (proctoringSys) {
        console.log('🎥 Cleaning up proctoring system on unmount');
        proctoringSys.stopMonitoring();
      }
      // Clear warning timeout
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [assignmentId, token]);

  // Anti-Cheat: Fullscreen enforcement (Quiz container only)
  const enterFullscreen = async () => {
    try {
      const elem = quizContainerRef.current;
      if (!elem) {
        console.log('Quiz container ref not ready');
        return;
      }

      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.log('Fullscreen request failed:', err);
      // Only show warning if it's not a permission error
      if (err.name !== 'NotAllowedError') {
        showWarningMessage('⚠️ Please enable fullscreen mode for the quiz.');
      }
    }
  };

  const exitFullscreen = async () => {
    try {
      intentionalExitRef.current = true; // Mark as intentional exit
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.log('Exit fullscreen failed:', err);
    }
  };

  // Start quiz timer when ready (after proctoring permissions granted or if no proctoring)
  useEffect(() => {
    if (!quiz || !quizReadyToStart || timerIntervalRef.current) return;

    console.log('⏱️ Starting quiz timer...');
    
    // --- REFRESH-PROOF TIMER SETUP ---
    const storageKey = `quizEndTime_${assignmentId}`;
    const timeLimitKey = `quizTimeLimit_${assignmentId}`;
    const updatedAtKey = `quizUpdatedAt_${assignmentId}`;
    
    let quizEndTime = localStorage.getItem(storageKey);
    const storedTimeLimit = localStorage.getItem(timeLimitKey);
    const storedUpdatedAt = localStorage.getItem(updatedAtKey);

    // Check if timeLimit is valid
    if (!quiz.timeLimit || quiz.timeLimit <= 0) {
      console.error('❌ Invalid time limit:', quiz.timeLimit);
      setError('Invalid quiz time limit. Please contact your instructor.');
      return;
    }

    // Check if assignment was updated after timer was started
    const assignmentWasUpdated = storedUpdatedAt && quiz.updatedAt && 
                                  new Date(quiz.updatedAt) > new Date(storedUpdatedAt);
    
    // Check if time limit changed
    const timeLimitChanged = storedTimeLimit && parseInt(storedTimeLimit) !== quiz.timeLimit;

    if (assignmentWasUpdated || timeLimitChanged) {
      console.log('⚠️ Assignment was updated! Clearing old timer and restarting...');
      console.log('   Old time limit:', storedTimeLimit, 'minutes');
      console.log('   New time limit:', quiz.timeLimit, 'minutes');
      localStorage.removeItem(storageKey);
      quizEndTime = null;
    }

    if (!quizEndTime) {
      // Timer not started yet - create end time
      const endTime = Date.now() + quiz.timeLimit * 60 * 1000;
      localStorage.setItem(storageKey, endTime);
      localStorage.setItem(timeLimitKey, quiz.timeLimit.toString());
      localStorage.setItem(updatedAtKey, quiz.updatedAt || new Date().toISOString());
      quizEndTime = endTime;
      console.log('✅ Timer started. End time:', new Date(endTime).toLocaleTimeString());
      console.log('✅ Quiz duration:', quiz.timeLimit, 'minutes');
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
        const endTime = Date.now() + quiz.timeLimit * 60 * 1000;
        localStorage.setItem(storageKey, endTime);
        localStorage.setItem(timeLimitKey, quiz.timeLimit.toString());
        localStorage.setItem(updatedAtKey, quiz.updatedAt || new Date().toISOString());
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
    
  }, [quiz, quizReadyToStart, assignmentId]);

  // Handle proctoring permission request
  const handleGrantProctoringPermission = async () => {
    console.log('🎥 User clicked Grant Permissions button');
    console.log('🎥 Requesting camera and microphone permissions...');
    console.log('⏳ IMPORTANT: Your browser will now ask for camera and microphone access');
    console.log('⏳ Please click "Allow" when the permission dialog appears');
    
    const procSys = new ProctoringSys();
    
    try {
      console.log('🎥 Initializing ProctoringSys...');
      const initResult = await procSys.initialize();
      console.log('🎥 ProctoringSys initialization result:', initResult);
      
      if (initResult.success) {
        console.log('✅ Proctoring system initialized successfully');
        
        // Set up violation callback for real-time alerts
        procSys.setViolationCallback((type, violations) => {
          const messages = {
            'noFaceDetected': '⚠️ No face detected - Please stay in camera view',
            'multipleFacesDetected': '⚠️ Multiple faces detected',
            'lookingAway': '⚠️ Looking away detected - Keep eyes on screen',
            'suspiciousMovements': '⚠️ Suspicious movement detected',
            'audioAnomalies': '⚠️ Audio anomaly detected'
          };
          
          setWarningMessage(messages[type] || `⚠️ Proctoring violation: ${type}`);
          setShowWarning(true);
          
          // Clear warning after 4 seconds
          if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
          }
          warningTimeoutRef.current = setTimeout(() => {
            setShowWarning(false);
          }, 4000);
        });
        
        // Start monitoring
        console.log('🎥 Starting monitoring...');
        procSys.startMonitoring();
        setProctoringSys(procSys);
        setProctoringActive(true);
        
        // Set camera preview element
        const videoElement = procSys.getVideoElement();
        if (videoElement) {
          console.log('🎥 Setting camera preview element');
          setCameraPreview(videoElement);
        }
        
        console.log('🎥 Proctoring monitoring started');
        
        // Close dialog and start quiz
        console.log('🎥 Closing dialog and starting quiz...');
        setShowProctoringDialog(false);
        setProctoringPermissionGranted(true);
        setQuizReadyToStart(true);
        console.log('✅ Quiz ready to start set to true');
      } else {
        console.error('❌ Failed to initialize proctoring:', initResult.message);
        console.error('❌ Error type:', initResult.error);
        alert(`⚠️ Unable to start proctoring\n\n${initResult.message}\n\nThe quiz requires camera and microphone access to proceed.`);
        // Reset dialog so user can try again
        setShowProctoringDialog(true);
      }
    } catch (error) {
      console.error('❌ Proctoring initialization error:', error);
      alert(`⚠️ Failed to start proctoring system\n\n${error.message}\n\nPlease check camera/microphone permissions and try again.`);
      // Reset dialog so user can try again
      setShowProctoringDialog(true);
    }
  };

  const handleCancelProctoringPermission = () => {
    console.log('❌ User cancelled proctoring permission');
    setShowProctoringDialog(false);
    // Redirect back to assignments
    if (quiz?.classId) {
      navigate(`/candidate/class/${quiz.classId}/assignments`);
    } else {
      navigate('/candidate/my-classes');
    }
  };

  useEffect(() => {
    if (!quiz || !quizReadyToStart) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      
      setIsFullscreen(isNowFullscreen);
      
      // Only show warning if it's not an intentional exit and quiz not submitted
      if (!isNowFullscreen && !hasSubmittedRef.current && !intentionalExitRef.current) {
        setEscCount(prev => prev + 1);
        showWarningMessage('⚠️ Fullscreen exited! Click Next/Previous to re-enter.');
      }
      
      // Reset intentional exit flag after a short delay
      if (!isNowFullscreen && intentionalExitRef.current) {
        setTimeout(() => {
          intentionalExitRef.current = false;
        }, 500);
      }
    };

    // Add small delay to ensure DOM is ready before requesting fullscreen
    const fullscreenTimer = setTimeout(() => {
      enterFullscreen();
    }, 100);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(fullscreenTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [quiz, quizReadyToStart]);

  // Anti-Cheat: Tab switch detection
  useEffect(() => {
    if (!quiz) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmittedRef.current) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          showWarningMessage(`⚠️ Tab switch detected! (${newCount} time${newCount > 1 ? 's' : ''}) - This activity is being monitored.`);
          return newCount;
        });
      }
    };

    const handleBlur = () => {
      if (!hasSubmittedRef.current && document.hasFocus && !document.hasFocus()) {
        showWarningMessage('⚠️ Window focus lost! Please stay on this page.');
      }
    };

    // Disable right-click to prevent opening context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      showWarningMessage('⚠️ Right-click is disabled during the quiz.');
      return false;
    };

    // Prevent copy-paste
    const handleCopy = (e) => {
      e.preventDefault();
      showWarningMessage('⚠️ Copying is disabled during the quiz.');
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      showWarningMessage('⚠️ Pasting is disabled during the quiz.');
      return false;
    };

    // Prevent common keyboard shortcuts
    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (Developer tools)
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 83) // Ctrl+S
      ) {
        e.preventDefault();
        showWarningMessage('⚠️ This keyboard shortcut is disabled during the quiz.');
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [quiz]);

  // Function to show warning messages
  const showWarningMessage = (message) => {
    setWarningMessage(message);
    setShowWarning(true);
    
    // Clear any existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    // Hide warning after 4 seconds
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false);
    }, 4000);
  };

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
    // Re-enter fullscreen if user pressed ESC
    if (!isFullscreen && !hasSubmittedRef.current) {
      enterFullscreen();
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
    // Re-enter fullscreen if user pressed ESC
    if (!isFullscreen && !hasSubmittedRef.current) {
      enterFullscreen();
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

  // Show waiting screen if quiz not ready to start (waiting for proctoring permission)
  // BUT: Don't show if proctoring dialog is open (dialog will show instead)
  if (!quizReadyToStart && !showProctoringDialog) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Preparing Quiz...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {quiz?.proctoringEnabled 
              ? 'Waiting for proctoring permissions...' 
              : 'Loading quiz content...'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isTimeRunningOut = timeLeft && timeLeft < 60; // Less than 1 minute
  const isPastDue = quiz.dueDate && new Date() > new Date(quiz.dueDate);
  
  return (
    <Box 
      ref={quizContainerRef}
      sx={{ 
        p: 3, 
        maxWidth: 900, 
        mx: 'auto', 
        userSelect: 'none',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      {/* Anti-Cheat Warning Banner */}
      {showWarning && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            position: 'fixed', 
            top: 80, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 9999,
            minWidth: '400px',
            boxShadow: 3
          }}
          onClose={() => setShowWarning(false)}
        >
          {warningMessage}
        </Alert>
      )}

      {/* Camera Preview Box (Top Right Corner) */}
      {proctoringActive && cameraPreview && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 9998,
            borderRadius: 2,
            overflow: 'hidden',
            border: '3px solid',
            borderColor: 'primary.main',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <Box
            sx={{
              width: 240,
              height: 180,
              bgcolor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            ref={(el) => {
              if (el && cameraPreview && !el.contains(cameraPreview)) {
                cameraPreview.style.width = '100%';
                cameraPreview.style.height = '100%';
                cameraPreview.style.objectFit = 'cover';
                cameraPreview.style.display = 'block';
                cameraPreview.style.transform = 'scaleX(-1)'; // Mirror effect
                el.appendChild(cameraPreview);
              }
            }}
          />
        </Paper>
      )}

      {/* Anti-Cheat Info Alert */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Anti-Cheat System Active:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Fullscreen mode is required</li>
          <li>Tab switching is being monitored (Switches: {tabSwitchCount})</li>
          <li>Fullscreen exits are tracked (ESC Count: {escCount})</li>
          <li>Right-click, copy-paste, and shortcuts are disabled</li>
          <li>All activities are logged for review</li>
          {proctoringActive && <li>🎥 AI Proctoring: Camera and microphone monitoring active</li>}
        </ul>
      </Alert>

      {/* Late Submission Warning */}
      {isPastDue && quiz.allowLateSubmissions && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Late Submission:</strong> This quiz is past the due date. Your submission will be marked as late.
        </Alert>
      )}

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

      {/* AI Proctoring Permission Dialog */}
      <Dialog
        open={showProctoringDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ fontSize: 60, mb: 2 }}>🎥</Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            AI Proctoring Required
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            This quiz requires AI-powered proctoring to ensure academic integrity.
          </Alert>

          <Alert severity="warning" sx={{ mb: 3, bgcolor: '#fff3e0' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ⚠️ Browser Permission Required
            </Typography>
            <Typography variant="body2">
              After clicking "Grant Permissions", your browser will show a popup asking to allow camera and microphone access. You MUST click <strong>"Allow"</strong> to proceed with the quiz.
            </Typography>
          </Alert>
          
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            You will be asked to grant permission for:
          </Typography>
          
          <Box sx={{ pl: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ mr: 1 }}>📹</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Camera Access</Typography>
                <Typography variant="body2" color="text.secondary">
                  To verify your identity and ensure you're alone during the quiz
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ mr: 1 }}>🎤</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Microphone Access</Typography>
                <Typography variant="body2" color="text.secondary">
                  To detect unusual sounds or conversations
                </Typography>
              </Box>
            </Box>
          </Box>

          <Alert severity="warning" variant="outlined" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>What we monitor:</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              • Face detection (single person only)<br/>
              • Looking away from screen<br/>
              • Audio anomalies<br/>
              • Suspicious movements
            </Typography>
          </Alert>

          <Alert severity="success" variant="outlined" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>🔒 Privacy Protected:</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              • No video recording<br/>
              • All processing in your browser<br/>
              • Only violation counts are stored
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button 
            onClick={handleCancelProctoringPermission} 
            variant="outlined"
            size="large"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGrantProctoringPermission}
            variant="contained"
            size="large"
            startIcon={<Typography>🎥</Typography>}
          >
            Grant Permissions & Start Quiz
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
              {/* Icon based on score or submission */}
              <Box sx={{ mb: 3 }}>
                {quizResult.showResults ? (
                  quizResult.score >= 70 ? (
                    <Box sx={{ fontSize: 80 }}>🎉</Box>
                  ) : quizResult.score >= 50 ? (
                    <Box sx={{ fontSize: 80 }}>👍</Box>
                  ) : (
                    <Box sx={{ fontSize: 80 }}>📝</Box>
                  )
                ) : (
                  <Box sx={{ fontSize: 80 }}>✅</Box>
                )}
              </Box>

              {/* Title */}
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {quizResult.isAutoSubmit ? "Time's Up!" : 'Quiz Submitted!'}
              </Typography>

              {/* Late Submission Warning */}
              {quizResult.isLateSubmission && (
                <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                  <strong>Late Submission</strong> - This quiz was submitted after the due date.
                </Alert>
              )}

              {/* Conditional Score Display or Confirmation Message */}
              {quizResult.showResults ? (
                <>
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
                </>
              ) : (
                <>
                  {/* Confirmation Message when results are hidden */}
                  <Box sx={{ my: 4, p: 3, bgcolor: 'success.lighter', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main', mb: 2 }}>
                      Submission Successful!
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Your quiz has been submitted successfully. Results will be shared by your instructor.
                    </Typography>
                  </Box>
                </>
              )}

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
