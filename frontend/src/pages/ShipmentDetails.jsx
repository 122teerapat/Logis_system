import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { updateShipmentStatus, getAllStatus, getShipmentById ,getShipmentRoute } from '../api';
import { LongdoMap, longdo, map } from "../longdo-map/LongdoMap.jsx";


const ShipmentDetails = () => {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [editData, setEditData] = useState({
    departureTime: '',
    estimatedArrival: ''
  });
  const mapKey = '5e3612dcbfa88a77bf9cc6773e5a1545';
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [routeAdded, setRouteAdded] = useState(false);

  // เพิ่ม script Longdo Map
  const initMap = async () => {
    if (!map) {
      console.error("map ยังไม่ถูกกำหนดค่า");
      return;
    }
    if (!window.longdo) {
      console.error("Longdo API ยังไม่โหลด");
      return;
    }
    
    try {
      // ตั้งค่าเบื้องต้นของแผนที่
      map.Layers.setBase(window.longdo.Layers.GRAY);
  
      // ใช้ async/await สำหรับการโหลดข้อมูล
      map.Event.bind(longdo.EventName.Ready, async function() {
        // รอให้ข้อมูลเสร็จสิ้น (สมมุติว่า data ได้มาจาก API หรือฟังก์ชันอื่น)
        const response = await getShipmentRoute(shipmentId); // ฟังก์ชัน async ที่จะดึงข้อมูล
        const locationList = response.data || []; // ตรวจสอบว่ามีข้อมูลหรือไม่
        
       
        // ตั้งค่าการค้นหาเส้นทาง
        map.Route.placeholder(document.getElementById('result'));
        map.Route.clearDestination();
        // เพิ่ม route เฉพาะเมื่อยังไม่เคยเพิ่ม
        if (!routeAdded) {
          map.Route.add(new longdo.Marker({ lon: 100.5755463000000, lat: 13.8798446700000 }, { 
              title: 'Origin', 
              detail: "I'm here" 
          }));

          if (Array.isArray(locationList) && locationList.length > 1) {
            locationList.forEach(route => {
                if (route.DesLongitude && route.DesLatitude) {
                    console.log(route);
                    map.Route.add(new longdo.Marker({ 
                        lon: parseFloat(route.DesLongitude), 
                        lat: parseFloat(route.DesLatitude) 
                    }, {
                        title: route.BranchName || 'สาขา',
                        detail: `Located at ${route.DesLongitude}, ${route.DesLatitude}`
                    }));
                }
            });
          }
          setRouteAdded(true);
        }

        map.Route.search();
        map.Route.enableContextMenu();
        map.Route.auto(true);
        
        
        const refreshInterval = setInterval(() => {
          const resultElement = document.getElementById('result');
          if (resultElement) {
              const distanceElement = resultElement.querySelector('.ldroute_distance');
              const intervalElement = resultElement.querySelector('.ldroute_interval');

              if (distanceElement) {
                  setRouteDistance(distanceElement.textContent);
              }
              if (intervalElement) {
                  setRouteDuration(intervalElement.textContent);
              }
            }
        }, 3000);

        // ใช้ window.addEventListener แทน map.Event.bind
        window.addEventListener('beforeunload', () => {
            clearInterval(refreshInterval);
        });
    });

    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการตั้งค่าแผนที่:", error);
    }
  };
  
 
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

  // ดึงข้อมูลการจัดส่ง
  const fetchShipmentDetails = async () => {
    try {
      const response = await getShipmentById(shipmentId);
      if (response.data && response.data.length > 0) {
        const shipmentData = response.data[0];
        setShipment(shipmentData);
        setEditData({
          departureTime: shipmentData.Departure_time,
          estimatedArrival: shipmentData.Estimated_arrival
        });
      } else {
        setError('ไม่พบข้อมูลการจัดส่ง');
      }
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentDetails();
    fetchStatusList();
    initMap();

    return () => {
      if (map) {
        map.Route.clearDestination();
        setRouteAdded(false);
      }
    };
  }, [shipmentId]);

  // อัพเดทสถานะการจัดส่ง
  const handleStatusChange = async (newStatusId) => {
    try {
      await updateShipmentStatus(shipmentId, newStatusId);
      setSnackbarMessage('อัพเดทสถานะสำเร็จ');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      fetchShipmentDetails();
    } catch (error) {
      setSnackbarMessage('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    if (!status) return 'อยู่ระหว่างดำเนินการ';
    const statusItem = statusList.find(s => s.StatusID === status);
    return statusItem ? statusItem.StatusName : 'อยู่ระหว่างดำเนินการ';
  };

  // แปลงสถานะเป็นสี
  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusItem = statusList.find(s => s.StatusID === status);
    if (!statusItem) return 'default';
    
    switch (statusItem.StatusName) {
      case 'รอดำเนินการ':
        return 'warning';
      case 'กำลังจัดส่ง':
        return 'info';
      case 'จัดส่งสำเร็จ':
        return 'success';
      case 'ยกเลิก':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/shipments')} sx={{ mt: 2 }}>
          กลับไปหน้าการจัดส่ง
        </Button>
      </Container>
    );
  }


  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Button variant="outlined" onClick={() => navigate('/shipments')} sx={{ mb: 2 }}>
          กลับไปหน้าการจัดส่ง
        </Button>
        <Typography variant="h4" gutterBottom>
          รายละเอียดการจัดส่ง #{shipment.ShipmentID}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* ข้อมูลการจัดส่ง */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ข้อมูลการจัดส่ง
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  เวลาออกเดินทาง
                </Typography>
                <Typography>
                  {new Date(shipment.Departure_time).toLocaleString('th-TH')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  เวลาที่คาดว่าจะถึง
                </Typography>
                <Typography>
                  {new Date(shipment.Estimated_arrival).toLocaleString('th-TH')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ระยะทาง
                </Typography>
                <Typography>
                  {routeDistance || 'ไม่พบข้อมูล'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  เวลาเดินทาง
                </Typography>
                <Typography>
                  {routeDuration || 'ไม่พบข้อมูล'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  สถานะ
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={getStatusText(shipment.Status)} 
                    color={getStatusColor(shipment.Status)}
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* แผนที่ */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '500px' }}>
          <div style={{ width: '100%', height: '400px' }}>
            <LongdoMap id="longdo-map" mapKey={mapKey} callback={initMap} />
          </div>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '500px', position: 'relative' }}>
            <div id="result" style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '100%',
              height: '100%',     
              margin: 'auto',
              border: '4px solid #dddddd',
              background: '#ffffff',
              overflow: 'auto',
              zIndex: 0
            }}></div>
          </Paper>
        </Grid>

        {/* รายการพัสดุ */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              รายการพัสดุ
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัสพัสดุ</TableCell>
                    <TableCell>ผู้ส่ง</TableCell>
                    <TableCell>เบอร์ผู้ส่ง</TableCell>
                    <TableCell>ผู้รับ</TableCell>
                    <TableCell>เบอร์ผู้รับ</TableCell>
                    <TableCell>ที่อยู่</TableCell>
                    <TableCell>ตำบล</TableCell>
                    <TableCell>อำเภอ</TableCell>
                    <TableCell>จังหวัด</TableCell>
                    <TableCell>รหัสไปรษณีย์</TableCell>
                    
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shipment.parcels && shipment.parcels.length > 0 ? (
                    shipment.parcels.map((parcel) => (
                      <TableRow key={parcel.ParcelID}>
                        <TableCell>{parcel.ParcelID}</TableCell>
                        <TableCell>{parcel.Sender || '-'}</TableCell>
                        <TableCell>{parcel.Sender_Tel || '-'}</TableCell>
                        <TableCell>{parcel.Receiver || '-'}</TableCell>
                        <TableCell>{parcel.Receiver_Tel || '-'}</TableCell>               
                        <TableCell>{parcel.Address || '-'}</TableCell>
                        <TableCell>{parcel.Subdistrict || '-'}</TableCell>
                        <TableCell>{parcel.District || '-'}</TableCell>
                        <TableCell>{parcel.Province || '-'}</TableCell>
                        <TableCell>{parcel.Postal_code || '-'}</TableCell>
       
                        <TableCell> 
                          <Chip 
                            label={getStatusText(parcel.Status)} 
                            color={getStatusColor(parcel.Status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        ไม่มีรายการพัสดุ
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar */}
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

export default ShipmentDetails; 