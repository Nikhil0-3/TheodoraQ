import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Alert, Typography, RadioGroup, FormControlLabel, Radio, FormLabel,
  Autocomplete, Chip, Box
} from '@mui/material';
import { useAuth } from '../../auth/contexts/AuthContext';

const AssignQuizModal = ({ open, onClose, quiz, classId, onSuccess, token }) => {
  const [classes, setClasses] = useState([]); // Admin's classes
  const [selectedClass, setSelectedClass] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeLimit, setTimeLimit] = useState(60); // Default 60 mins
  const [weightage, setWeightage] = useState(0); // Weightage value
  const [weightageType, setWeightageType] = useState('percentage'); // 'percentage' or 'marks'
  const [selectedBranches, setSelectedBranches] = useState([]); // Array of selected branches
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Common branch options (suggestions, but not limited to these)
  const commonBranchOptions = [
    'ALL', // Special option for all branches
    'BCE',
    'BAI',
    'BCY',
    'MIM',
    'BBA',
    'BCA',
    'CSE',
    'ECE',
    'ME',
    'CE',
    'EEE',
    'IT',
    'AIDS',
    'AIML',
    'DS',
  ];

  // Fetch the Admin's classes when the modal opens
  useEffect(() => {
    if (open) {
      // Pre-select classId if provided
      if (classId) {
        setSelectedClass(classId);
      }
      
      // Set default time limit from quiz if available
      if (quiz?.timeLimit) {
        setTimeLimit(quiz.timeLimit);
      }
      
      const fetchClasses = async () => {
        try {
          const response = await fetch('/api/classes', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch classes');
          }
          
          const result = await response.json();
          setClasses(result.data || []);
        } catch (err) {
          console.error('Error fetching classes:', err);
          setError('Could not load your classes. Please try again.');
        }
      };
      fetchClasses();
    } else {
      // Reset form when modal closes
      setSelectedClass('');
      setDueDate('');
      setTimeLimit(60);
      setWeightage(0);
      setWeightageType('percentage');
      setSelectedBranches([]);
      setError('');
      setSuccess('');
    }
  }, [open, token, classId, quiz]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!quiz?._id || !selectedClass || !dueDate || !timeLimit || selectedBranches.length === 0) {
      setError('All fields are required. Please select at least one branch.');
      return;
    }

    // Validate weightage based on type
    if (weightageType === 'percentage' && (weightage < 0 || weightage > 100)) {
      setError('Weightage percentage must be between 0 and 100.');
      return;
    }
    
    if (weightageType === 'marks' && weightage < 0) {
      setError('Weightage marks must be a positive number.');
      return;
    }

    setIsLoading(true);

    // Determine subgroup value to send to backend
    let subgroupValue;
    if (selectedBranches.includes('ALL')) {
      subgroupValue = null; // null means all branches
    } else if (selectedBranches.length === 1) {
      subgroupValue = selectedBranches[0]; // Single branch
    } else {
      subgroupValue = selectedBranches.join(','); // Multiple branches as comma-separated
    }

    try {
      const response = await fetch('http://localhost:5000/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: quiz._id,
          classId: selectedClass,
          dueDate,
          timeLimit: Number(timeLimit),
          weightage: Number(weightage),
          weightageType: weightageType,
          subgroup: subgroupValue
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create assignment.');
      }

      setSuccess('Quiz assigned successfully!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error creating assignment:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h6" component="span">Assign Quiz to Class</Typography>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {quiz && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{quiz.title}</strong>
            </Typography>
            <Typography variant="caption">
              {quiz.questions?.length || 0} questions • {quiz.timeLimit || 10} minutes
            </Typography>
          </Alert>
        )}

        {/* Only show class selector if classId not provided */}
        {!classId && (
          <FormControl fullWidth margin="normal" sx={{ mt: 1 }}>
            <InputLabel id="class-select-label">Select Class *</InputLabel>
            <Select
              labelId="class-select-label"
              value={selectedClass}
              label="Select Class *"
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={isLoading || !!success}
            >
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>
                    {cls.title} ({cls.courseCode})
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Loading classes...</MenuItem>
              )}
            </Select>
          </FormControl>
        )}
        
        <Autocomplete
          multiple
          fullWidth
          freeSolo
          options={commonBranchOptions}
          value={selectedBranches}
          onChange={(event, newValue) => {
            // If "ALL" is selected, clear other selections and only keep "ALL"
            if (newValue.includes('ALL')) {
              setSelectedBranches(['ALL']);
            } else {
              // Convert all values to uppercase and trim spaces
              const cleanedValues = newValue.map(v => 
                typeof v === 'string' ? v.toUpperCase().trim() : v
              );
              setSelectedBranches(cleanedValues);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Target Branches *"
              placeholder="Select from suggestions or type custom branch codes"
              margin="normal"
              helperText={
                selectedBranches.includes('ALL')
                  ? '✓ Quiz will be visible to all students in the class'
                  : selectedBranches.length > 0
                  ? `✓ Quiz will be visible to ${selectedBranches.join(', ')} students only`
                  : 'Select from suggestions or type custom branch codes (press Enter to add)'
              }
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={index}
                label={option}
                {...getTagProps({ index })}
                color={option === 'ALL' ? 'primary' : 'secondary'}
                sx={{ fontWeight: 600 }}
              />
            ))
          }
          disabled={isLoading || !!success}
          sx={{ mt: 1 }}
        />
        
        {/* Info box for branch selection */}
        <Alert severity="info" variant="outlined" sx={{ mt: 2, mb: 1 }}>
          <Typography variant="caption" display="block" gutterBottom>
            <strong>📌 Branch Selection Tips:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            • Select <strong>"ALL"</strong> to make quiz available to all students<br/>
            • Choose from common suggestions or type custom branch codes<br/>
            • Type and press <strong>Enter</strong> to add custom branches (e.g., MECH, CHEM, BIO)<br/>
            • Select multiple branches to assign to specific groups<br/>
            • Branch matching is case-insensitive
          </Typography>
        </Alert>
        
        <TextField
          label="Due Date & Time *"
          type="datetime-local"
          fullWidth
          margin="normal"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={isLoading || !!success}
        />

        <TextField
          label="Time Limit (minutes) *"
          type="number"
          fullWidth
          margin="normal"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          inputProps={{ min: 1 }}
          disabled={isLoading || !!success}
          helperText="How long students have to complete the quiz once started"
        />

        <FormControl component="fieldset" margin="normal" fullWidth>
          <FormLabel component="legend">Weightage Type</FormLabel>
          <RadioGroup
            row
            value={weightageType}
            onChange={(e) => setWeightageType(e.target.value)}
          >
            <FormControlLabel 
              value="percentage" 
              control={<Radio />} 
              label="Percentage (%)" 
              disabled={isLoading || !!success}
            />
            <FormControlLabel 
              value="marks" 
              control={<Radio />} 
              label="Marks" 
              disabled={isLoading || !!success}
            />
          </RadioGroup>
        </FormControl>

        <TextField
          label={weightageType === 'percentage' ? 'Weightage (%)' : 'Weightage (Marks)'}
          type="number"
          fullWidth
          margin="normal"
          value={weightage}
          onChange={(e) => setWeightage(e.target.value)}
          inputProps={{ 
            min: 0, 
            max: weightageType === 'percentage' ? 100 : undefined 
          }}
          disabled={isLoading || !!success}
          helperText={
            weightageType === 'percentage' 
              ? 'Percentage weightage of this assignment in the final grade (0-100). Leave as 0 for unweighted.'
              : 'Marks weightage for this assignment. Leave as 0 for unweighted.'
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading || !!success}
          size="large"
        >
          {isLoading ? 'Assigning...' : 'Assign Quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignQuizModal;
