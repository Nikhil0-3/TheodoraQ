// src/pages/ClassDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import Roster from '../components/Roster';
import AssignmentsTab from '../components/AssignmentsTab';
import QuizTab from '../components/QuizTab';
import ResultsTab from '../components/ResultsTab';
import ClassAnalytics from '../components/ClassAnalytics';
import ClassSettingsTab from '../components/ClassSettingsTab';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

// Define our tabs
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`class-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ClassDetails = () => {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  
  // Get the tab from URL parameters (e.g., ?tab=results)
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    const tabMap = {
      'roster': 0,
      'assignments': 1,
      'quizzes': 2,
      'results': 3,
      'analytics': 4,
      'settings': 5
    };
    return tabMap[tabParam] || 0; // Default to Roster (0) if no valid tab param
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab());
  
  // State for loading and class data
  const [classData, setClassData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Fetch class details function
  const fetchClassDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/classes/${classId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch class details');
      }
      
      const result = await response.json();
      setClassData(result.data);
    } catch (error) {
      console.error('Error fetching class details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch class details on component mount
  useEffect(() => {
    if (token && classId) {
      fetchClassDetails();
    }
  }, [classId, token]);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
        <Loader />
      </Box>
    );
  }

  // Error state - data failed to load
  if (!classData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Error: Class not found or you are not authorized to view this class.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 1. Class Header - Using real data */}
      <Typography variant="h4">{classData.title}</Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Course Code: {classData.courseCode}
      </Typography>

      {/* 2. Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleChange}>
          <Tab label="Roster" />
          <Tab label="Assignments" />
          <Tab label="Quizzes" />
          <Tab label="Results" />
          <Tab label="Analytics" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* 3. Tab Content - Passing real data as props */}
      <TabPanel value={currentTab} index={0}>
        <Roster 
          students={classData.students} 
          inviteCode={classData.inviteCode}
          classId={classData._id}
          onStudentRemoved={fetchClassDetails}
        />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <AssignmentsTab classId={classId} />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <QuizTab classId={classId} />
      </TabPanel>
      <TabPanel value={currentTab} index={3}>
        <ResultsTab 
          key={`results-${currentTab === 3 ? Date.now() : 'cached'}`}
          classId={classId} 
          className={classData?.title} 
          courseCode={classData?.courseCode} 
        />
      </TabPanel>
      <TabPanel value={currentTab} index={4}>
        <ClassAnalytics classId={classId} token={token} />
      </TabPanel>
      <TabPanel value={currentTab} index={5}>
        <ClassSettingsTab classData={classData} onClassUpdated={fetchClassDetails} />
      </TabPanel>
    </Box>
  );
};

export default ClassDetails;