import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
} from '@mui/material';
import Loader from '../../../components/Loader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  BarElement
);

const ClassAnalytics = ({ classId, token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchClassAnalytics();
  }, [classId, token]);

  const fetchClassAnalytics = async () => {
    if (!classId || !token) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/analytics/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch class analytics');
      }

      const result = await response.json();
      console.log('📊 Class Analytics:', result.data);
      setAnalyticsData(result.data);
    } catch (error) {
      console.error('Error fetching class analytics:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:5000/api/analytics/student/${studentId}/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student details');
      }

      const result = await response.json();
      console.log('📊 Student Details:', result.data);
      setStudentDetails(result.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
      setStudentDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    fetchStudentDetails(student.id);
  };

  const handleCloseDialog = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!analyticsData || analyticsData.studentPerformance.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No analytics data available yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Analytics will appear once students start submitting quizzes
        </Typography>
      </Box>
    );
  }

  const { classInfo, totalAssignments, totalSubmissions, classAverage, studentPerformance } = analyticsData;

  // Student Performance Line Chart (Wave Chart)
  const performanceLineData = {
    labels: studentPerformance.map(s => s.name.split(' ')[0]),
    datasets: [
      {
        label: 'Average Score',
        data: studentPerformance.map(s => s.averageScore),
        borderColor: 'rgba(33, 150, 243, 1)',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4, // This creates the smooth wave effect
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgba(33, 150, 243, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };



  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            return `Score: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
  };

  // Top 3 performers
  const topPerformers = studentPerformance.slice(0, 3);
  
  // Students needing support
  const needsSupport = studentPerformance.filter(s => s.averageScore < 60);

  return (
    <Box>
      {/* Stats Cards - Full Width Row */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2, 
        mb: 4, 
        width: '100%' 
      }}>
        <Paper sx={{ p: 2.5, textAlign: 'center', flex: 1, minWidth: 0 }}>
          <PeopleIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" fontWeight="600">
            {classInfo.totalStudents}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Students
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, textAlign: 'center', flex: 1, minWidth: 0 }}>
          <AssignmentIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
          <Typography variant="h4" fontWeight="600">
            {totalSubmissions}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submissions
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, textAlign: 'center', flex: 1, minWidth: 0 }}>
          <AssignmentIcon sx={{ fontSize: 36, color: 'info.main', mb: 1 }} />
          <Typography variant="h4" fontWeight="600">
            {totalAssignments}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assignments
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, textAlign: 'center', flex: 1, minWidth: 0 }}>
          {classAverage >= 70 ? (
            <TrendingUpIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
          ) : (
            <TrendingDownIcon sx={{ fontSize: 36, color: 'error.main', mb: 1 }} />
          )}
          <Typography variant="h4" fontWeight="600">
            {classAverage.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Class Average
          </Typography>
        </Paper>
      </Box>

      {/* Performance Chart */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Student Performance Distribution
        </Typography>
        <Box sx={{ height: { xs: 250, sm: 300 }, mt: 3 }}>
          <Line data={performanceLineData} options={lineChartOptions} />
        </Box>
      </Paper>

      {/* Performance Highlights - Full Width */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 3 }}>
          Performance Highlights
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3, 
          width: '100%' 
        }}>
          {/* Top Performers */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEventsIcon color="warning" fontSize="small" />
              <Typography variant="subtitle1" fontWeight="600">
                Top Performers
              </Typography>
            </Box>
            {topPerformers.length > 0 ? (
              <Stack spacing={2}>
                {topPerformers.map((student, index) => (
                  <Box 
                    key={student.id} 
                    onClick={() => handleStudentClick(student)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.main',
                      }
                    }}
                  >
                    <Avatar sx={{ 
                      bgcolor: index === 0 ? 'warning.main' : index === 1 ? 'action.disabled' : 'action.selected',
                      width: 40,
                      height: 40,
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight="600">
                        {student.name}
                        {student.registrationNumber && (
                          <Chip 
                            label={student.registrationNumber} 
                            size="small" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.quizzesTaken} quizzes completed
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="700" color="success.main">
                      {student.averageScore.toFixed(1)}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No data available</Typography>
            )}
          </Box>

          {/* Students Needing Support */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningIcon color="error" fontSize="small" />
              <Typography variant="subtitle1" fontWeight="600">
                Needs Support
              </Typography>
            </Box>
            {needsSupport.length > 0 ? (
              <Stack spacing={2}>
                {needsSupport.slice(0, 3).map((student) => (
                  <Box 
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    sx={{ 
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'error.main',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="body1" fontWeight="600">
                        {student.name}
                        {student.registrationNumber && (
                          <Chip 
                            label={student.registrationNumber} 
                            size="small" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Typography>
                      <Typography variant="h6" fontWeight="700" color="error.main">
                        {student.averageScore.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={student.averageScore} 
                      color="error"
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {student.quizzesTaken} quizzes completed
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Alert severity="success">All students performing well</Alert>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Student Rankings Table */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, overflowX: 'auto' }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Student Rankings
        </Typography>
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Quizzes</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Score</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentPerformance.map((student, index) => (
                <TableRow 
                  key={student.id} 
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleStudentClick(student)}
                >
                  <TableCell>
                    <Chip 
                      label={index + 1} 
                      size="small"
                      color={index < 3 ? 'primary' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" color="primary.main">
                      {student.name}
                    </Typography>
                    {student.registrationNumber && (
                      <Typography variant="caption" color="text.secondary">
                        {student.registrationNumber}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {student.email}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {student.quizzesTaken}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={student.averageScore} 
                        color={student.averageScore >= 70 ? 'success' : student.averageScore >= 50 ? 'warning' : 'error'}
                        sx={{ width: { xs: 40, sm: 60 }, height: 6, borderRadius: 1, display: { xs: 'none', sm: 'block' } }}
                      />
                      <Typography variant="body2" fontWeight="600">
                        {student.averageScore.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Chip 
                      label={
                        student.averageScore >= 90 ? 'Excellent' :
                        student.averageScore >= 80 ? 'Good' :
                        student.averageScore >= 70 ? 'Average' :
                        student.averageScore >= 60 ? 'Fair' :
                        'Needs Help'
                      }
                      size="small"
                      color={
                        student.averageScore >= 90 ? 'success' :
                        student.averageScore >= 70 ? 'info' :
                        student.averageScore >= 60 ? 'warning' :
                        'error'
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Student Details Dialog */}
      <Dialog 
        open={Boolean(selectedStudent)} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={false}
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 2, sm: 4 },
            maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight="600">
                {selectedStudent?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedStudent?.email}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <Loader />
            </Box>
          ) : studentDetails ? (
            <Box>
              {/* Performance Summary */}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Quizzes Taken
                    </Typography>
                    <Typography variant="h4" fontWeight="600" sx={{ mt: 1 }}>
                      {studentDetails.totalQuizzes}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Average Score
                    </Typography>
                    <Typography variant="h4" fontWeight="600" color="primary.main" sx={{ mt: 1 }}>
                      {studentDetails.averageScore.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="600" 
                      color={studentDetails.averageScore >= 70 ? 'success.main' : 'error.main'}
                      sx={{ mt: 1 }}
                    >
                      {studentDetails.averageScore >= 90 ? 'Excellent' :
                       studentDetails.averageScore >= 80 ? 'Good' :
                       studentDetails.averageScore >= 70 ? 'Average' :
                       studentDetails.averageScore >= 60 ? 'Fair' : 'Needs Help'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Weak Points */}
              {studentDetails.weakPoints && studentDetails.weakPoints.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningIcon color="warning" fontSize="small" />
                    <Typography variant="h6" fontWeight="600">
                      Weak Areas
                    </Typography>
                  </Box>
                  <Stack spacing={1.5}>
                    {studentDetails.weakPoints.map((weak, index) => (
                      <Paper key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Typography variant="body2" fontWeight="600" sx={{ flex: 1, pr: 2 }}>
                            {weak.questionText}
                          </Typography>
                          <Chip 
                            label={`${weak.successRate.toFixed(0)}%`}
                            size="small"
                            color={weak.successRate < 50 ? 'error' : 'warning'}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {weak.attempts} attempts · {weak.quizTitle}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Quiz History */}
              <Box>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Quiz History
                </Typography>
                {studentDetails.attempts && studentDetails.attempts.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Quiz</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Score</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>Correct</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>Incorrect</TableCell>
                          <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentDetails.attempts.map((attempt, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {attempt.quizTitle}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${attempt.score.toFixed(1)}%`}
                                size="small"
                                color={attempt.score >= 70 ? 'success' : attempt.score >= 50 ? 'warning' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                <Typography variant="body2">
                                  {attempt.correctAnswers}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                <Typography variant="body2">
                                  {attempt.incorrectAnswers}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(attempt.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>No quiz attempts yet</Alert>
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Failed to load student details</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassAnalytics;
