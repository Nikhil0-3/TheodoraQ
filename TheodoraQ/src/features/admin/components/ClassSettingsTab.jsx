import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Grid,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';

const ClassSettingsTab = ({ classData, onClassUpdated }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Form states
  const [title, setTitle] = useState(classData?.title || '');
  const [courseCode, setCourseCode] = useState(classData?.courseCode || '');
  const [description, setDescription] = useState(classData?.description || '');
  const [semester, setSemester] = useState(classData?.semester || '');
  const [academicYear, setAcademicYear] = useState(classData?.academicYear || '');
  
  // Settings states
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(classData?.allowLateSubmissions ?? true);
  const [autoGrading, setAutoGrading] = useState(classData?.autoGrading ?? true);
  const [showResults, setShowResults] = useState(classData?.showResults ?? true);
  
  // UI states
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Handle update class details
  const handleUpdateClass = async () => {
    setIsUpdating(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/classes/${classData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          courseCode,
          description,
          semester,
          academicYear,
          allowLateSubmissions,
          autoGrading,
          showResults,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update class');
      }

      setSuccessMessage('Class updated successfully!');
      if (onClassUpdated) {
        onClassUpdated();
      }
    } catch (error) {
      console.error('Error updating class:', error);
      setErrorMessage(error.message || 'Failed to update class. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete class
  const handleDeleteClass = async () => {
    if (deleteConfirmText !== classData.courseCode) {
      setErrorMessage('Course code does not match. Please type the exact course code to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/classes/${classData._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete class');
      }

      // Redirect to classes page after successful deletion
      navigate('/admin/classes');
    } catch (error) {
      console.error('Error deleting class:', error);
      setErrorMessage(error.message || 'Failed to delete class. Please try again.');
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Copy invite code to clipboard
  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(classData.inviteCode);
    setSuccessMessage('Invite code copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Regenerate invite code
  const handleRegenerateInviteCode = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch(`/api/classes/${classData._id}/regenerate-invite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to regenerate invite code');
      }

      setSuccessMessage('Invite code regenerated successfully!');
      if (onClassUpdated) {
        onClassUpdated();
      }
    } catch (error) {
      console.error('Error regenerating invite code:', error);
      setErrorMessage(error.message || 'Failed to regenerate invite code.');
    }
  };

  return (
    <Box>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Basic Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Class Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g., Fall 2024, Spring 2025"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2024-2025"
                size="small"
              />
            </Grid>
            <Grid item xs={12} width='81.3%'>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                placeholder="Add a brief description of the class..."
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleUpdateClass}
              disabled={isUpdating || !title || !courseCode}
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Class Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Class Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowLateSubmissions}
                  onChange={(e) => setAllowLateSubmissions(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Allow Late Submissions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Students can submit assignments after the due date
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={autoGrading}
                  onChange={(e) => setAutoGrading(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Auto-Grading</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically grade quiz submissions
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showResults}
                  onChange={(e) => setShowResults(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Show Results to Students</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Students can view their quiz results immediately after submission
                  </Typography>
                </Box>
              }
            />
          </Stack>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleUpdateClass}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Invite Code Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Invite Code
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip
              label={classData.inviteCode}
              color="primary"
              sx={{ fontSize: '1.1rem', py: 2.5, px: 1 }}
            />
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={handleCopyInviteCode} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Regenerate invite code">
              <IconButton onClick={handleRegenerateInviteCode} color="warning">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Alert severity="info">
            Share this code with students to allow them to join the class. You can regenerate it if needed.
          </Alert>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ mb: 3, borderColor: 'error.main', border: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="error">
            Danger Zone
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body1" fontWeight="600">
                Delete This Class
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permanently delete this class and all associated data. This action cannot be undone.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Class
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Class Permanently?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete <strong>{classData.title}</strong> and all associated:
          </DialogContentText>
          <ul>
            <li>Student enrollments ({classData.students?.length || 0} students)</li>
            <li>Assignments and submissions</li>
            <li>Quiz results and analytics</li>
          </ul>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            This action cannot be undone. All data will be permanently lost.
          </Alert>
          <TextField
            fullWidth
            label={`Type "${classData.courseCode}" to confirm`}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={classData.courseCode}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteClass}
            color="error"
            variant="contained"
            disabled={isDeleting || deleteConfirmText !== classData.courseCode}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassSettingsTab;
