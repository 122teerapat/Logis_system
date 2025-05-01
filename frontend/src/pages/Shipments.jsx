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
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import { getAllShipments, getAllStatus } from '../api';
import { useNavigate } from 'react-router-dom';

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
            EstimatedArrival: item.Estimated_time,
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
          StatusName: item.AltName
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



  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    if (!status) return 'รอดำเนินการ';
    const statusItem = statusList.find(s => s.StatusID === status);
    return statusItem ? statusItem.AltName : 'รอดำเนินการ';
  };

  // แปลงสถานะเป็นสี
  const getStatusColor = (statusName) => {
    if (!statusName) return 'default';
    
    switch (statusName) {
      case 'เริ่มจัดเตรียมสินค้า':
        return 'warning';
      case 'ออกจากสำนักงานใหญ่':
        return 'info';
      case 'ถึงศูนย์กระจายสินค้า':
        return 'info';
      case 'ออกจากศูนย์กระจายสินค้า':
        return 'info';
      case 'เสร็จสิ้น':
        return 'success';
      case 'ยกเลิก':
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
                              <Chip 
                                label={getStatusText(shipment.Status)} 
                                color={getStatusColor(getStatusText(shipment.Status))}
                                size="small"
                              />
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