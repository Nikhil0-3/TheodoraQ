import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme.js';
import { LoginPage, SignUpPage } from '../features/auth';
import { ProtectedRoute } from '../shared';
import AdminLayout from '../features/admin/layouts/AdminLayout';
import CandidateLayout from '../features/candidate/layouts/CandidateLayout';

// Auth Pages
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Admin Pages
import Dashboard from '../features/admin/pages/Dashboard';
import MyClasses from '../features/admin/pages/MyClasses';
import ClassDetails from '../features/admin/pages/ClassDetails';
import ContentLibrary from '../features/admin/pages/ContentLibrary';
import CreateContentPage from '../features/admin/pages/CreateContentPage';
import EditQuizPage from '../features/admin/pages/EditQuizPage';
import SubmissionsPage from '../features/admin/pages/SubmissionsPage';
import DetailedReportPage from '../features/admin/pages/DetailedReportPage';
import Analytics from '../features/admin/pages/Analytics';
import AdminProfilePage from '../features/admin/pages/ProfilePage';
import ResultsPage from '../features/admin/pages/ResultsPage';
import CheatActivityPage from '../features/admin/pages/CheatActivityPage';

// Candidate Pages
import JoinClassPage from '../features/candidate/pages/JoinClassPage';
import CandidateMyClassesPage from '../features/candidate/pages/MyClassesPage';
import ClassAssignmentsPage from '../features/candidate/pages/ClassAssignmentsPage';
import TakeQuizPage from '../features/candidate/pages/TakeQuizPage';
import CandidateDashboard from '../features/candidate/pages/CandidateDashboard';
import CandidateProfilePage from '../features/candidate/pages/ProfilePage';
import ClassRosterPage from '../features/candidate/pages/ClassRosterPage';
import ClassLeaderboardPage from '../features/candidate/pages/ClassLeaderboardPage';

/**
 * Centralized router configuration
 * Following React Router best practices for nested routes
 */
const AppRoutes = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Fixes inconsistencies and sets the background color */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="classes/:classId" element={<ClassDetails />} />
        <Route path="content" element={<ContentLibrary />} />
        <Route path="content/new" element={<CreateContentPage />} />
        <Route path="content/edit/:quizId" element={<EditQuizPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="cheat-activity" element={<CheatActivityPage />} />
        <Route path="assignment/:assignmentId/submissions" element={<SubmissionsPage />} />
        <Route path="submission/:assignmentId/:submissionId" element={<DetailedReportPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      {/* Candidate Protected Routes */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute requiredRole="candidate">
            <CandidateLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="my-classes" element={<CandidateMyClassesPage />} />
        <Route path="join-class" element={<JoinClassPage />} />
        <Route path="class/:classId/assignments" element={<ClassAssignmentsPage />} />
        <Route path="class/:classId/roster" element={<ClassRosterPage />} />
        <Route path="class/:classId/leaderboard" element={<ClassLeaderboardPage />} />
        <Route path="assignment/:assignmentId" element={<TakeQuizPage />} />
        <Route path="profile" element={<CandidateProfilePage />} />
      </Route>

      {/* Legacy route redirects for backward compatibility */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/my-classes" element={<Navigate to="/candidate/my-classes" replace />} />
      <Route path="/classes" element={<Navigate to="/admin/classes" replace />} />
      <Route path="/content" element={<Navigate to="/admin/content" replace />} />
      <Route path="/analytics" element={<Navigate to="/admin/analytics" replace />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ThemeProvider>
  );
};

export default AppRoutes;
