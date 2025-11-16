// src/components/Roster.jsx
import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Paper, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, TextField,
  Snackbar, Alert, IconButton, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Tooltip, InputBase
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../auth/contexts/AuthContext';

// Accept 'students', 'inviteCode', 'classId', and 'onStudentRemoved' as props
const Roster = ({ students, inviteCode, classId, onStudentRemoved }) => {
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  // State for email invitations
  const [emailList, setEmailList] = useState([]); // Array of {name, email}
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  // State for removing students
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Extract unique branch tags from registration numbers
  const branchTags = Array.from(new Set(
    (students || [])
      .map(s => s.registrationNumber ? s.registrationNumber.match(/^[A-Za-z0-9]+/) : null)
      .filter(Boolean)
      .map(match => match[0].replace(/[0-9]+$/, '')) // Remove trailing digits for branch code
  )).sort();

  const handleModalTabChange = (event, newValue) => {
    setModalTab(newValue);
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUploadError('');
    setUploadSuccess('');
    setEmailList([]);
    setManualName('');
    setManualEmail('');
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      try {
        await navigator.clipboard.writeText(inviteCode);
        setCopySuccess(true);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setCopySuccess(false);
  };

  // Handle clicking the "Upload" button
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Handle the file selection and preview
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Read and parse the file to preview emails
      const response = await fetch(`http://localhost:5000/api/candidate/parse-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'File parsing failed');
      }

      // Set the email list for preview
      setEmailList(data.candidates || []);
      setUploadSuccess(`File uploaded! Found ${data.candidates?.length || 0} candidates.`);

    } catch (err) {
      setUploadError(err.message);
    }

    setIsUploading(false);
    event.target.value = null;
  };

  // Add manual email to the list
  const handleAddManualEmail = () => {
    if (!manualName.trim() || !manualEmail.trim()) {
      setUploadError('Please enter both name and email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualEmail)) {
      setUploadError('Please enter a valid email address');
      return;
    }

    // Check for duplicates
    const isDuplicate = emailList.some(item => item.email.toLowerCase() === manualEmail.toLowerCase());
    if (isDuplicate) {
      setUploadError('This email is already in the list');
      return;
    }

    setEmailList([...emailList, { name: manualName.trim(), email: manualEmail.trim() }]);
    setManualName('');
    setManualEmail('');
    setUploadError('');
  };

  // Remove email from the list
  const handleRemoveEmail = (index) => {
    setEmailList(emailList.filter((_, i) => i !== index));
  };

  // Send all invitations
  const handleSendInvites = async () => {
    if (emailList.length === 0) {
      setUploadError('No candidates to invite');
      return;
    }

    setIsSending(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const response = await fetch(`http://localhost:5000/api/candidate/send-invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId,
          candidates: emailList
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitations');
      }

      const { results } = data;
      const successMsg = `Invitations sent! Emails sent: ${results.emailsSent}, Already invited: ${results.alreadyInvited}, Errors: ${results.errors}`;
      setUploadSuccess(successMsg);
      
      // Clear the list and close modal after successful send
      setTimeout(() => {
        setEmailList([]);
        handleCloseModal();
      }, 2000);

    } catch (err) {
      setUploadError(err.message);
    }

    setIsSending(false);
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/candidate/download-template', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'candidate-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setUploadError('Failed to download template: ' + err.message);
    }
  };

  // Handle remove student click
  const handleRemoveClick = (student) => {
    setStudentToRemove(student);
    setConfirmDeleteOpen(true);
  };

  // Confirm remove student
  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;

    setIsRemoving(true);
    setUploadError('');

    try {
      const response = await fetch(`http://localhost:5000/api/classes/${classId}/remove-student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: studentToRemove._id
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove student');
      }

      setUploadSuccess(`${studentToRemove.name} has been removed from the class.`);
      setConfirmDeleteOpen(false);
      setStudentToRemove(null);

      // Notify parent component to refresh student list
      if (onStudentRemoved) {
        onStudentRemoved();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess('');
      }, 3000);

    } catch (err) {
      setUploadError(err.message);
    }

    setIsRemoving(false);
  };

  // Cancel remove student
  const handleCancelRemove = () => {
    setConfirmDeleteOpen(false);
    setStudentToRemove(null);
  };

  // Search and filter handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch === selectedBranch ? '' : branch);
  };

  // Filter students by search term and branch
  const filteredStudents = (students || []).filter(student => {
    const regNum = student.registrationNumber || '';
    const name = student.name || '';
    const email = student.email || '';
    const branch = regNum.match(/^[A-Za-z]+/) ? regNum.match(/^[A-Za-z]+/)[0] : '';
    const matchesSearch =
      regNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch ? regNum.startsWith(selectedBranch) : true;
    return matchesSearch && matchesBranch;
  });

  return (
    <Box>
      {/* 1. Roster Header & Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Candidate Roster ({students?.length || 0})</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
        >
          Add Candidates
        </Button>
      </Box>

      {/* 2. Student List (now uses props) */}
      <Box sx={{ p: 3, background: 'white', borderRadius: 2, boxShadow: 2 }}>
        <List sx={{ p: 0 }}>
          <ListItem sx={{ border: 'none', borderRadius: 0, mb: 0, px: 2, py: 1, background: 'transparent' }}>
            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', fontFamily: 'inherit', gap: 6 }}>
              <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', minWidth: 140 }}>Name</Box>
              <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', minWidth: 180 }}>Registration Number</Box>
              <Box sx={{ flex: 2, fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', minWidth: 220 }}>Email</Box>
              <Box sx={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Box sx={{ p: '0 10px', height: '100%', position: 'absolute', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon />
                </Box>
                <InputBase
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  sx={{ color: 'inherit', pl: '35px', pr: 1, width: '100%' }}
                />
              </Box>
            </Box>
          </ListItem>
          {filteredStudents && filteredStudents.length > 0 ? (
            <>
              {filteredStudents
                .sort((a, b) => {
                  if (a.registrationNumber && b.registrationNumber) {
                    return a.registrationNumber.localeCompare(b.registrationNumber);
                  }
                  if (!a.registrationNumber) return 1;
                  if (!b.registrationNumber) return -1;
                  return 0;
                })
                .map((student) => (
                  <ListItem
                    key={student._id}
                    sx={{ border: 'none', borderRadius: 0, mb: 0, px: 2, py: 1, background: 'transparent' }}
                    secondaryAction={
                      <Tooltip title="Remove from class">
                        <IconButton edge="end" onClick={() => handleRemoveClick(student)} color="error" size="small">
                          <PersonRemoveIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                      <Box sx={{ flex: 1, minWidth: 140, fontSize: '1rem', fontWeight: 400 }}>{student.name}</Box>
                      <Box sx={{ flex: 1, minWidth: 180, fontSize: '1rem', fontWeight: 400 }}>{student.registrationNumber || '-'}</Box>
                      <Box sx={{ flex: 2, minWidth: 220, fontSize: '1rem', color: 'text.secondary', fontWeight: 400 }}>{student.email}</Box>
                      <Box sx={{ flex: 1, minWidth: 220 }} />
                    </Box>
                  </ListItem>
                ))}
            </>
          ) : (
            <ListItem sx={{ border: 'none', borderRadius: 0, mb: 0, px: 2, py: 1, background: 'transparent' }}>
              <Box sx={{ width: '100%', textAlign: 'center', py: 2 }}>
                <Typography variant="body1">No candidates match your search.</Typography>
                <Typography variant="body2" color="text.secondary">Try a different search term.</Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelRemove}>
        <DialogTitle>Remove Student from Class?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{studentToRemove?.name}</strong> from this class?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will remove them from the class roster. They can rejoin using the invite code.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} disabled={isRemoving}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRemove} 
            color="error" 
            variant="contained"
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove Student'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. "Add Candidates" Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>Add Candidates to Class</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={modalTab} onChange={handleModalTabChange}>
              <Tab label="Invite with Code" />
              <Tab label="Invite with Email" />
            </Tabs>
          </Box>

          {/* Tab 1: Invite with Code (now uses prop) */}
          {modalTab === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Share this code with your candidates:</Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  my: 2, 
                  p: 2, 
                  background: '#f4f4f4', 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  letterSpacing: 2
                }}
              >
                {inviteCode || 'Loading...'}
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyCode}
                disabled={!inviteCode}
              >
                Copy Code
              </Button>
            </Box>
          )}

          {/* Tab 2: Invite with Email */}
          {modalTab === 1 && (
            <Box sx={{ p: 2 }}>
              <Typography sx={{ mb: 2 }}>
                Upload a file or manually add candidates to send invitation emails.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>How it works:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Upload a file or manually add candidates</li>
                  <li>Review and edit the list before sending</li>
                  <li>Click "Send Invites" to email all candidates</li>
                  <li>Candidates receive the class code and join link</li>
                </ul>
              </Alert>
              
              {/* File Upload Section */}
              <Typography sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
                Upload candidate list:
              </Typography>

              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".xlsx, .xls, .csv"
              />

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Excel/CSV File'}
                </Button>

                <Button
                  variant="text"
                  onClick={handleDownloadTemplate}
                  size="small"
                >
                  Download Template
                </Button>
              </Box>

              {/* Manual Entry Section */}
              <Typography sx={{ mb: 1, fontWeight: 600 }}>
                Or add manually:
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  label="Name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  size="small"
                  fullWidth
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualEmail()}
                />
                <TextField
                  label="Email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  size="small"
                  type="email"
                  fullWidth
                  onKeyPress={(e) => e.key === 'Enter' && handleAddManualEmail()}
                />
                <Button
                  variant="contained"
                  onClick={handleAddManualEmail}
                  sx={{ minWidth: '100px' }}
                >
                  Add
                </Button>
              </Box>

              {/* Email Preview List */}
              {emailList.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      Candidates to invite ({emailList.length}):
                    </Typography>
                    <Chip 
                      label={`${emailList.length} recipient${emailList.length !== 1 ? 's' : ''}`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                  
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Name</strong></TableCell>
                          <TableCell><strong>Email</strong></TableCell>
                          <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {emailList.map((candidate, index) => (
                          <TableRow key={index}>
                            <TableCell>{candidate.name}</TableCell>
                            <TableCell>{candidate.email}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveEmail(index)}
                                aria-label="delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Show success/error messages */}
              {uploadError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {uploadError}
                </Alert>
              )}
              {uploadSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {uploadSuccess}
                </Alert>
              )}
            </Box>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          {modalTab === 1 && emailList.length > 0 && (
            <Button 
              variant="contained" 
              startIcon={<SendIcon />}
              onClick={handleSendInvites}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : `Send ${emailList.length} Invite${emailList.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Invite code copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Roster;