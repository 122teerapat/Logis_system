import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  LocalShipping as LocalShippingIcon,
  Map as MapIcon,
  Scale as ScaleIcon,
  Close as CloseIcon,
  Assessment as AssessmentIcon,
  UploadFile
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'หน้าหลัก', icon: <HomeIcon />, path: '/' },
    { text: 'พัสดุ', icon: <LocalShippingIcon />, path: '/parcels' },
    { text: 'ภูมิภาค', icon: <MapIcon />, path: '/regions' },
    { text: 'การจัดส่ง', icon: <LocalShippingIcon />, path: '/shipments' },
    { text: 'รายงาน', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'อัพโหลด CSV', icon: <UploadFile />, path: '/upload' },
  ];

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={() => setOpen(!open)}
        sx={{ position: 'fixed', left: 16, top: 16, zIndex: 1200 }}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </IconButton>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0d47a1',
            color: 'white',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              ระบบจัดการพัสดุ
            </Typography>
          </Box>
          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  },
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar; 