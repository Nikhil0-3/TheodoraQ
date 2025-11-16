import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  alpha,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import QuizIcon from '@mui/icons-material/Quiz';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Loader from '../../../components/Loader';

const QuickActionCard = ({ title, description, icon, color = 'primary', onClick, count }) => {
  return (
    <Card 
      sx={{ 
        width: '100%',
        maxWidth: 'calc(33.333% - 16px)',
        height: '220px',
        background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].main, 0.05)} 100%)`,
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette[color].main, 0.2),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 2,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        }
      }}
    >
      <CardActionArea 
        onClick={onClick}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          '&:hover .action-arrow': {
            transform: 'translateX(4px)',
          }
        }}
      >
        <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ 
                p: 1.2, 
                borderRadius: 1.5, 
                bgcolor: `${color}.main`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 1,
              }}>
                {React.cloneElement(icon, { sx: { fontSize: 26 } })}
              </Box>
              {count !== undefined && (
                <Chip 
                  label={count} 
                  size="small" 
                  sx={{ 
                    bgcolor: `${color}.main`,
                    color: 'white',
                    fontWeight: 'bold',
                    height: '26px',
                    fontSize: '0.875rem',
                    px: 1.2,
                  }} 
                />
              )}
            </Box>
            
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.05rem', mb: 1, lineHeight: 1.3 }}>
              {title}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: '42px',
              }}
            >
              {description}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', color: `${color}.main`, mt: 1.5 }}>
            <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
              Get Started
            </Typography>
            <ArrowForwardIcon 
              className="action-arrow"
              sx={{ ml: 0.5, fontSize: 16, transition: 'transform 0.3s' }} 
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const Dashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    if (!token) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader />
      </Box>
    );
  }

  const quickActions = [
    {
      title: 'Manage Classes',
      description: 'Create, edit, and organize your classes. Add students and assign quizzes.',
      icon: <ClassIcon />,
      color: 'primary',
      count: stats?.classCount || 0,
      onClick: () => navigate('/admin/classes')
    },
    {
      title: 'View Results',
      description: 'Check student quiz results, performance metrics, and detailed reports.',
      icon: <AssessmentIcon />,
      color: 'success',
      count: stats?.studentCount || 0,
      onClick: () => navigate('/admin/analytics')
    },
    {
      title: 'Quiz Library',
      description: 'Browse, create, and manage quizzes. Generate AI-powered assessments.',
      icon: <QuizIcon />,
      color: 'warning',
      count: stats?.quizCount || 0,
      onClick: () => navigate('/admin/content')
    },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/classes?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Hi {user?.name?.split(' ')[0] || 'there'}! Ready to teach?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your classes, students, and quizzes all in one place
        </Typography>
      </Box>

      {/* Search Bar */}
      <Box 
        component="form"
        onSubmit={handleSearch}
        sx={{ mb: 2.5 }}
      >
        <TextField
          fullWidth
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.paper',
            }
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch(e);
            }
          }}
        />
      </Box>

      {/* Quick Actions Grid */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Actions
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {quickActions.map((action, index) => (
          <QuickActionCard key={index} {...action} />
        ))}
      </Box>
    </Box>
  );
};

export default Dashboard;