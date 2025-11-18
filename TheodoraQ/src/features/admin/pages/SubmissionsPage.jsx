// src/pages/SubmissionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

const SubmissionsPage = () => {
  const [submissionData, setSubmissionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { assignmentId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`http://localhost:5000/api/assignments/${assignmentId}/submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch submissions');
        }

        const result = await response.json();
        setSubmissionData(result.data);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && assignmentId) {
      fetchSubmissions();
    }
  }, [assignmentId, token]);

  // Calculate statistics
  const calculateStats = (submissions) => {
    if (!submissions || submissions.length === 0) return null;
    
    const scores = submissions.map(s => s.score);
    const average = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const highest = Math.max(...scores).toFixed(2);
    const lowest = Math.min(...scores).toFixed(2);
    
    return { average, highest, lowest };
  };

  const stats = submissionData?.submissions ? calculateStats(submissionData.submissions) : null;

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
          Back to Assignments
        </Button>
      </Box>
    );
  }

  if (!submissionData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Assignment not found</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back to Assignments
        </Button>
      </Box>
    );
  }

  const submissions = submissionData.submissions || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back to Assignments
      </Button>

      <Typography variant="h4" gutterBottom>
        Quiz Submissions
      </Typography>

      {/* Assignment Info */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          {submissionData.quizTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Class: {submissionData.classTitle} ({submissionData.courseCode})
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Due Date: {new Date(submissionData.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Time Limit: {submissionData.timeLimit} minutes
        </Typography>
      </Paper>

      {/* Statistics */}
      {stats && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Submissions
              </Typography>
              <Typography variant="h5">
                {submissions.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Average Score
              </Typography>
              <Typography variant="h5" color="primary">
                {stats.average}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Highest Score
              </Typography>
              <Typography variant="h5" color="success.main">
                {stats.highest}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Lowest Score
              </Typography>
              <Typography variant="h5" color="error.main">
                {stats.lowest}%
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Submissions Table */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Click on a candidate's row to see a detailed report.
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Candidate Name</strong></TableCell>
              <TableCell><strong>Registration Number</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Submitted At</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Activity</strong></TableCell>
              <TableCell align="right"><strong>Score</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.length > 0 ? (
              submissions.map((sub, index) => {
                const isSuspicious = sub.tabSwitchCount > 3 || !sub.wasFullscreen;
                return (
                  <TableRow 
                    key={index} 
                    hover
                    onClick={() => navigate(`/admin/submission/${assignmentId}/${sub._id}`)}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: isSuspicious ? 'rgba(255, 152, 0, 0.08)' : 'inherit',
                      '&:hover': {
                        backgroundColor: isSuspicious ? 'rgba(255, 152, 0, 0.15)' : 'action.hover',
                      }
                    }}
                  >
                    <TableCell>
                      {sub.candidateId?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {sub.candidateId?.registrationNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {sub.candidateId?.email || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.submittedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {sub.isLateSubmission ? (
                        <Chip
                          label="Late"
                          color="warning"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="On Time"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isSuspicious ? (
                        <Chip
                          label={`⚠️ ${sub.tabSwitchCount} switches`}
                          color="error"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Clean"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {!sub.wasFullscreen && (
                        <Chip
                          label="No Fullscreen"
                          color="error"
                          size="small"
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${sub.score.toFixed(2)}%`}
                        color={sub.score >= 70 ? 'success' : sub.score >= 50 ? 'warning' : 'error'}
                        size="medium"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No submissions found for this assignment yet.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Submissions will appear here once candidates complete the quiz.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SubmissionsPage;
