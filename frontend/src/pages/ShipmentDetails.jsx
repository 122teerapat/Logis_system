import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Button, Chip, CircularProgress, Alert, 
  Snackbar, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Checkbox
} from '@mui/material';
import { getAllStatus, getShipmentById, getShipmentRoute, updateParcelStatus } from '../api';
import { LongdoMap, longdo, map } from "../longdo-map/LongdoMap.jsx";
import DirectionsIcon from '@mui/icons-material/Directions';

const ShipmentDetails = () => {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const mapKey = import.meta.env.VITE_LONGDO_API_KEY;
  
  // สถานะต่างๆ
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [routeData, setRouteData] = useState([]);
  
  // สถานะแผนที่
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [routeAdded, setRouteAdded] = useState(false);
  
  // สถานะการแจ้งเตือน
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // สถานะสำหรับการแก้ไขพัสดุ
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({
    StatusID: '',
    Detail: '',
    BranchID: '',
    Datetime: new Date().toISOString().slice(0, 16)
  });

  // รวมฟังก์ชันการดึงข้อมูลทั้งหมดไว้ในฟังก์ชันเดียว
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลทั้งหมดพร้อมกัน
      const [shipmentRes, statusRes, routeRes] = await Promise.all([
        getShipmentById(shipmentId),
        getAllStatus(),
        getShipmentRoute(shipmentId)
      ]);
      
      // ตั้งค่าสถานะ
      if (shipmentRes.data && shipmentRes.data.length > 0) {
        setShipment(shipmentRes.data[0]);
      } else {
        setError('ไม่พบข้อมูลการจัดส่ง');
      }
      
      // ตั้งค่ารายการสถานะ
      setStatusList(statusRes.data);
      
      // ตั้งค่าข้อมูลเส้นทาง
      setRouteData(routeRes.data);
      
      // สร้างรายการสาขาจากข้อมูลเส้นทาง
      if (Array.isArray(routeRes.data)) {
        const uniqueBranches = routeRes.data.reduce((acc, route) => {
          if (route.DestinationHubID && route.DestinationHubName && 
              !acc.some(b => b.DestinationHubID === route.DestinationHubID)) {
            acc.push({
              DestinationHubID: route.DestinationHubID,
              BranchName: route.DestinationHubName,
              DesLongitude: route.DesLongitude,
              DesLatitude: route.DesLatitude
            });
          }
          return acc;
        }, []);
        
        setBranches(uniqueBranches);
      }
      
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเริ่มต้นแผนที่
  const initMap = async () => {
    if (!map || !window.longdo) {
      console.error("ไม่สามารถโหลด Longdo Map API ได้");
      return;
    }
    
    try {
      // ตั้งค่าเบื้องต้นของแผนที่
      map.Layers.setBase(window.longdo.Layers.GRAY);
  
      // รอให้แผนที่พร้อม
      map.Event.bind(longdo.EventName.Ready, async function() {
        try {
          // ดึงข้อมูลเส้นทาง (ใช้ข้อมูลที่ดึงมาแล้ว)
          const locationList = routeData || [];
          
          // ตั้งค่าการค้นหาเส้นทาง
          map.Route.placeholder(document.getElementById('result'));
          map.Route.clearDestination();
          
          if (Array.isArray(locationList) && locationList.length > 0) {
            // เพิ่มจุดเริ่มต้น
            const firstRoute = locationList[0];
            if (firstRoute.OriginLatitude && firstRoute.OriginLongitude) {
              map.Route.add(new longdo.Marker({
                lon: parseFloat(firstRoute.OriginLongitude),
                lat: parseFloat(firstRoute.OriginLatitude)
              }, {
                title: firstRoute.OriginHubName || 'จุดเริ่มต้น',
                detail: `พิกัด ${firstRoute.OriginLongitude}, ${firstRoute.OriginLatitude}`
              }));
            }
            
            // เพิ่มจุดปลายทางทั้งหมด
            locationList.forEach(route => {
              if (route.DesLongitude && route.DesLatitude) {
                map.Route.add(new longdo.Marker({ 
                  lon: parseFloat(route.DesLongitude), 
                  lat: parseFloat(route.DesLatitude) 
                }, {
                  title: route.DestinationHubName || 'สาขา',
                  detail: `พิกัด ${route.DesLongitude}, ${route.DesLatitude}`
                }));
              }
            });
          }
          
          setRouteAdded(true);
          
          // ตั้งค่า Route options
          map.Route.mode(longdo.RouteMode.Cost);
          map.Route.enableRoute(longdo.RouteType.Road, true);
          map.Route.enableRoute(longdo.RouteType.AllTransit, false);
          map.Route.enableRoute(longdo.RouteType.Tollway, false);
          map.Route.search();
          map.Route.enableContextMenu();
          map.Route.auto(false);
          
          // ดึงข้อมูลระยะทางและเวลา
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
  
          // ทำความสะอาดเมื่อ unmount
          return () => clearInterval(refreshInterval);
        } catch (error) {
          console.error("เกิดข้อผิดพลาดในการตั้งค่าเส้นทาง:", error);
        }
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการตั้งค่าแผนที่:", error);
    }
  };

  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    if (!status) return 'อยู่ระหว่างดำเนินการ';
    const statusItem = statusList.find(s => s.StatusID === status);
    return statusItem ? statusItem.AltName : 'อยู่ระหว่างดำเนินการ';
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


  // จัดการการเลือกพัสดุ
  const handleParcelSelect = (parcelId) => {
    setSelectedParcels(prev => {
      if (prev.includes(parcelId)) {
        return prev.filter(id => id !== parcelId);
      } else {
        return [...prev, parcelId];
      }
    });
  };

  // จัดการการเปลี่ยนสถานะหลายรายการ
  const handleBulkStatusChange = () => {
    if (selectedParcels.length === 0) {
      setSnackbar({
        open: true,
        message: 'กรุณาเลือกพัสดุอย่างน้อย 1 รายการ',
        severity: 'error'
      });
      return;
    }
    setOpenDialog(true);
  };

  // จัดการการส่งสถานะ
  const handleSubmitStatus = async () => {
    try {
      // อัพเดทสถานะทุกพัสดุที่เลือก
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
      
      // ปิด dialog และรีเซ็ตสถานะ
      setOpenDialog(false);
      setSelectedParcels([]);
      setSnackbar({
        open: true,
        message: 'อัพเดทสถานะเรียบร้อยแล้ว',
        severity: 'success'
      });
      
      // ดึงข้อมูลใหม่
      fetchAllData();
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({
        open: true,
        message: 'ไม่สามารถอัพเดทสถานะได้',
        severity: 'error'
      });
    }
  };

  // จัดการการดูเส้นทาง
  const handleViewRoute = (sequence) => {
    navigate(`/shipment/${shipmentId}/route/${sequence}`, {
      state: {
        shipmentId: shipmentId,
        sequence: sequence,
      }
    });
  };

  // โหลดข้อมูลเมื่อ component ถูกโหลด
  useEffect(() => {
    fetchAllData();
    
    // ทำความสะอาดเมื่อ unmount
    return () => {
      if (map) {
        map.Route.clearDestination();
        setRouteAdded(false);
      }
    };
  }, [shipmentId]);
  
  // อัพเดทแผนที่เมื่อข้อมูลเส้นทางมีการเปลี่ยนแปลง
  useEffect(() => {
    if (routeData.length > 0) {
      initMap();
    }
  }, [routeData]);

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
                  {new Date(shipment.Estimated_time).toLocaleString('th-TH')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ระยะทาง
                </Typography>
                <Typography>
                  {routeDistance || 'กำลังโหลดข้อมูล...'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  เวลาเดินทาง
                </Typography>
                <Typography>
                  {routeDuration || 'กำลังโหลดข้อมูล...'}
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
            {/* แสดงพัสดุตามสาขา */}
            {routeData.map((route) => {
              // กรองพัสดุตามสาขา
              let branchParcels = shipment.parcels?.filter(
                parcel => parcel.DestinationHubID === route.DestinationHubID
              ) || [];
              
              if (branchParcels.length === 0) return null;
              
              // เรียงลำดับพัสดุตามรหัสพัสดุ (จากน้อยไปมาก)
              branchParcels = [...branchParcels].sort((a, b) => a.ParcelID - b.ParcelID);

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
                  <TableContainer component={Paper} sx={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell padding="checkbox" align="center">
                            <Checkbox
                              checked={branchParcels.length > 0 && branchParcels.every(p => selectedParcels.includes(p.ParcelID))}
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
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>รหัสพัสดุ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>ผู้ส่ง</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>ผู้รับ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>ที่อยู่</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>อำเภอ/เขต</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>จังหวัด</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>การจัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {branchParcels.map((parcel) => (
                          <TableRow 
                            key={parcel.ParcelID}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                              '&:hover': { backgroundColor: '#f1f1f1' }
                            }}
                          >
                            <TableCell padding="checkbox" align="center">
                              <Checkbox
                                checked={selectedParcels.includes(parcel.ParcelID)}
                                onChange={() => handleParcelSelect(parcel.ParcelID)}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'medium' }}>{parcel.ParcelID}</TableCell>
                            <TableCell>{parcel.Sender}</TableCell>
                            <TableCell>{parcel.Receiver}</TableCell>
                            <TableCell>{parcel.Address || '-'}</TableCell>
                            <TableCell>{parcel.District || parcel.Subdistrict || '-'}</TableCell>
                            <TableCell>{parcel.Province || '-'}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={getStatusText(parcel.Status)} 
                                color={getStatusColor(getStatusText(parcel.Status))}
                                size="small"
                                sx={{ fontWeight: 'medium' }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="contained"
                                size="small"
                                color="primary"
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
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
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
                    {status.AltName}
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