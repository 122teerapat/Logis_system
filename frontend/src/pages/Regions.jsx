import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Grid
} from '@mui/material';
import { getAllParcels, getParcelsByRegion, createShipment } from '../api';

const Regions = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [departureTime, setDepartureTime] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalArea, setTotalArea] = useState(0);

  const regions = [
    { id: 'north', name: 'ภาคเหนือ', provinces: ['เชียงใหม่', 'เชียงราย', 'ลำพูน', 'ลำปาง', 'แพร่', 'น่าน', 'พะเยา', 'แม่ฮ่องสอน'] },
    { id: 'northeast', name: 'ภาคตะวันออกเฉียงเหนือ', provinces: ['ขอนแก่น', 'อุดรธานี', 'หนองคาย', 'มหาสารคาม', 'ร้อยเอ็ด', 'กาฬสินธุ์', 'สุรินทร์', 'ศรีสะเกษ'] },
    { id: 'central', name: 'ภาคกลาง', provinces: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'พระนครใต้', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'นครปฐม'] },
    { id: 'south', name: 'ภาคใต้', provinces: ['ภูเก็ต', 'กระบี่', 'พังงา', 'ตรัง', 'สตูล', 'สงขลา', 'พัทลุง', 'นครศรีธรรมราช'] }
  ];

  // ฟังก์ชันคำนวณพื้นที่จากความกว้าง ความยาว และความสูง
  const calculateArea = (width, length, height) => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    const h = parseFloat(height) || 0;
    // แปลงจากลูกบาศก์เซนติเมตรเป็นลูกบาศก์เมตร (หารด้วย 1000000)
    return (w * l * h) / 1000000;
  };

  const handleRegionSelect = async (region) => {
    setSelectedRegion(region);
    setLoading(true);
    try {
      const response = await getParcelsByRegion(region);
      setParcels(response.data);
      // คำนวณน้ำหนักรวม (กรัม) และพื้นที่รวม (ลูกบาศก์เมตร)
      const weight = response.data.reduce((sum, parcel) => sum + (parseFloat(parcel.Weight) || 0), 0);
      const area = response.data.reduce((sum, parcel) => 
        sum + calculateArea(parcel.Width, parcel.Length, parcel.Height), 0);
      setTotalWeight(weight);
      setTotalArea(area);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลพัสดุ');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!departureTime || !estimatedArrival) {
      setError('กรุณาระบุเวลาออกเดินทางและเวลาที่คาดว่าจะถึง');
      return;
    }

    try {
      const parcelIds = parcels.map(parcel => parcel.ParcelID);
      // แปลงวันที่ให้อยู่ในรูปแบบที่ถูกต้อง
      const formattedDepartureTime = new Date(departureTime).toISOString().slice(0, 19).replace('T', ' ');
      const formattedEstimatedArrival = new Date(estimatedArrival).toISOString().slice(0, 19).replace('T', ' ');

      const response = await createShipment({
        departure_time: formattedDepartureTime,
        estimated_arrival: formattedEstimatedArrival,
        parcelsID: parcelIds,
        total_weight: totalWeight,
        total_area: totalArea,
        status: 1 // เพิ่มสถานะเริ่มต้น
      });

      setSuccessMessage('สร้างการจัดส่งสำเร็จ');
      setOpenDialog(false);
      setDepartureTime('');
      setEstimatedArrival('');
    } catch (error) {
      console.error('Error creating shipment:', error);
      setError(error.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างการจัดส่ง');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          คัดแยกพัสดุตามภูมิภาค
        </Typography>

        {/* ปุ่มเลือกภูมิภาค */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {regions.map((region) => (
            <Button
              key={region.id}
              variant={selectedRegion === region.id ? "contained" : "outlined"}
              onClick={() => handleRegionSelect(region.id)}
            >
              {region.name}
            </Button>
          ))}
        </Box>

        {/* แสดงข้อความแจ้งเตือน */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* แสดงข้อมูลสรุป */}
        {selectedRegion && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  สรุปข้อมูลพัสดุ
                </Typography>
                <Typography>
                  จำนวนพัสดุ: {parcels.length} รายการ
                </Typography>
                <Typography>
                  น้ำหนักรวม: {totalWeight.toFixed(2)} กรัม
                </Typography>
                <Typography>
                  พื้นที่รวม: {totalArea.toFixed(2)} ลูกบาศก์เมตร
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ตารางแสดงพัสดุ */}
        {selectedRegion && (
          <Paper sx={{ mb: 4 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                พัสดุในภูมิภาค {regions.find(r => r.id === selectedRegion)?.name}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenDialog(true)}
              >
                สร้างการจัดส่ง
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัสพัสดุ</TableCell>
                    <TableCell>น้ำหนัก (กรัม)</TableCell>
                    <TableCell>ความกว้าง (ซม.)</TableCell>
                    <TableCell>ความยาว (ซม.)</TableCell>
                    <TableCell>ความสูง (ซม.)</TableCell>
                    <TableCell>พื้นที่ (ลบ.ม.)</TableCell>
                    <TableCell>ที่อยู่</TableCell>
                    <TableCell>ตำบล</TableCell>
                    <TableCell>อำเภอ</TableCell>
                    <TableCell>จังหวัด</TableCell>
                    <TableCell>รหัสไปรษณีย์</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : parcels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        ไม่พบพัสดุในภูมิภาคนี้
                      </TableCell>
                    </TableRow>
                  ) : (
                    parcels.map((parcel) => (
                      <TableRow key={parcel.ParcelID}>
                        <TableCell>{parcel.ParcelID}</TableCell>
                        <TableCell>{parcel.Weight}</TableCell>
                        <TableCell>{parcel.Width}</TableCell>
                        <TableCell>{parcel.Length}</TableCell>
                        <TableCell>{parcel.Height}</TableCell>
                        <TableCell>{calculateArea(parcel.Width, parcel.Length, parcel.Height).toFixed(4)}</TableCell>
                        <TableCell>{parcel.Address || '-'}</TableCell>
                        <TableCell>{parcel.Subdistrict || '-'}</TableCell>
                        <TableCell>{parcel.District || '-'}</TableCell>
                        <TableCell>{parcel.Province}</TableCell>
                        <TableCell>{parcel.Postal_code || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Dialog สำหรับสร้างการจัดส่ง */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>สร้างการจัดส่ง</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="เวลาออกเดินทาง"
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="เวลาที่คาดว่าจะถึง"
              type="datetime-local"
              value={estimatedArrival}
              onChange={(e) => setEstimatedArrival(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="body2" color="text.secondary">
              น้ำหนักรวม: {totalWeight.toFixed(2)} กรัม
            </Typography>
            <Typography variant="body2" color="text.secondary">
              พื้นที่รวม: {totalArea.toFixed(2)} ลูกบาศก์เมตร
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>ยกเลิก</Button>
          <Button onClick={handleCreateShipment} variant="contained" color="primary">
            สร้างการจัดส่ง
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar สำหรับแสดงข้อความสำเร็จ */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Regions; 