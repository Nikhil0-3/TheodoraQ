import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Typography,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  Divider,
  Switch,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import ScaleIcon from '@mui/icons-material/Scale';

const EditAssignmentDialog = ({ open, onClose, assignment, onSuccess }) => {
  const [dueDate, setDueDate] = useState(null);
  const [timeLimit, setTimeLimit] = useState('');
  const [weightage, setWeightage] = useState('');
  const [weightageType, setWeightageType] = useState('percentage');
  const [allowRetake, setAllowRetake] = useState(false);
  const [subgroup, setSubgroup] = useState('');
  const [proctoringEnabled, setProctoringEnabled] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values when dialog opens
  useEffect(() => {
    if (assignment) {
      setDueDate(new Date(assignment.dueDate));
      setTimeLimit(assignment.timeLimit.toString());
      setWeightage((assignment.weightage || 0).toString());
      setWeightageType(assignment.weightageType || 'percentage');
      setAllowRetake(false);
      setSubgroup(assignment.subgroup || '');
      setProctoringEnabled(assignment.proctoringEnabled || false);
      setError('');
    }
  }, [assignment]);

  // Quick action buttons for extending time
  const handleQuickExtend = (minutes) => {
    const currentLimit = parseInt(timeLimit) || 0;
    setTimeLimit((currentLimit + minutes).toString());
  };

  // Quick action to reopen (extend due date by days)
  const handleQuickReopen = (days) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setDueDate(newDate);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setError('');
      setIsSubmitting(true);

      // Validation
      if (!dueDate) {
        setError('Please select a due date');
        setIsSubmitting(false);
        return;
      }

      const timeLimitNum = parseInt(timeLimit);
      if (isNaN(timeLimitNum) || timeLimitNum <= 0) {
        setError('Time limit must be a positive number');
        setIsSubmitting(false);
        return;
      }

      const weightageNum = parseFloat(weightage);
      if (isNaN(weightageNum) || weightageNum <= 0) {
        setError('Weightage must be a positive number');
        setIsSubmitting(false);
        return;
      }

      // Validate weightage ranges
      if (weightageType === 'percentage' && weightageNum > 100) {
        setError('Percentage weightage cannot exceed 100%');
        setIsSubmitting(false);
        return;
      }

      // Check if due date is in the past
      if (dueDate < new Date()) {
        const confirmPast = window.confirm(
          'The due date is in the past. This assignment will be closed. Continue?'
        );
        if (!confirmPast) {
          setIsSubmitting(false);
          return;
        }
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');

      // Make API call to update assignment
      const response = await fetch(
        `http://localhost:5000/api/assignments/${assignment._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            dueDate: dueDate.toISOString(),
            timeLimit: timeLimitNum,
            weightage: weightageNum,
            weightageType: weightageType,
            allowRetake: allowRetake,
            subgroup: subgroup.trim(),
            proctoringEnabled: proctoringEnabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update assignment');
      }

      console.log('✅ Assignment updated successfully');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(data.data);
      }

      // Close dialog
      onClose();

    } catch (err) {
      console.error('❌ Error updating assignment:', err);
      setError(err.message || 'Failed to update assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and close
  const handleCancel = () => {
    setError('');
    onClose();
  };

  if (!assignment) return null;

  const isOverdue = new Date(assignment.dueDate) < new Date();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box>
            <Typography variant="h6">Edit Assignment</Typography>
            <Typography variant="body2" color="text.secondary">
              {assignment.quizId?.title || 'Quiz'}
            </Typography>
            {isOverdue && (
              <Chip 
                label="Overdue - Reopen to allow submissions" 
                color="warning" 
                size="small" 
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* Due Date Picker */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventIcon fontSize="small" />
                Due Date & Time
              </Typography>
              <DateTimePicker
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                  },
                }}
              />
              
              {/* Quick Reopen Buttons */}
              {isOverdue && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Quick Reopen:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleQuickReopen(3)}
                    >
                      +3 Days
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleQuickReopen(7)}
                    >
                      +7 Days
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleQuickReopen(14)}
                    >
                      +14 Days
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Time Limit Input */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon fontSize="small" />
                Time Limit (minutes)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="e.g., 60"
                inputProps={{ min: 1 }}
              />
              
              {/* Quick Extend Buttons */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Quick Extend:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleQuickExtend(15)}
                  >
                    +15 min
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleQuickExtend(30)}
                  >
                    +30 min
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleQuickExtend(60)}
                  >
                    +60 min
                  </Button>
                </Stack>
              </Box>
            </Box>

            <Divider />

            {/* Branch Eligibility Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Branch Eligibility (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Leave empty for all students, or specify branches (e.g., BCE, BCY)
              </Typography>
              
              <TextField
                fullWidth
                label="Branch/Subgroup"
                value={subgroup}
                onChange={(e) => setSubgroup(e.target.value)}
                placeholder="e.g., BCE or BCE,BCY,BCS"
                helperText="Enter branch codes separated by commas for multiple branches. Leave empty for all students."
              />
            </Box>

            <Divider />

            {/* AI Proctoring Section */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={proctoringEnabled}
                    onChange={(e) => setProctoringEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      🎥 Enable AI Proctoring
                    </Typography>
                  </Box>
                }
              />
              
              <Alert severity={proctoringEnabled ? 'warning' : 'info'} variant="outlined" sx={{ mt: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  <strong>
                    {proctoringEnabled ? '🎥 AI Proctoring Enabled' : 'ℹ️ About AI Proctoring'}
                  </strong>
                </Typography>
                <Typography variant="caption" component="div">
                  {proctoringEnabled ? (
                    <>
                      Students will be monitored during the quiz using:<br/>
                      • <strong>Camera & Microphone:</strong> Required permissions<br/>
                      • <strong>Movement Detection:</strong> Flags suspicious activity<br/>
                      • <strong>Audio Monitoring:</strong> Detects conversations<br/>
                      <br/>
                      All processing is client-side. No video recording.
                    </>
                  ) : (
                    <>
                      Enable AI-powered proctoring to monitor quiz integrity.<br/>
                      Requires student camera and microphone access.
                    </>
                  )}
                </Typography>
              </Alert>
            </Box>

            <Divider />

            {/* Weightage Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScaleIcon fontSize="small" />
                Quiz Weightage
              </Typography>
              
              {/* Weightage Type Selection */}
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Weightage Type
              </FormLabel>
              <RadioGroup
                row
                value={weightageType}
                onChange={(e) => setWeightageType(e.target.value)}
                sx={{ mb: 2 }}
              >
                <FormControlLabel
                  value="percentage"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">Percentage</Typography>
                      <Typography variant="caption" color="text.secondary">
                        e.g., 20% of total grade
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="marks"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">Marks</Typography>
                      <Typography variant="caption" color="text.secondary">
                        e.g., 50 marks
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              {/* Weightage Value Input */}
              <TextField
                fullWidth
                type="number"
                label={weightageType === 'percentage' ? 'Weightage (%)' : 'Weightage (marks)'}
                value={weightage}
                onChange={(e) => setWeightage(e.target.value)}
                placeholder={weightageType === 'percentage' ? 'e.g., 20' : 'e.g., 50'}
                inputProps={{ 
                  min: 0.01, 
                  step: 0.01,
                  max: weightageType === 'percentage' ? 100 : undefined 
                }}
                helperText={
                  weightageType === 'percentage' 
                    ? 'Enter percentage value (0-100)' 
                    : 'Enter marks value'
                }
              />

              {/* Preview */}
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                <Typography variant="caption" color="text.secondary">
                  Preview:
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  This quiz is worth {weightage || '0'} {weightageType === 'percentage' ? '% of the total grade' : 'marks'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  💡 Changes will be reflected immediately in the Results tab
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Summary */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current Status:
              </Typography>
              <Typography variant="body2">
                <strong>Original Due Date:</strong> {new Date(assignment.dueDate).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Original Time Limit:</strong> {assignment.timeLimit} minutes
              </Typography>
              <Typography variant="body2">
                <strong>Original Weightage:</strong> {assignment.weightage || 0} {assignment.weightageType === 'percentage' ? '%' : 'marks'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Submissions:</strong> {assignment.submissions?.length || 0}
              </Typography>
            </Box>

            {/* Allow Retake Checkbox */}
            {assignment.submissions && assignment.submissions.length > 0 && (
              <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allowRetake}
                      onChange={(e) => setAllowRetake(e.target.checked)}
                      color="warning"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        Clear all submissions and allow retakes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ⚠️ This will delete all {assignment.submissions.length} existing submission(s) and let students retake the quiz
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EditAssignmentDialog;
