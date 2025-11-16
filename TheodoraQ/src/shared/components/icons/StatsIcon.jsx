import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

// Simple bar/line combo icon as a lightweight substitute for the MUI Analytics icon.
const StatsIcon = (props) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <rect x="3" y="12" width="3" height="7" />
    <rect x="8" y="8" width="3" height="11" />
    <rect x="13" y="5" width="3" height="14" />
    <rect x="18" y="3" width="3" height="16" />
  </SvgIcon>
);

export default StatsIcon;
