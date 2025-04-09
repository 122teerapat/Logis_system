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
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox
} from '@mui/material';
import { updateShipmentStatus, getAllStatus, getShipmentById, getShipmentRoute,  updateParcelStatus } from '../api';
import { LongdoMap, longdo, map } from "../longdo-map/LongdoMap.jsx";
import DirectionsIcon from '@mui/icons-material/Directions';

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
  const mapKey = import.meta.env.VITE_LONGDO_API_KEY;
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [routeAdded, setRouteAdded] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [statusForm, setStatusForm] = useState({
    StatusID: '',
    Detail: '',
    BranchID: '',
    Datetime: new Date().toISOString().slice(0, 16)
  });
  const [branches, setBranches] = useState([]);
  const [routeData, setRouteData] = useState([]);

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
        
        if (Array.isArray(locationList) && locationList.length > 1) {
          const firstRoute = locationList[0];

          if (firstRoute.OriginLatitude && firstRoute.OriginLongitude) {
            map.Route.add(new longdo.Marker({
                lon: parseFloat(firstRoute.OriginLongitude),
                lat: parseFloat(firstRoute.OriginLatitude)
            }, {
                title: firstRoute.OriginHubName || 'จุดเริ่มต้น',
                detail: `Located at ${firstRoute.OriginLongitude}, ${firstRoute.OriginLatitude}`
            }));
        }

          locationList.forEach(route => {
              if (route.DesLongitude && route.DesLatitude) {
                  console.log(route);
                  map.Route.add(new longdo.Marker({ 
                      lon: parseFloat(route.DesLongitude), 
                      lat: parseFloat(route.DesLatitude) 
                  }, {
                      title: route.DestinationHubName || 'สาขา',
                      detail: `Located at ${route.DesLongitude}, ${route.DesLatitude}`
                  }));
              }
          });
        }
        setRouteAdded(true);
        
        map.Route.mode(longdo.RouteMode.Cost);
        map.Route.enableRoute(longdo.RouteType.AllTransit, false);
        map.Route.enableRoute(longdo.RouteType.Tollway, false);
        map.Route.enableRoute(longdo.RouteType.Road, true);
        map.Route.search();
        map.Route.enableContextMenu();
        map.Route.auto(false);
        
        
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

  const fetchBranches = async () => {
    try {
      const response = await getShipmentRoute(shipmentId);
      console.log('API Response:', response.data);
      
      if (Array.isArray(response.data)) {
        const uniqueBranches = response.data.reduce((acc, route) => {
          if (route.DestinationHubID && route.DestinationHubName && !acc.some(b => b.DestinationHubID === route.DestinationHubID)) {
            acc.push({
              DestinationHubID: route.DestinationHubID,
              BranchName: route.DestinationHubName,
              DesLongitude: route.DesLongitude,
              DesLatitude: route.DesLatitude
            });
          }
          return acc;
        }, []);
        
        console.log('Unique Branches:', uniqueBranches);
        setBranches(uniqueBranches);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // เพิ่มฟังก์ชันสำหรับดึงข้อมูลเส้นทาง
  const fetchRouteData = async () => {
    try {
      const response = await getShipmentRoute(shipmentId);
      setRouteData(response.data);
    } catch (error) {
      console.error('Error fetching route data:', error);
    }
  };

  useEffect(() => {
    fetchShipmentDetails();
    fetchStatusList();
    initMap();
    fetchBranches();
    fetchRouteData();

    return () => {
      if (map) {
        map.Route.clearDestination();
        setRouteAdded(false);
      }
    };
  }, [shipmentId]);


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

  const handleParcelSelect = (parcelId) => {
    setSelectedParcels(prev => {
      if (prev.includes(parcelId)) {
        return prev.filter(id => id !== parcelId);
      } else {
        return [...prev, parcelId];
      }
    });
  };

  const handleBulkStatusChange = () => {
    if (selectedParcels.length === 0) {
      setError('กรุณาเลือกพัสดุอย่างน้อย 1 รายการ');
      return;
    }
    setOpenDialog(true);
  };

  const handleSubmitStatus = async () => {
    try {
      const promises = selectedParcels.map(parcelId => 
        updateParcelStatus(
          parcelId,
          statusForm.StatusID,
          statusForm.Datetime,
          statusForm.Detail,
          statusForm.BranchID
        )
      );
      
      await Promise.all(promises);
      setOpenDialog(false);
      setSelectedParcels([]);
      fetchShipmentDetails();
    } catch (error) {
      setError('ไม่สามารถอัพเดทสถานะได้');
      console.error('Error updating status:', error);
    }
  };

  // เพิ่มฟังก์ชันสำหรับดูเส้นทาง
  const handleViewRoute = (sequence) => {
    navigate(`/shipment/${shipmentId}/route/${sequence}`, {
      state: {
        shipmentId: shipmentId,
        sequence: sequence,
      }
    });
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
          <div style={{ width: '100%', height: '470px' }}>
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
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                พัสดุ
              </Typography>
              {selectedParcels.length > 0 && (
                <Button
                  variant="contained"
                  onClick={handleBulkStatusChange}
                >
                  แก้ไขสถานะ ({selectedParcels.length} รายการ)
                </Button>
              )}
            </Box>
            {routeData.map((route, index) => {
              const branchParcels = shipment.parcels.filter(
                parcel => parcel.DestinationHubID === route.DestinationHubID
              );
              
              if (branchParcels.length === 0) return null;

              return (
                <Box key={route.DestinationHubID} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {route.DestinationHubName}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<DirectionsIcon />}
                      onClick={() => handleViewRoute(route.Sequence)}
                    >
                      ดูเส้นทาง
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedParcels.length === branchParcels.length && branchParcels.every(p => selectedParcels.includes(p.ParcelID))}
                              indeterminate={selectedParcels.some(id => branchParcels.some(p => p.ParcelID === id)) && !branchParcels.every(p => selectedParcels.includes(p.ParcelID))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParcels(prev => [...new Set([...prev, ...branchParcels.map(p => p.ParcelID)])]);
                                } else {
                                  setSelectedParcels(prev => prev.filter(id => !branchParcels.some(p => p.ParcelID === id)));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>รหัสพัสดุ</TableCell>
                          <TableCell>ผู้ส่ง</TableCell>
                          <TableCell>ผู้รับ</TableCell>
                          <TableCell>ที่อยู่</TableCell>
                          <TableCell>ตำบล</TableCell>
                          <TableCell>อำเภอ</TableCell>
                          <TableCell>จังหวัด</TableCell>
                          <TableCell>รหัสไปรษณีย์</TableCell>
                          <TableCell>สถานะ</TableCell>
                          <TableCell>การจัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {branchParcels.map((parcel) => (
                          <TableRow key={parcel.ParcelID}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedParcels.includes(parcel.ParcelID)}
                                onChange={() => handleParcelSelect(parcel.ParcelID)}
                              />
                            </TableCell>
                            <TableCell>{parcel.ParcelID}</TableCell>
                            <TableCell>{parcel.Sender}</TableCell>
                            <TableCell>{parcel.Receiver}</TableCell>
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
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  setSelectedParcels([parcel.ParcelID]);
                                  setStatusForm({
                                    StatusID: parcel.Status || '',
                                    Detail: '',
                                    BranchID: route.DestinationHubID,
                                    Datetime: new Date().toISOString().slice(0, 16)
                                  });
                                  setOpenDialog(true);
                                }}
                              >
                                แก้ไขสถานะ
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}
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

      {/* Dialog สำหรับแก้ไขสถานะ */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          แก้ไขสถานะพัสดุ {selectedParcels.length > 1 ? `(${selectedParcels.length} รายการ)` : ''}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>สถานะ</InputLabel>
              <Select
                value={statusForm.StatusID}
                onChange={(e) => setStatusForm({ ...statusForm, StatusID: e.target.value })}
                label="สถานะ"
              >
                {statusList.map((status) => (
                  <MenuItem key={status.StatusID} value={status.StatusID}>
                    {status.StatusName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="รายละเอียด"
              multiline
              rows={3}
              value={statusForm.Detail}
              onChange={(e) => setStatusForm({ ...statusForm, Detail: e.target.value })}
            />
            <TextField
              label="วันที่และเวลา"
              type="datetime-local"
              value={statusForm.Datetime}
              onChange={(e) => setStatusForm({ ...statusForm, Datetime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>สาขา</InputLabel>
              <Select
                value={statusForm.BranchID}
                onChange={(e) => setStatusForm({ ...statusForm, BranchID: e.target.value })}
                label="สาขา"
              >
                {branches.length > 0 ? (
                  branches.map((branch) => (
                    <MenuItem key={branch.DestinationHubID} value={branch.DestinationHubID}>
                      {branch.BranchName}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    ไม่พบข้อมูล 
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>ยกเลิก</Button>
          <Button onClick={handleSubmitStatus} variant="contained">
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShipmentDetails; 