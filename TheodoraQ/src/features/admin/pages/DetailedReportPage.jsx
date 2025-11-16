// src/features/admin/pages/DetailedReportPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

const DetailedReportPage = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { assignmentId, submissionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(
          `http://localhost:5000/api/assignments/${assignmentId}/submissions/${submissionId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch detailed report');
        }

        const result = await response.json();
        console.log('📊 Detailed Report Data:', result.data);
        console.log('📊 Score from API:', result.data.score);
        console.log('📊 Statistics:', result.data.statistics);
        console.log('📊 Questions breakdown:', result.data.questions.map(q => ({
          text: q.questionText.substring(0, 30) + '...',
          isCorrect: q.isCorrect,
          candidateAnswer: q.candidateAnswer,
          correctAnswer: q.correctAnswer
        })));
        setReportData(result.data);
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && assignmentId && submissionId) {
      fetchReport();
    }
  }, [assignmentId, submissionId, token]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Back to Submissions
        </Button>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Report not found</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back to Submissions
        </Button>
      </Box>
    );
  }

  const { candidate, quiz, class: classInfo, score, submittedAt, statistics, questions } = reportData;

  // Check if this is an old submission without detailed answers
  const hasDetailedAnswers = questions && questions.some(q => q.candidateAnswer !== '');
  const isOldSubmission = !hasDetailedAnswers && (statistics.correctAnswers === 0 && statistics.incorrectAnswers === statistics.totalQuestions);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back to Submissions
      </Button>

      <Typography variant="h4" gutterBottom>
        Detailed Grading Report
      </Typography>

      {/* Warning for old submissions */}
      {isOldSubmission && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This submission was made before detailed answer tracking was enabled. 
            The score shown ({score.toFixed(2)}%) is from the original submission, but individual question 
            answers are not available. To see detailed answers, the candidate needs to retake this quiz.
          </Typography>
        </Alert>
      )}

      {/* Candidate Info Card */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Candidate Information
            </Typography>
            <Typography variant="body1">
              <strong>Name:</strong> {candidate.name}
            </Typography>
            {candidate.registrationNumber && (
              <Typography variant="body1" color="primary">
                <strong>Registration Number:</strong> {candidate.registrationNumber}
              </Typography>
            )}
            <Typography variant="body1" color="text.secondary">
              <strong>Email:</strong> {candidate.email}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Submitted:</strong> {new Date(submittedAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Quiz Information
            </Typography>
            <Typography variant="body1">
              <strong>Quiz:</strong> {quiz.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <strong>Class:</strong> {classInfo.title} ({classInfo.courseCode})
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Score Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Score Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Final Score
            </Typography>
            <Typography 
              variant="h3" 
              color={score >= 70 ? 'success.main' : score >= 50 ? 'warning.main' : 'error.main'}
              fontWeight="bold"
            >
              {score.toFixed(2)}%
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Correct Answers
            </Typography>
            <Typography variant="h4" color="success.main">
              {isOldSubmission ? '—' : statistics.correctAnswers}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Incorrect Answers
            </Typography>
            <Typography variant="h4" color="error.main">
              {isOldSubmission ? '—' : statistics.incorrectAnswers}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Questions
            </Typography>
            <Typography variant="h4" color="primary.main">
              {statistics.totalQuestions}
            </Typography>
          </Box>
        </Box>
        {isOldSubmission && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            * Detailed answer breakdown not available for submissions made before detailed tracking was enabled.
          </Typography>
        )}
      </Paper>

      {/* Question Breakdown */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Question-by-Question Breakdown
      </Typography>

      {isOldSubmission ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Detailed Answers Not Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This submission was created before detailed answer tracking was implemented.
            Individual question answers and correctness data are not stored for this submission.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            To view detailed grading information, the candidate will need to retake this quiz.
          </Typography>
        </Paper>
      ) : (
        <List component={Paper}>
        {questions.map((item, index) => (
          <React.Fragment key={item.questionId}>
            <ListItem alignItems="flex-start" sx={{ py: 3 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                    {item.isCorrect ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 28, flexShrink: 0 }} />
                    ) : (
                      <CancelIcon color="error" sx={{ fontSize: 28, flexShrink: 0 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="div">
                        Question {index + 1}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {item.questionText}
                      </Typography>
                      {item.questionType === 'multiple_choice' && item.options.length > 0 && (
                        <Box sx={{ mt: 2, ml: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Options:
                          </Typography>
                          {item.options.map((option, optIndex) => (
                            <Typography 
                              key={optIndex} 
                              variant="body2" 
                              sx={{ 
                                ml: 1,
                                color: option === item.correctAnswer ? 'success.main' : 
                                       option === item.candidateAnswer && !item.isCorrect ? 'error.main' : 
                                       'text.secondary'
                              }}
                            >
                              • {option}
                              {option === item.correctAnswer && ' ✓ (Correct)'}
                              {option === item.candidateAnswer && !item.isCorrect && ' ✗ (Your Answer)'}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box sx={{ ml: 5 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 1, bgcolor: item.isCorrect ? 'success.lighter' : 'error.lighter' }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Candidate's Answer:
                      </Typography>
                      <Typography 
                        variant="body1"
                        color={item.isCorrect ? 'success.dark' : 'error.dark'}
                      >
                        {item.candidateAnswer || '(No answer provided)'}
                      </Typography>
                    </Paper>
                    {!item.isCorrect && (
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.lighter' }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Correct Answer:
                        </Typography>
                        <Typography variant="body1" color="success.dark">
                          {item.correctAnswer}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < questions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
      )}

      {/* Footer Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Back to Submissions
        </Button>
      </Box>
    </Box>
  );
};

export default DetailedReportPage;
