import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, List, ListItem, ListItemText, Button, Paper,
  CircularProgress, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

const ClassAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { classId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`http://localhost:5000/api/candidate/assignments/${classId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch assignments');
        }
        
        const result = await response.json();
        setAssignments(result.data || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && classId) {
      fetchAssignments();
    }
  }, [classId, token]);

  const handleStartQuiz = (assignmentId, quizId) => {
    // Navigate to quiz taking page
    navigate(`/candidate/assignment/${assignmentId}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/candidate/my-classes')}
        >
          Back to My Classes
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            startIcon={<PeopleIcon />}
            onClick={() => navigate(`/candidate/class/${classId}/roster`)}
          >
            View Roster
          </Button>
          
          <Button 
            variant="contained"
            startIcon={<LeaderboardIcon />}
            onClick={() => navigate(`/candidate/class/${classId}/leaderboard`)}
          >
            Leaderboard
          </Button>
        </Box>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Class Assignments
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {error}
        </Typography>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
          <Loader />
        </Box>
      ) : (
        <Paper elevation={2}>
          <List>
            {assignments.length > 0 ? (
              assignments.map(assignment => {
                  const dueDate = new Date(assignment.dueDate);
                  const now = new Date();
                  const isOverdue = dueDate < now;
                  const hasSubmitted = assignment.hasSubmitted;
                  const submissionScore = assignment.submissionScore;
                  const isLateSubmission = assignment.isLateSubmission;
                  const allowLateSubmissions = assignment.allowLateSubmissions;
                  
                  // Determine button state
                  let buttonProps = {};
                  if (hasSubmitted) {
                    buttonProps = {
                      variant: 'outlined',
                      color: 'success',
                      startIcon: <CheckCircleIcon />,
                      disabled: true,
                      children: 'Submitted'
                    };
                  } else if (isOverdue && !allowLateSubmissions) {
                    // Only disable if overdue AND late submissions not allowed
                    buttonProps = {
                      variant: 'outlined',
                      color: 'error',
                      disabled: true,
                      children: 'Overdue'
                    };
                  } else if (isOverdue && allowLateSubmissions) {
                    // Allow starting overdue quiz if late submissions are enabled
                    buttonProps = {
                      variant: 'contained',
                      color: 'warning',
                      startIcon: <PlayArrowIcon />,
                      onClick: () => handleStartQuiz(assignment._id, assignment.quizId?._id),
                      children: 'Start Quiz (Late)',
                      disabled: !assignment.quizId
                    };
                  } else {
                    buttonProps = {
                      variant: 'contained',
                      startIcon: <PlayArrowIcon />,
                      onClick: () => handleStartQuiz(assignment._id, assignment.quizId?._id),
                      children: 'Start Quiz',
                      disabled: !assignment.quizId // Disable if quizId is missing
                    };
                  }
                  
                  return (
                    <ListItem 
                      key={assignment._id}
                      divider
                      secondaryAction={
                        <Button {...buttonProps} />
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6">
                              {assignment.quizId?.title || 'Untitled Quiz'}
                            </Typography>
                            {hasSubmitted && !isLateSubmission && (
                              <Chip 
                                label="Submitted" 
                                color="success" 
                                size="small" 
                              />
                            )}
                            {hasSubmitted && isLateSubmission && (
                              <Chip 
                                label="Late Submission" 
                                color="warning" 
                                size="small" 
                              />
                            )}
                            {isOverdue && !hasSubmitted && allowLateSubmissions && (
                              <Chip 
                                label="Overdue - Can Submit Late" 
                                color="warning" 
                                size="small" 
                              />
                            )}
                            {isOverdue && !hasSubmitted && !allowLateSubmissions && (
                              <Chip 
                                label="Overdue" 
                                color="error" 
                                size="small" 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ mt: 1, display: 'block' }}>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Due:</strong> {dueDate.toLocaleString()}
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Time Limit:</strong> {assignment.timeLimit} minutes
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Questions:</strong> {assignment.quizId?.questions?.length || 0}
                            </Typography>
                            {hasSubmitted && (
                              <Typography component="span" variant="body2" color="success.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                                ✓ Your Score: {submissionScore?.toFixed(2)}%
                              </Typography>
                            )}
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                  );
                })
            ) : (
              <ListItem>
                <ListItemText 
                  primary="No assignments yet" 
                  secondary="Your instructor hasn't assigned any quizzes to this class yet."
                />
              </ListItem>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ClassAssignmentsPage;
