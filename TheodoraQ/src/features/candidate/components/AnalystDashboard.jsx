import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, CircularProgress, Alert } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

// Dummy API call for candidate analytics (replace with real API)
async function fetchCandidateAnalytics(candidateId) {
  // Simulate API response
  return {
    success: true,
    data: {
      weakTopics: [
        { topic: 'Algebra', score: 45 },
        { topic: 'Geometry', score: 52 },
        { topic: 'Probability', score: 38 }
      ],
      improvementTips: [
        'Review Algebra basics and practice solving equations.',
        'Work on Geometry proofs and spatial reasoning.',
        'Practice probability problems and understand key formulas.'
      ]
    }
  };
}

export default function AnalystDashboard({ candidateId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchCandidateAnalytics(candidateId);
        if (result.success) {
          setAnalytics(result.data);
        } else {
          setError('Failed to load analytics');
        }
      } catch (err) {
        setError('Error loading analytics');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [candidateId]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <InsightsIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Analyst Dashboard
        </Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        See your weak areas and get tips to improve your performance.
      </Alert>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {analytics && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Weak Topics</Typography>
                {analytics.weakTopics.map((topic, idx) => (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Chip label={topic.topic} color="error" sx={{ mr: 1 }} />
                    <Typography variant="body2" component="span">Score: {topic.score}%</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Improvement Tips</Typography>
                <ul>
                  {analytics.improvementTips.map((tip, idx) => (
                    <li key={idx}><Typography variant="body2">{tip}</Typography></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
