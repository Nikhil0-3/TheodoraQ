import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Divider,
  Avatar,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import Loader from '../../../components/Loader';
import ClassAnalytics from '../components/ClassAnalytics';
import { useAuth } from '../../auth/contexts/AuthContext';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import RefreshIcon from '@mui/icons-material/Refresh';

const Analytics = () => {
  const { token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive insights into class performance and student analytics
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SchoolIcon sx={{ fontSize: 30, color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="600">
                Select a Class
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a class to view detailed analytics and student performance
              </Typography>
            </Box>
            {selectedClass && (
              <Tooltip title="Refresh data">
                <IconButton onClick={fetchClasses} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Loader />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
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
                  placeholder="Type to search..."
                  variant="outlined"
                  fullWidth
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        <SchoolIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={500}>
                          {option.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.courseCode}  {option.students?.length || 0} students enrolled
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                );
              }}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              noOptionsText="No classes found"
            />
          )}

          {selectedClass && (
            <Paper 
              elevation={0} 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.light'
              }}
            >
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  icon={<SchoolIcon />}
                  label={selectedClass.title}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Course: ${selectedClass.courseCode}`}
                  variant="outlined"
                />
                <Chip
                  icon={<PeopleIcon />}
                  label={`${selectedClass.students?.length || 0} Students`}
                  variant="outlined"
                />
              </Stack>
            </Paper>
          )}
        </CardContent>
      </Card>

      {selectedClass ? (
        <ClassAnalytics classId={selectedClass._id} token={token} />
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom fontWeight={500}>
              No Class Selected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please select a class from the dropdown above to view comprehensive analytics,
              <br />
              including class performance metrics and individual student insights.
            </Typography>
            
            {classes.length > 0 && (
              <Paper sx={{ p: 2, maxWidth: 600, mx: 'auto', bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center">
                  Quick Stats
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }} justifyContent="center" alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {classes.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Classes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Students
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {Math.round(classes.reduce((sum, c) => sum + (c.students?.length || 0), 0) / classes.length) || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg per Class
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Analytics;