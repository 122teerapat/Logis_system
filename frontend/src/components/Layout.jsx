import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <AppBar position="static" sx={{ mb: 3, backgroundColor: 'white', color: 'black' }}>
          <Toolbar>
            <Typography variant="h6" component="div">
              ระบบขนส่งพัสดุ
            </Typography>
          </Toolbar>
        </AppBar>
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 