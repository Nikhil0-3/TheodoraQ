// src/components/AssignmentsTab.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditAssignmentDialog from './EditAssignmentDialog';
import Loader from '../../../components/Loader';
import DeleteIcon from '@mui/icons-material/Delete';

const AssignmentsTab = ({ classId }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Submissions dialog state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isSubmissionsDialogOpen, setIsSubmissionsDialogOpen] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState(null);

  // Fetch assignments for this class
  const fetchAssignments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/assignments/class/${classId}`, {
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

  useEffect(() => {
    if (token && classId) {
      fetchAssignments();
    }
  }, [classId, token]);

  // Fetch submissions for a specific assignment
  const fetchSubmissions = async (assignmentId) => {
    setIsLoadingSubmissions(true);
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
      setSubmissions(result.data.submissions || []);
      setSelectedAssignment(result.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      alert('Failed to load submissions: ' + error.message);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Handle opening submissions dialog
  const handleViewSubmissions = async (assignment) => {
    setIsSubmissionsDialogOpen(true);
    await fetchSubmissions(assignment._id);
  };

  // Handle closing submissions dialog
  const handleCloseDialog = () => {
    setIsSubmissionsDialogOpen(false);
    setSelectedAssignment(null);
    setSubmissions([]);
  };

  // Handle opening edit dialog
  const handleEditClick = (assignment) => {
    setAssignmentToEdit(assignment);
    setEditDialogOpen(true);
  };

  // Handle successful edit
  const handleEditSuccess = (updatedAssignment) => {
    // Refresh assignments list
    fetchAssignments();
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate average score
  const calculateAverageScore = (submissions) => {
    if (submissions.length === 0) return 0;
    const total = submissions.reduce((sum, sub) => sum + sub.score, 0);
    return (total / submissions.length).toFixed(2);
  };

  // Sort assignments by date of posting (createdAt) descending
  const sortedAssignments = [...assignments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (assignments.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AssessmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No assignments yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create a quiz from the Content Library and assign it to this class.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Assignments
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="left"><strong>Quiz Title</strong></TableCell>
              <TableCell align="center"><strong>Subgroup</strong></TableCell>
              <TableCell align="center"><strong>Weightage</strong></TableCell>
              <TableCell align="center"><strong>Due Date</strong></TableCell>
              <TableCell align="center"><strong>Time Limit</strong></TableCell>
              <TableCell align="center"><strong>Submissions</strong></TableCell>
              <TableCell align="center"><strong>Avg Score</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAssignments.map((assignment) => {
              const submissionCount = assignment.submissions?.length || 0;
              const avgScore = submissionCount > 0 
                ? calculateAverageScore(assignment.submissions) 
                : '-';
              const isOverdue = new Date(assignment.dueDate) < new Date();

              return (
                <TableRow key={assignment._id} hover>
                  <TableCell align="left">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {assignment.quizId?.title || 'Unknown Quiz'}
                      </Typography>
                      <Tooltip title="Edit quiz in Content Library">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/content/edit/${assignment.quizId?._id}`)}
                        >
                          <EditNoteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {assignment.subgroup ? (
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            background: '#222',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            border: '1px solid #222',
                            minWidth: assignment.subgroup.includes(',') ? 120 : 70,
                            textAlign: 'center',
                          }}
                        >
                          {assignment.subgroup.includes(',') 
                            ? assignment.subgroup.split(',').map(b => b.trim()).join(', ')
                            : assignment.subgroup
                          }
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            background: '#4CAF50',
                            color: '#fff',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            minWidth: 70,
                            textAlign: 'center',
                          }}
                        >
                          ALL
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        assignment.weightageType === 'percentage'
                          ? `${assignment.weightage || 0}%`
                          : `${assignment.weightage || 0} marks`
                      }
                      color={assignment.weightageType === 'percentage' ? 'secondary' : 'success'}
                      size="small"
                      sx={{ fontWeight: 600, minWidth: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {formatDate(assignment.dueDate)}
                      {isOverdue && (
                        <Chip label="Overdue" color="error" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{assignment.timeLimit} mins</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={submissionCount}
                      color={submissionCount > 0 ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {avgScore !== '-' ? `${avgScore}%` : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Tooltip title="Edit assignment">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditClick(assignment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewSubmissions(assignment)}
                        disabled={submissionCount === 0}
                      >
                        Quick View
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => navigate(`/admin/assignment/${assignment._id}/submissions`)}
                        disabled={submissionCount === 0}
                      >
                        Full View
                      </Button>
                      <Tooltip title="Delete assignment">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this assignment?')) {
                              try {
                                const response = await fetch(`http://localhost:5000/api/assignments/${assignment._id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                  },
                                });
                                if (!response.ok) {
                                  throw new Error('Failed to delete assignment');
                                }
                                fetchAssignments();
                              } catch (err) {
                                alert('Error deleting assignment: ' + err.message);
                              }
                            }
                          }}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submissions Dialog */}
      <Dialog 
        open={isSubmissionsDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAssignment && (
            <Box>
              <Typography variant="h6">Submissions</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedAssignment.quizTitle} - {selectedAssignment.courseCode}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {isLoadingSubmissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, minHeight: '200px' }}>
              <Loader />
            </Box>
          ) : submissions.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No submissions yet
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Score</strong></TableCell>
                    <TableCell><strong>Submitted At</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((submission, index) => (
                    <TableRow key={index}>
                      <TableCell>{submission.candidateId?.name || 'Unknown'}</TableCell>
                      <TableCell>{submission.candidateId?.email || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${submission.score.toFixed(2)}%`}
                          color={submission.score >= 70 ? 'success' : submission.score >= 50 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(submission.submittedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {selectedAssignment && submissions.length > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Statistics:</strong>
              </Typography>
              <Typography variant="body2">
                Total Submissions: {submissions.length}
              </Typography>
              <Typography variant="body2">
                Average Score: {calculateAverageScore(submissions)}%
              </Typography>
              <Typography variant="body2">
                Highest Score: {Math.max(...submissions.map(s => s.score)).toFixed(2)}%
              </Typography>
              <Typography variant="body2">
                Lowest Score: {Math.min(...submissions.map(s => s.score)).toFixed(2)}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <EditAssignmentDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        assignment={assignmentToEdit}
        onSuccess={handleEditSuccess}
      />
    </Box>
  );
};

export default AssignmentsTab;
