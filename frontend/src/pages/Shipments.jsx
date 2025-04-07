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
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { getAllShipments, updateShipmentStatus, getAllStatus } from '../api';
import { useNavigate } from 'react-router-dom';

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [statusList, setStatusList] = useState([]);
  const navigate = useNavigate();

  // ดึงข้อมูลสถานะ
  const fetchStatusList = async () => {
    try {
      const response = await getAllStatus();
      setStatusList(response.data);
    } catch (error) {
      console.error('Error fetching status list:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลสถานะ');
    }
  };

  // ดึงข้อมูลการจัดส่งทั้งหมด
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const response = await getAllShipments();
      // จัดกลุ่มข้อมูลตาม ShipmentID
      const groupedShipments = response.data.reduce((acc, item) => {
        if (!acc[item.ShipmentID]) {
          acc[item.ShipmentID] = {
            ShipmentID: item.ShipmentID,
            DepartureTime: item.Departure_time,
            EstimatedArrival: item.Estimated_arrival,
            Status: item.Status,
            parcels: []
          };
        }
        acc[item.ShipmentID].parcels.push({
          ParcelID: item.ParcelID,
          Weight: item.Weight,
          Area: item.Area,
          Address: item.Address,
          Subdistrict: item.Subdistrict,
          District: item.District,
          Province: item.Province,
          Postal_code: item.Postal_code,
          Region: item.Region,
          StatusName: item.StatusName
        });
        return acc;
      }, {});

      // แปลงเป็น array
      const shipmentsArray = Object.values(groupedShipments);
      setShipments(shipmentsArray);
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

  // ดึงรายละเอียดการจัดส่ง
  const handleViewDetails = (shipmentId) => {
    // ใช้ข้อมูลที่มีอยู่แล้วจาก shipments state
    const shipment = shipments.find(s => s.ShipmentID === shipmentId);
    if (shipment) {
      setSelectedShipment(shipment);
      setOpenDetailsDialog(true);
    } else {
      setError('ไม่พบข้อมูลการจัดส่ง');
    }
  };

  // อัพเดทสถานะการจัดส่ง
  const handleStatusChange = async (shipmentId, newStatusId) => {
    try {
      await updateShipmentStatus(shipmentId, newStatusId);
      setSnackbarMessage('อัพเดทสถานะสำเร็จ');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      fetchShipments(); // รีเฟรชข้อมูล
    } catch (error) {
      setSnackbarMessage('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    if (!status) return 'ไม่ทราบสถานะ';
    const statusItem = statusList.find(s => s.StatusID === status);
    return statusItem ? statusItem.StatusName : 'ไม่ทราบสถานะ';
  };

  // แปลงสถานะเป็นสี
  const getStatusColor = (statusName) => {
    if (!statusName) return 'default';
    
    switch (statusName) {
      case 'Preparing Shipment':
        return 'warning';
      case 'Departed Main Branch':
        return 'info';
      case 'Departed DC':
        return 'info';
      case 'Arrived DC':
        return 'success';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          รายการการจัดส่ง
        </Typography>

        {/* แสดงข้อความแจ้งเตือน */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ตารางแสดงรายการการจัดส่ง */}
        <Paper sx={{ mb: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>รหัสการจัดส่ง</TableCell>
                  <TableCell>เวลาออกเดินทาง</TableCell>
                  <TableCell>เวลาที่คาดว่าจะถึง</TableCell>
                  <TableCell>จำนวนพัสดุ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      ไม่พบรายการการจัดส่ง
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment) => (
                    <TableRow key={shipment.ShipmentID}>
                      <TableCell>{shipment.ShipmentID}</TableCell>
                      <TableCell>{new Date(shipment.DepartureTime).toLocaleString('th-TH')}</TableCell>
                      <TableCell>{new Date(shipment.EstimatedArrival).toLocaleString('th-TH')}</TableCell>
                      <TableCell>{shipment.parcels.length} รายการ</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={shipment.Status || ''}
                            onChange={(e) => handleStatusChange(shipment.ShipmentID, e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>เลือกสถานะ</em>
                            </MenuItem>
                            {statusList.map((status) => (
                              <MenuItem key={status.StatusID} value={status.StatusID}>
                                {status.StatusName}
                                
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => navigate(`/shipments/${shipment.ShipmentID}`)}
                        >
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Dialog แสดงรายละเอียดการจัดส่ง */}
      <Dialog 
        open={openDetailsDialog} 
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          รายละเอียดการจัดส่ง #{selectedShipment?.ShipmentID}
        </DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    ข้อมูลการจัดส่ง
                  </Typography>
                  <Typography>
                    เวลาออกเดินทาง: {new Date(selectedShipment.DepartureTime).toLocaleString('th-TH')}
                  </Typography>
                  <Typography>
                    เวลาที่คาดว่าจะถึง: {new Date(selectedShipment.EstimatedArrival).toLocaleString('th-TH')}
                  </Typography>
                  <Typography>
                    จำนวนพัสดุ: {selectedShipment.parcels.length} รายการ
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    รายการพัสดุ
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>รหัสพัสดุ</TableCell>
                          <TableCell>น้ำหนัก</TableCell>
                          <TableCell>พื้นที่</TableCell>
                          <TableCell>ที่อยู่</TableCell>
                          <TableCell>ตำบล</TableCell>
                          <TableCell>อำเภอ</TableCell>
                          <TableCell>จังหวัด</TableCell>
                          <TableCell>รหัสไปรษณีย์</TableCell>
                          <TableCell>สถานะ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedShipment.parcels.map((parcel) => (
                          <TableRow key={parcel.ParcelID}>
                            <TableCell>{parcel.ParcelID}</TableCell>
                            <TableCell>{parcel.Weight} กรัม</TableCell>
                            <TableCell>{parcel.Area ? parcel.Area.toFixed(2) : '-'} ลูกบาศก์เมตร</TableCell>
                            <TableCell>{parcel.Address || '-'}</TableCell>
                            <TableCell>{parcel.Subdistrict || '-'}</TableCell>
                            <TableCell>{parcel.District || '-'}</TableCell>
                            <TableCell>{parcel.Province || '-'}</TableCell>
                            <TableCell>{parcel.Postal_code || '-'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={parcel.StatusName} 
                                color={getStatusColor(parcel.StatusName)}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar สำหรับแสดงข้อความสำเร็จ */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Shipments; 