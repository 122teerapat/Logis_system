import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { getAllShipments } from '../api';

const Reports = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });



  // ดึงข้อมูลการจัดส่งทั้งหมด
  const fetchShipments = async () => {
    try {
      const response = await getAllShipments();
      setShipments(response.data);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการจัดส่ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchStatusList();
  }, []);

  // กรองข้อมูลตามสถานะและช่วงวันที่
  const filteredShipments = shipments.filter(shipment => {
    const matchesStatus = selectedStatus === 'all' || shipment.Status === selectedStatus;
    const shipmentDate = new Date(shipment.Departure_time);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    const matchesDateRange = (!startDate || shipmentDate >= startDate) &&
                           (!endDate || shipmentDate <= endDate);

    return matchesStatus && matchesDateRange;
  });

  // คำนวณสถิติ
  const statistics = {
    totalShipments: filteredShipments.length,
    totalParcels: filteredShipments.reduce((sum, shipment) => sum + shipment.parcels.length, 0),
    totalWeight: filteredShipments.reduce((sum, shipment) => 
      sum + shipment.parcels.reduce((parcelSum, parcel) => parcelSum + parcel.Weight, 0), 0),
    averageWeight: filteredShipments.length > 0 ? 
      filteredShipments.reduce((sum, shipment) => 
        sum + shipment.parcels.reduce((parcelSum, parcel) => parcelSum + parcel.Weight, 0), 0) / 
      filteredShipments.reduce((sum, shipment) => sum + shipment.parcels.length, 0) : 0
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          รายงานการจัดส่ง
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ตัวกรอง */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>สถานะ</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  label="สถานะ"
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  {statusList.map((status) => (
                    <MenuItem key={status.StatusID} value={status.StatusID}>
                      {status.StatusName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="วันที่เริ่มต้น"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="วันที่สิ้นสุด"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* สถิติ */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">จำนวนการจัดส่ง</Typography>
              <Typography variant="h4">{statistics.totalShipments}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">จำนวนพัสดุ</Typography>
              <Typography variant="h4">{statistics.totalParcels}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">น้ำหนักรวม</Typography>
              <Typography variant="h4">{statistics.totalWeight.toFixed(2)} กก.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">น้ำหนักเฉลี่ยต่อพัสดุ</Typography>
              <Typography variant="h4">{statistics.averageWeight.toFixed(2)} กก.</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* ตารางรายละเอียด */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>รหัสการจัดส่ง</TableCell>
                  <TableCell>วันที่ออกเดินทาง</TableCell>
                  <TableCell>จำนวนพัสดุ</TableCell>
                  <TableCell>น้ำหนักรวม</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.ShipmentID}>
                    <TableCell>{shipment.ShipmentID}</TableCell>
                    <TableCell>
                      {new Date(shipment.Departure_time).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>{shipment.parcels.length}</TableCell>
                    <TableCell>
                      {shipment.parcels.reduce((sum, parcel) => sum + parcel.Weight, 0).toFixed(2)} กก.
                    </TableCell>
                    <TableCell>
                      {statusList.find(s => s.StatusID === shipment.Status)?.StatusName || 'ไม่ทราบสถานะ'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default Reports; 