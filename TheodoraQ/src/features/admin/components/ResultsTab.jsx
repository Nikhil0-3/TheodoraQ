import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Button,
  Stack,
  Divider,
  Tooltip,
  Avatar,
  alpha,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  EmojiEvents as TrophyIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  PersonOutline as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/contexts/AuthContext';
import Loader from '../../../components/Loader';

const ResultsTab = ({ classId, className, courseCode }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classStats, setClassStats] = useState({
    totalStudents: 0,
    averageScore: 0,
    passRate: 0,
    topScore: 0,
  });

  useEffect(() => {
    if (classId) {
      loadResults();
    }
  }, [classId]);

  const loadResults = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:5000/api/assignments/class/${classId}/results`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      
      if (data.success) {
        const processed = processResults(data.data, data.assignments);
        setStudentResults(processed.students);
        setAssignments(data.assignments || []);
        setClassStats(processed.stats);
      } else {
        setError(data.message || 'Failed to load results');
      }
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Unable to load class results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processResults = (submissions, assignmentsList) => {
    const studentMap = new Map();
    
    console.log('🔍 DEBUG: Processing Results');
    console.log('Total submissions received:', submissions.length);
    console.log('Total assignments in this class:', assignmentsList.length);
    console.log('Assignments list:', assignmentsList.map(a => ({ 
      id: a._id, 
      title: a.quizTitle, 
      weight: a.weightage,
      subgroup: a.subgroup || 'All students'
    })));
    
    // Helper function to extract branch from registration number
    // e.g., "2024BCE001" -> "BCE", "22BCE10100" -> "BCE", "23BCE10101" -> "BCE"
    const extractBranch = (registrationNumber) => {
      if (!registrationNumber) return null;
      
      // Clean the registration number
      const regNum = registrationNumber.toString().toUpperCase().trim();
      
      // Try multiple patterns:
      // Pattern 1: 22BCE10100 (2 digit year + branch + number)
      let match = regNum.match(/^\d{2}([A-Z]{2,4})\d+$/);
      if (match) return match[1];
      
      // Pattern 2: 2024BCE001 (4 digit year + branch + number)
      match = regNum.match(/^\d{4}([A-Z]{2,4})\d+$/);
      if (match) return match[1];
      
      // Pattern 3: BCE001 (just branch + number)
      match = regNum.match(/^([A-Z]{2,4})\d+$/);
      if (match) return match[1];
      
      // Pattern 4: Look for any sequence of 2-4 capital letters
      match = regNum.match(/([A-Z]{2,4})/);
      if (match) return match[1];
      
      console.warn(`⚠️ Could not extract branch from: ${registrationNumber}`);
      return null;
    };
    
    // Group submissions by student
    // IMPORTANT: Only process submissions that have corresponding assignments in assignmentsList
    // This ensures we don't include submissions from other classes
    submissions.forEach((sub) => {
      const assignmentId = sub.assignmentId?._id || sub.assignmentId;
      const assignmentIdStr = assignmentId.toString(); // Ensure it's a string for consistent lookup
      
      // Verify this assignment belongs to the current class
      const assignment = assignmentsList.find(a => a._id.toString() === assignmentIdStr);
      if (!assignment) {
        console.warn(`⚠️ Skipping submission for assignment ${assignmentIdStr} - not in current class assignments`);
        return; // Skip this submission
      }
      
      const studentId = sub.candidateId?._id || sub.candidateId;
      const studentName = sub.candidateId?.name || 'Unknown';
      const studentEmail = sub.candidateId?.email || '';
      const regNo = sub.candidateId?.registrationNumber || sub.candidateId?.regNo || `REG-${(studentId || '').slice(-4) || '0000'}`;
      const studentBranch = extractBranch(regNo);
      
      console.log(`📝 Student: ${studentName}, Reg: ${regNo}, Extracted Branch: ${studentBranch}`);
      
      // Check if student is eligible for this assignment based on subgroup
      if (assignment.subgroup) {
        const assignmentSubgroup = assignment.subgroup.toUpperCase();
        
        // Handle multiple branches (comma-separated)
        if (assignmentSubgroup.includes(',')) {
          const allowedBranches = assignmentSubgroup.split(',').map(b => b.trim());
          if (studentBranch && !allowedBranches.includes(studentBranch.toUpperCase())) {
            console.log(`⚠️ Skipping ${studentName} (${studentBranch}) submission for ${assignment.quizTitle} - assigned to ${assignmentSubgroup} only`);
            return; // Student not eligible for this assignment
          }
        } else {
          // Single branch
          if (studentBranch && studentBranch.toUpperCase() !== assignmentSubgroup) {
            console.log(`⚠️ Skipping ${studentName} (${studentBranch}) submission for ${assignment.quizTitle} - assigned to ${assignmentSubgroup} only`);
            return; // Student not eligible for this assignment
          }
        }
      }
      
      console.log(`✅ Processing submission: ${studentName} (${studentBranch || 'Unknown'}) - ${assignment.quizTitle} - ${sub.marksObtained} marks`);
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          name: studentName,
          email: studentEmail,
          regNo: regNo,
          branch: studentBranch,
          quizScores: {},
          totalScore: 0,
        });
      }

      const student = studentMap.get(studentId);
      
      // Get assignment details (already validated above)
      const weightage = assignment?.weightage || 0;
      const weightageType = assignment?.weightageType || 'percentage';
      
      // Calculate scores safely
      const percentage = parseFloat(sub.percentage) || 0;
      const marksObtained = parseFloat(sub.marksObtained) || 0;
      
      // Store using string ID for consistent lookup
      student.quizScores[assignmentIdStr] = {
        percentage: percentage,
        marksObtained: marksObtained,
        weightage: weightage,
        weightageType: weightageType,
        correct: parseInt(sub.score) || 0,
        total: parseInt(sub.totalQuestions) || 0,
      };
    });

    // Convert to array and calculate total scores
    const studentsArray = Array.from(studentMap.values());
    
    // Helper function to check if student is eligible for an assignment
    const isEligibleForAssignment = (studentBranch, assignmentSubgroup) => {
      // If assignment has no subgroup restriction (null or empty), everyone is eligible
      if (!assignmentSubgroup) return true;
      
      // If student has no branch, they can't take restricted quizzes
      if (!studentBranch) return false;
      
      // Check if assignment is for multiple branches (comma-separated)
      if (assignmentSubgroup.includes(',')) {
        const allowedBranches = assignmentSubgroup.split(',').map(b => b.trim().toUpperCase());
        return allowedBranches.includes(studentBranch.toUpperCase());
      }
      
      // Single branch - check if branches match (case-insensitive)
      return studentBranch.toUpperCase() === assignmentSubgroup.toUpperCase();
    };
    
    // Calculate PERSONALIZED max score for each student based on eligible assignments
    console.log('\n📊 Calculating Personalized Scores:');
    
    studentsArray.forEach(student => {
      let studentMaxScore = 0;
      let total = 0;
      
      console.log(`\n👤 ${student.name} (${student.branch || 'Unknown'}):`);
      
      // First, calculate this student's max possible score based on eligible assignments
      assignmentsList.forEach(assignment => {
        const eligible = isEligibleForAssignment(student.branch, assignment.subgroup);
        const weight = parseFloat(assignment.weightage) || 0;
        
        if (eligible) {
          studentMaxScore += weight;
          console.log(`  ✓ Eligible for ${assignment.quizTitle}: +${weight} to max`);
        } else {
          console.log(`  ✗ NOT eligible for ${assignment.quizTitle} (${assignment.subgroup} only)`);
        }
      });
      
      console.log(`  📊 Student's Max Score: ${studentMaxScore}`);
      
      // Now calculate their actual total from submissions
      assignmentsList.forEach(assignment => {
        const eligible = isEligibleForAssignment(student.branch, assignment.subgroup);
        const assignmentIdStr = assignment._id.toString(); // Use string for lookup
        const score = student.quizScores[assignmentIdStr];
        
        if (eligible) {
          if (score) {
            const marks = parseFloat(score.marksObtained) || 0;
            console.log(`  ✓ ${assignment.quizTitle}: ${marks.toFixed(2)} marks`);
            total += marks;
          } else {
            console.log(`  ✗ ${assignment.quizTitle}: Not submitted (0 marks)`);
            // Student didn't submit but was eligible - they get 0
          }
        } else {
          console.log(`  ⊘ ${assignment.quizTitle}: Not eligible (${assignment.subgroup} only)`);
        }
        // If not eligible, don't even mention it in their calculation
      });
      
      const percentage = studentMaxScore > 0 ? (total / studentMaxScore) * 100 : 0;
      console.log(`  📊 Final Total: ${total.toFixed(2)} / ${studentMaxScore} = ${percentage.toFixed(2)}%`);
      
      // Ensure we're actually setting these values
      student.totalScore = parseFloat(total.toFixed(2));
      student.maxScore = parseFloat(studentMaxScore.toFixed(2));
      student.percentage = parseFloat(percentage.toFixed(2));
    });
    
    // Sort by percentage descending (since students have different max scores)
    studentsArray.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    // Calculate class statistics based on percentages
    const totalStudents = studentsArray.length;
    const percentages = studentsArray.map((s) => s.percentage || 0);
    const averagePercentage = percentages.length > 0
      ? percentages.reduce((a, b) => a + b, 0) / percentages.length
      : 0;
    // Pass rate based on 50% 
    const passRate = percentages.length > 0
      ? (percentages.filter((p) => p >= 50).length / percentages.length) * 100
      : 0;
    const topPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;
    
    // Find the maximum possible score in the class (for display purposes)
    const maxPossibleScore = Math.max(...studentsArray.map(s => s.maxScore || 0), 0);

    return {
      students: studentsArray,
      stats: {
        totalStudents,
        averageScore: averagePercentage.toFixed(2), // Now showing average percentage
        passRate: passRate.toFixed(2),
        topScore: topPercentage.toFixed(2), // Now showing top percentage
        maxPossibleScore: maxPossibleScore,
      },
    };
  };

  const getGradeInfo = (student) => {
    // Use the pre-calculated percentage from the student object
    const percentage = student?.percentage || 0;
    if (percentage >= 90) return { grade: 'A+', color: '#1b5e20', bg: '#c8e6c9' };
    if (percentage >= 85) return { grade: 'A', color: '#2e7d32', bg: '#dcedc8' };
    if (percentage >= 75) return { grade: 'B+', color: '#1976d2', bg: '#bbdefb' };
    if (percentage >= 70) return { grade: 'B', color: '#0288d1', bg: '#b3e5fc' };
    if (percentage >= 60) return { grade: 'C', color: '#f57c00', bg: '#ffe0b2' };
    if (percentage >= 50) return { grade: 'D', color: '#e64a19', bg: '#ffccbc' };
    return { grade: 'F', color: '#c62828', bg: '#ffcdd2' };
  };

  const exportToCSV = () => {
    // Helper function to check if student is eligible for an assignment
    const isEligibleForAssignment = (studentBranch, assignmentSubgroup) => {
      if (!assignmentSubgroup) return true;
      if (!studentBranch) return false;
      
      // Handle multiple branches (comma-separated)
      if (assignmentSubgroup.includes(',')) {
        const allowedBranches = assignmentSubgroup.split(',').map(b => b.trim().toUpperCase());
        return allowedBranches.includes(studentBranch.toUpperCase());
      }
      
      // Single branch
      return studentBranch.toUpperCase() === assignmentSubgroup.toUpperCase();
    };

    // Create headers with quiz names
    const headers = [
      'Rank',
      'Registration Number',
      'Student Name',
      'Email Address',
      'Branch',
      ...assignments.map((a) => `${a.quizTitle} (Performance %)`),
      ...assignments.map((a) => {
        const type = a.weightageType || 'percentage';
        const weight = a.weightage || 0;
        return `${a.quizTitle} (Marks Obtained / ${weight} ${type === 'percentage' ? '%' : 'marks'})`;
      }),
      'Total Marks Obtained',
      'Maximum Possible Marks',
      'Overall Percentage',
      'Grade',
    ];

    const rows = studentResults.map((student, index) => {
      // Performance percentages
      const scores = assignments.map((a) => {
        const isEligible = isEligibleForAssignment(student.branch, a.subgroup);
        if (!isEligible) return 'Not Eligible';
        
        const score = student.quizScores[a._id];
        return score ? `${(score.percentage || 0).toFixed(2)}%` : '0.00%';
      });
      
      // Marks obtained
      const marks = assignments.map((a) => {
        const isEligible = isEligibleForAssignment(student.branch, a.subgroup);
        const weight = a.weightage || 0;
        
        if (!isEligible) return 'Not Eligible';
        
        const score = student.quizScores[a._id];
        return score 
          ? `${(score.marksObtained || 0).toFixed(2)} / ${weight}` 
          : `0.00 / ${weight}`;
      });
      
      return [
        index + 1,
        student.regNo || 'Not Available',
        student.name || 'Unknown',
        student.email || 'Not Available',
        student.branch || 'Not Available',
        ...scores,
        ...marks,
        (student.totalScore || 0).toFixed(2),
        (student.maxScore || 0).toFixed(2),
        `${(student.percentage || 0).toFixed(2)}%`,
        getGradeInfo(student).grade,
      ];
    });

    // Escape CSV values properly (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `${className || 'Class'}_Results_${new Date().toISOString().split('T')[0]}.csv`;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!classId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body1">
            Please select a class to view results.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Show message if no assignments or submissions
  if (assignments.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body1" fontWeight={600} gutterBottom>
            No quizzes assigned yet
          </Typography>
          <Typography variant="body2">
            Please assign quizzes to this class first before viewing results.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (studentResults.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="body1" fontWeight={600} gutterBottom>
            No submissions yet
          </Typography>
          <Typography variant="body2">
            This class has {assignments.length} quiz(s) assigned, but no students have submitted their answers yet.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 0 }}>
            Class Results & Performance
          </Typography>
          {courseCode && (
            <Chip 
              label={courseCode} 
              color="primary" 
              sx={{ fontWeight: 600, fontSize: '0.875rem' }}
            />
          )}
        </Box>
        {className && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {className}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Results are calculated independently for this class based on assigned quizzes
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: 'primary.light',
              mr: 2
            }}>
              <PersonIcon sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{classStats.totalStudents}</Typography>
              <Typography color="text.secondary" variant="body2">Total Students</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: 'success.main',
              mr: 2
            }}>
              <TrendingUpIcon sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{classStats.averageScore}%</Typography>
              <Typography color="text.secondary" variant="body2">Class Average</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: 'secondary.main',
              mr: 2
            }}>
              <SchoolIcon sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{classStats.passRate}%</Typography>
              <Typography color="text.secondary" variant="body2">Pass Rate</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: 'error.main',
              mr: 2
            }}>
              <TrophyIcon sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{classStats.topScore}%</Typography>
              <Typography color="text.secondary" variant="body2">Highest Score</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Weightage Info */}
      {assignments.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Quiz Weightage Distribution
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              size="small"
            >
              Export CSV
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="5%" sx={{ fontWeight: 600 }}>#</TableCell>
                  <TableCell width="40%" sx={{ fontWeight: 600 }}>Quiz Title</TableCell>
                  <TableCell width="25%" sx={{ fontWeight: 600 }}>Branch</TableCell>
                  <TableCell width="15%" align="center" sx={{ fontWeight: 600 }}>Weightage</TableCell>
                  <TableCell width="15%" align="center" sx={{ fontWeight: 600 }}>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((assignment, index) => {
                  const weight = assignment.weightage || 0;
                  const type = assignment.weightageType || 'percentage';
                  const subgroup = assignment.subgroup;
                  
                  // Format subgroup display
                  let branchInfo = '';
                  if (!subgroup) {
                    branchInfo = 'All Branches';
                  } else if (subgroup.includes(',')) {
                    const branches = subgroup.split(',').map(b => b.trim());
                    branchInfo = branches.join(', ');
                  } else {
                    branchInfo = subgroup;
                  }
                  
                  return (
                    <TableRow 
                      key={assignment._id}
                      sx={{ 
                        '&:hover': { bgcolor: 'grey.50' },
                        '&:last-child td': { borderBottom: 0 }
                      }}
                    >
                      <TableCell>
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.875rem'
                        }}>
                          {index + 1}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.quizTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={branchInfo}
                          size="small"
                          color={!subgroup ? 'success' : 'default'}
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {weight}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={type === 'percentage' ? 'Percentage' : 'Marks'}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            bgcolor: type === 'percentage' ? 'secondary.light' : 'info.light',
                            color: type === 'percentage' ? 'secondary.dark' : 'info.dark'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Results Table */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, width: 80 }}>
                  Rank
                </TableCell>
                <TableCell sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, minWidth: 120 }}>
                  Reg. Number
                </TableCell>
                <TableCell sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, minWidth: 200 }}>
                  Student Name
                </TableCell>
                <TableCell sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, minWidth: 100 }}>
                  Branch
                </TableCell>
                
                {assignments.map((assignment) => {
                  const weight = assignment.weightage || 0;
                  const type = assignment.weightageType || 'percentage';
                  const subgroup = assignment.subgroup;
                  
                  // Format subgroup display
                  let subgroupDisplay = '';
                  if (!subgroup) {
                    subgroupDisplay = 'All Branches';
                  } else if (subgroup.includes(',')) {
                    const branches = subgroup.split(',').map(b => b.trim());
                    subgroupDisplay = branches.join(', ');
                  } else {
                    subgroupDisplay = subgroup;
                  }
                  
                  return (
                    <TableCell
                      key={`header-${assignment._id}`}
                      align="center"
                      sx={{ bgcolor: 'grey.700', color: 'white', fontWeight: 600, minWidth: 140 }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {assignment.quizTitle}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          {type === 'percentage' ? `${weight}%` : `${weight} marks`}
                          {subgroup && ` • ${subgroupDisplay}`}
                        </Typography>
                      </Box>
                    </TableCell>
                  );
                })}
                
                <TableCell align="center" sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, minWidth: 120 }}>
                  Total Score
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: 'grey.800', color: 'white', fontWeight: 700, minWidth: 100 }}>
                  Grade
                </TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {studentResults.map((student, index) => {
                const gradeInfo = getGradeInfo(student);
                const isTopThree = index < 3;
                
                return (
                  <TableRow
                    key={student.id || index}
                    sx={{
                      bgcolor: index % 2 === 0 ? 'white' : 'grey.50',
                      '&:hover': { bgcolor: alpha('#1f2937', 0.04) },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isTopThree && (
                          <TrophyIcon
                            sx={{
                              color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                              fontSize: 22,
                            }}
                          />
                        )}
                        <Typography variant="body1" fontWeight={isTopThree ? 700 : 600}>
                          {index + 1}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {student.regNo || 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body1" fontWeight={600} color="text.primary">
                        {student.name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.email || ''}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip 
                        label={student.branch || 'N/A'} 
                        size="small" 
                        color={student.branch ? "primary" : "default"}
                        variant={student.branch ? "outlined" : "filled"}
                        sx={{ 
                          fontWeight: 600, 
                          fontSize: '0.75rem',
                          bgcolor: !student.branch ? 'grey.200' : undefined,
                          color: !student.branch ? 'text.disabled' : undefined
                        }}
                      />
                    </TableCell>
                    
                    {assignments.map((assignment) => {
                      const assignmentIdStr = assignment._id.toString(); // Use string for lookup
                      const score = student.quizScores[assignmentIdStr];
                      const weight = assignment.weightage || 0;
                      const type = assignment.weightageType || 'percentage';
                      
                      // Check if student is eligible for this assignment
                      const isEligible = !assignment.subgroup || 
                                        !student.branch || 
                                        (() => {
                                          // Handle multiple branches (comma-separated)
                                          if (assignment.subgroup.includes(',')) {
                                            const allowedBranches = assignment.subgroup.split(',').map(b => b.trim().toUpperCase());
                                            return allowedBranches.includes(student.branch.toUpperCase());
                                          }
                                          // Single branch
                                          return student.branch.toUpperCase() === assignment.subgroup.toUpperCase();
                                        })();
                      
                      return (
                        <TableCell key={`score-${assignment._id}`} align="center">
                          {!isEligible ? (
                            <Chip 
                              label="Not Eligible" 
                              size="small" 
                              variant="filled" 
                              sx={{ 
                                bgcolor: 'grey.200',
                                color: 'text.disabled',
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }} 
                            />
                          ) : score ? (
                            <Box>
                              <Tooltip title={`${score.correct || 0} out of ${score.total || 0} correct answers`} arrow>
                                <Box component="span">
                                  <Typography variant="body1" fontWeight={700} color="primary.main">
                                    {(score.percentage || 0).toFixed(1)}%
                                  </Typography>
                                </Box>
                              </Tooltip>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {(score.marksObtained || 0).toFixed(2)} / {weight}
                              </Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Chip 
                                label="Not Submitted" 
                                size="small" 
                                variant="outlined" 
                                sx={{ 
                                  borderColor: 'warning.main',
                                  color: 'warning.main',
                                  fontSize: '0.7rem',
                                  fontWeight: 600
                                }} 
                              />
                              <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                0 / {weight}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                    
                    <TableCell align="center">
                      <Box>
                        <Typography 
                          variant="h6" 
                          fontWeight={900} 
                          color={(student.totalScore || 0) >= (student.maxScore || 0) * 0.5 ? 'success.main' : 'error.main'}
                        >
                          {(student.totalScore || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          of {(student.maxScore || 0).toFixed(0)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={gradeInfo.grade}
                        sx={{
                          bgcolor: gradeInfo.bg,
                          color: gradeInfo.color,
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          minWidth: 50,
                          height: 32,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Footer Note */}
      <Paper sx={{ mt: 3, p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          How to Read the Results
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              <strong>Performance %:</strong> Percentage of correct answers in the quiz
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              <strong>Marks Obtained:</strong> Actual marks earned based on weightage
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Score:</strong> Sum of marks from all completed quizzes
            </Typography>
          </Grid>
        </Grid>
        <Divider sx={{ my: 1.5 }} />
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> Results are calculated independently for each class. Students only see quizzes assigned to their class, 
            and the maximum score is based only on assignments for this specific class. Different classes may have different 
            quizzes and scoring scales.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default ResultsTab;
