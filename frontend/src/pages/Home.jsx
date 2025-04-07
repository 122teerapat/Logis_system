import { Container, Typography, Box, Grid, Paper } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScaleIcon from '@mui/icons-material/Scale';
import SpeedIcon from '@mui/icons-material/Speed';

const Home = () => {
  const features = [
    {
      icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
      title: 'จัดการพัสดุ',
      description: 'ติดตามสถานะพัสดุและจัดการการขนส่งได้อย่างมีประสิทธิภาพ'
    },
    {
      icon: <LocationOnIcon sx={{ fontSize: 40 }} />,
      title: 'แยกตามภูมิภาค',
      description: 'ดูข้อมูลพัสดุแยกตามภูมิภาคได้อย่างชัดเจน'
    },
    {
      icon: <ScaleIcon sx={{ fontSize: 40 }} />,
      title: 'จัดการน้ำหนัก',
      description: 'คำนวณน้ำหนักพัสดุและจัดการการบรรทุกได้อย่างเหมาะสม'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40 }} />,
      title: 'รวดเร็วและแม่นยำ',
      description: 'ระบบทำงานเร็วและให้ข้อมูลที่ถูกต้องแม่นยำ'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          ยินดีต้อนรับสู่ระบบขนส่งพัสดุ
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary" sx={{ mb: 6 }}>
          ระบบจัดการขนส่งพัสดุอัจฉริยะที่ใช้งานง่าย
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Home; 