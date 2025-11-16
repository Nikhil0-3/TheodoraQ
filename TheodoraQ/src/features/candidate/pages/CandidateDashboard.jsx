import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Grid, CircularProgress, Chip, Card, CardContent, Stack, Divider } from '@mui/material';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Loader from '../../../components/Loader';

const CandidateDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/candidate/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setAssignments(result.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      }
      setIsLoading(false);
    };

    fetchDashboard();
  }, [token]);

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Due Today';
    } else if (diffDays === 1) {
      return 'Due Tomorrow';
    } else if (diffDays < 0) {
      return 'Overdue';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getDueDateColor = (dueDate) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'error';
    if (diffDays === 0) return 'warning';
    if (diffDays <= 2) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          fontWeight="600" 
          sx={{ mb: 1, color: 'text.primary', fontSize: { xs: '1.75rem', sm: '1.875rem' } }}
        >
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your upcoming assignments and tasks
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Upcoming Assignments Section */}
        <Grid size={{ xs: 12 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 0,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <Loader />
              </Box>
            ) : (
              <Stack spacing={0} divider={<Divider />}>
                {assignments.length > 0 ? (
                  assignments.map((assignment, index) => (
                    <Card 
                      key={assignment._id}
                      elevation={0}
                      sx={{
                        borderRadius: 0,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.02)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Grid container spacing={2} alignItems="center">
                          {/* Assignment Info */}
                          <Grid size={{ xs: 12, md: 8 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                                <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.1rem' }}>
                                  {assignment.quizId ? assignment.quizId.title : 'Quiz'}
                                </Typography>
                                <Chip 
                                  label={formatDueDate(assignment.dueDate)}
                                  color={getDueDateColor(assignment.dueDate)}
                                  size="small"
                                  sx={{ 
                                    fontWeight: 600, 
                                    height: 26,
                                    fontSize: '0.75rem'
                                  }}
                                />
                              </Box>
                              
                              <Stack spacing={0.75}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                  {assignment.classId ? assignment.classId.title : 'Unknown'}
                                  {assignment.classId?.courseCode && (
                                    <Box component="span" sx={{ 
                                      ml: 1,
                                      px: 1.5,
                                      py: 0.25,
                                      bgcolor: 'action.hover',
                                      borderRadius: 1,
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}>
                                      {assignment.classId.courseCode}
                                    </Box>
                                  )}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <EventIcon sx={{ fontSize: 16 }} />
                                    {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </Typography>
                                  
                                  {assignment.quizId?.questions && (
                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <AssignmentIcon sx={{ fontSize: 16 }} />
                                      {assignment.quizId.questions.length} questions
                                    </Typography>
                                  )}
                                  
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                                    {assignment.timeLimit} min
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid>

                          {/* Action Button */}
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
                              <Button 
                                variant="contained" 
                                size="medium"
                                fullWidth={{ xs: true, md: false }}
                                onClick={() => navigate(`/candidate/assignment/${assignment._id}`)}
                                sx={{ 
                                  borderRadius: 1.5,
                                  px: 3,
                                  py: 1.25,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  boxShadow: 'none',
                                  minWidth: { md: 140 },
                                  '&:hover': {
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                  }
                                }}
                              >
                                Start Quiz
                              </Button>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
                    <Box 
                      sx={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                      }}
                    >
                      <AssignmentIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                    </Box>
                    <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 1 }}>
                      No assignments yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
                      You're all caught up! Check back later for new assignments.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate('/candidate/my-classes')}
                      sx={{ 
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 1
                      }}
                    >
                      View My Classes
                    </Button>
                  </Box>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CandidateDashboard;
