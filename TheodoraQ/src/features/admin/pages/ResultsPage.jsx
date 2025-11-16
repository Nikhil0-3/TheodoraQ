// src/features/admin/pages/ResultsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useAuth } from '../../auth/contexts/AuthContext';
import ResultsTab from '../components/ResultsTab';
import Loader from '../../../components/Loader';

const ResultsPage = () => {
  const { token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all classes when component mounts
  useEffect(() => {
    if (token) {
      fetchClasses();
    }
  }, [token]);

  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setClasses(data.data);
      } else {
        setError('Failed to load classes');
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Unable to load classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Class Results
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Search for a class to view, edit, and download student results
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Class Search/Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Autocomplete
              options={classes}
              getOptionLabel={(option) => `${option.title} (${option.courseCode})`}
              value={selectedClass}
              onChange={(event, newValue) => setSelectedClass(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search and Select Class"
                  placeholder="Type to search for a class..."
                  variant="outlined"
                  helperText="Select a class to view its results"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.courseCode} • {option.students?.length || 0} students
                    </Typography>
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              noOptionsText="No classes found"
              fullWidth
            />
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {selectedClass ? (
        <Box>
          <ResultsTab 
            classId={selectedClass._id}
            className={selectedClass.title}
            courseCode={selectedClass.courseCode}
          />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Class Selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please select a class from the dropdown above to view results
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ResultsPage;
