import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
 Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button,
 FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { getShipmentRouteByIndex, updateShipmentRouteByIndex, updateShipmentStatusByIndex } from '../api';
import { LongdoMap, longdo, map } from "../longdo-map/LongdoMap.jsx";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsIcon from '@mui/icons-material/Directions';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrafficIcon from '@mui/icons-material/Traffic';

const BranchMap = () => {
 const { shipmentId, routeId } = useParams();
 const location = useLocation();
 const [routeData, setRouteData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [routeDistance, setRouteDistance] = useState('');
 const [routeDuration, setRouteDuration] = useState('');
 const [Distance, setDistance] = useState('');
 const [Duration, setDuration] = useState('');
 const [routeMode, setRouteMode] = useState('distance');
 const [useTollway, setUseTollway] = useState(false);
 const mapKey = import.meta.env.VITE_LONGDO_API_KEY;
 const [openDialog, setOpenDialog] = useState(false);
 const [startTime, setStartTime] = useState('');
 const [updating, setUpdating] = useState(false);
 const [errorDialogOpen, setErrorDialogOpen] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');
 const [isJourneyStarted, setIsJourneyStarted] = useState(false);
 const [endTime, setEndTime] = useState('');
 const [openEndDialog, setOpenEndDialog] = useState(false);

 useEffect(() => {
   if (location.state?.shipmentId) fetchRouteData();
 }, [location.state]);

 const fetchRouteData = async () => {
   try {
     const response = await getShipmentRouteByIndex(shipmentId, routeId);
     setRouteData(response.data[0]);
     setLoading(false);
   } catch (error) {
     console.error('Error fetching route data:', error);
     setError('เกิดข้อผิดพลาดในการโหลดข้อมูลเส้นทาง');
     setLoading(false);
   }
 };

 const initMap = () => {
   if (!map || !window.longdo) return;
   try {
     map.Layers.setBase(window.longdo.Layers.GRAY);
     map.Route.placeholder(document.getElementById('result'));
   } catch (error) {
     console.error("เกิดข้อผิดพลาดในการตั้งค่าแผนที่:", error);
   }
 };

 useEffect(() => { initMap(); }, []);

 useEffect(() => {
   if (!map || !routeData) return;

   map.Route.clearDestination();
   
   // เพิ่ม marker ต้นทาง
   map.Route.add(new longdo.Marker(
     { lon: parseFloat(routeData.OriginLongitude), lat: parseFloat(routeData.OriginLatitude) }, 
     { title: routeData.OriginHubName, detail: `สาขาต้นทาง: ${routeData.OriginHubName}` }
   ));

   // เพิ่ม marker ปลายทาง
   map.Route.add(new longdo.Marker(
     { lon: parseFloat(routeData.DesLongitude), lat: parseFloat(routeData.DesLatitude) }, 
     { title: routeData.DestinationHubName, detail: `สาขาปลายทาง: ${routeData.DestinationHubName}` }
   ));

   // ตั้งค่าโหมด
   map.Route.mode(longdo.RouteMode[routeMode.charAt(0).toUpperCase() + routeMode.slice(1)]);
   
   map.Route.enableRoute(longdo.RouteType.AllTransit, false);
   map.Route.enableRoute(longdo.RouteType.Road, true);
   map.Route.enableRoute(longdo.RouteType.Tollway, useTollway);

   map.Route.search();
   map.Route.enableContextMenu();
   map.Route.distance(true);
   map.Route.auto(true);

   const refresh = setInterval(() => {
     setRouteDistance(map.Route.distance(true));
     setRouteDuration(map.Route.interval(true));
     setDistance(map.Route.distance(false));
     setDuration(map.Route.interval(false));
   }, 3000);

   return () => {
     clearInterval(refresh);
     map.Route.clearDestination();
   };
 }, [map, routeData, routeMode, useTollway]);

 const handleStartJourney = async () => {
   if (!startTime) {
     setErrorMessage('กรุณากรอกเวลาเริ่มเดินทาง');
     setErrorDialogOpen(true);
     return;
   }

   try {
     setUpdating(true);
     const statusCode = parseInt(routeId) === 1 ? 'SS02' : 'SS04';
     
     await updateShipmentRouteByIndex(shipmentId, routeId, {
       Distance: Distance,
       Duration: Duration,
       Departure_time: startTime,
       Status: true
     });
  
     await updateShipmentStatusByIndex(
       shipmentId,
       statusCode,
       startTime,
       "",
       routeData.OriginHubID
       
     );
     
     setOpenDialog(false);
     setStartTime('');
     setIsJourneyStarted(true);
     fetchRouteData();
   } catch (error) {
     console.error('Error updating route:', error);
     setErrorMessage('เกิดข้อผิดพลาดในการอัพเดทข้อมูลเส้นทาง');
     setErrorDialogOpen(true);
   } finally {
     setUpdating(false);
   }
 };

 const handleEndJourney = async () => {
   if (!endTime) {
     setErrorMessage('กรุณากรอกเวลาสิ้นสุดการเดินทาง');
     setErrorDialogOpen(true);
     return;
   }

   try {
     setUpdating(true);
     const statusCode = 'SS03'; // สถานะสิ้นสุดการเดินทาง
     
     await updateShipmentRouteByIndex(shipmentId, routeId, {
       Arrival_time: endTime,
       Status: false
     });
  
     await updateShipmentStatusByIndex(
       shipmentId,
       statusCode,
       endTime,
       "",
       routeData.DestinationHubID
       
     );
     
     setOpenEndDialog(false);
     setEndTime('');
     setIsJourneyStarted(false);
     fetchRouteData();
   } catch (error) {
     console.error('Error updating route:', error);
     setErrorMessage('เกิดข้อผิดพลาดในการอัพเดทข้อมูลเส้นทาง');
     setErrorDialogOpen(true);
   } finally {
     setUpdating(false);
   }
 };

 if (loading) {
   return (
     <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
       <CircularProgress />
     </Box>
   );
 }

 return (
   <Container maxWidth="lg" sx={{ minHeight: '100vh', pb: 4 }}>
     <Box sx={{ mt: 4, mb: 4 }}>
       <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
         <Button startIcon={<ArrowBackIcon />} onClick={() => window.history.back()} sx={{ mr: 2 }}>
           กลับ
         </Button>
         <Typography variant="h4" sx={{ flexGrow: 1 }}>แผนที่เส้นทางระหว่างสาขา</Typography>
       </Box>
     </Box>

     <Grid container spacing={3}>
       <Grid item xs={12}>
         <Paper sx={{ p: 3 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             <Typography variant="h6">ข้อมูลเส้นทาง</Typography>
             {!isJourneyStarted ? (
               <Button
                 variant="contained"
                 onClick={() => setOpenDialog(true)}
                 disabled={!routeDistance || !routeDuration}
               >
                 เริ่มเดินทาง
               </Button>
             ) : (
               <Button
                 variant="contained"
                 color="secondary"
                 onClick={() => setOpenEndDialog(true)}
               >
                 สิ้นสุดการเดินทาง
               </Button>
             )}
           </Box>
           <Grid container spacing={2}>
             <Grid item xs={12} sm={6}>
               <Typography variant="subtitle2" color="text.secondary">สาขาต้นทาง</Typography>
               <Typography>{routeData?.OriginHubName} ({routeData?.OriginHubID})</Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="subtitle2" color="text.secondary">สาขาปลายทาง</Typography>
               <Typography>{routeData?.DestinationHubName} ({routeData?.DestinationHubID})</Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="subtitle2" color="text.secondary">ระยะทาง</Typography>
               <Typography>{routeDistance || 'ไม่พบข้อมูล'}</Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
               <Typography variant="subtitle2" color="text.secondary">เวลาเดินทาง</Typography>
               <Typography>{routeDuration || 'ไม่พบข้อมูล'}</Typography>
             </Grid>
             <Grid item xs={12}>
               <Typography variant="subtitle2" color="text.secondary">ลำดับเส้นทาง</Typography>
               <Typography>{routeData?.Sequence || '-'}</Typography>
             </Grid>
             <Grid item xs={12}>
               <Typography variant="subtitle2" color="text.secondary">เวลาเริ่มเดินทาง</Typography>
               <Typography>{routeData?.Departure_time ? new Date(routeData.Departure_time).toLocaleString('th-TH') : 'ยังไม่ได้เริ่มเดินทาง'}</Typography>
             </Grid>
             <Grid item xs={12}>
               <Typography variant="subtitle2" color="text.secondary">เวลาที่คาดว่าจะถึง</Typography>
               <Typography>
                 {routeData?.Departure_time && routeDuration 
                   ? new Date(new Date(routeData.Departure_time).getTime() + (parseInt(routeDuration) * 60 * 1000)).toLocaleString('th-TH')
                   : 'ไม่สามารถคำนวณได้'}
               </Typography>
             </Grid>
             <Grid item xs={12}>
               <Typography variant="subtitle2" color="text.secondary">เวลาถึงจริง</Typography>
               <Typography>{routeData?.Arrival_time ? new Date(routeData.Arrival_time).toLocaleString('th-TH') : 'ยังไม่ถึงปลายทาง'}</Typography>
             </Grid>
           </Grid>
         </Paper>
       </Grid>
       
       <Box sx={{ display: 'flex', justifyContent: 'left', gap: 2, mt: 2, alignItems: 'center' }}>
         <Button
           variant={routeMode === 'distance' ? 'contained' : 'outlined'}
           onClick={() => setRouteMode('distance')}
           startIcon={<DirectionsIcon />}
         >
           เส้นทางที่ใกล้ที่สุด
         </Button>
         <Button
           variant={routeMode === 'cost' ? 'contained' : 'outlined'}
           onClick={() => setRouteMode('cost')}
           startIcon={<AttachMoneyIcon />}
         >
           เส้นทางที่เร็วที่สุด
         </Button>
         <Button
           variant={routeMode === 'traffic' ? 'contained' : 'outlined'}
           onClick={() => setRouteMode('traffic')}
           startIcon={<TrafficIcon />}
         >
           เส้นทางเลี่ยงรถติด
         </Button>
         <Paper sx={{ p: 1 }}>
           <FormControlLabel
             control={<Checkbox checked={useTollway} onChange={e => setUseTollway(e.target.checked)} />}
             label="ใช้ทางด่วน"
           />
         </Paper>
       </Box>
       
       <Grid item xs={12} md={8}>
         <Paper sx={{ p: 2, height: '600px' }}>
           <div style={{ width: '100%', height: '570px' }}>
             <LongdoMap id="longdo-map" mapKey={mapKey} callback={initMap} />
           </div>
         </Paper>
       </Grid>
       
       <Grid item xs={12} md={4}>
         <Paper sx={{ p: 2, height: '600px', position: 'relative' }}>
           <div id="result" style={{
             position: 'absolute', top: 0, bottom: 0, right: 0,
             width: '100%', height: '100%', margin: 'auto',
             border: '4px solid #dddddd', background: '#ffffff',
             overflow: 'auto', zIndex: 0
           }}></div>
         </Paper>
       </Grid>
     </Grid>

     {/* Dialog สำหรับกรอกเวลาเริ่มเดินทาง */}
     <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
       <DialogTitle>เริ่มเดินทาง</DialogTitle>
       <DialogContent>
         <TextField
           autoFocus margin="dense" label="เวลาเริ่มเดินทาง" type="datetime-local"
           fullWidth value={startTime} onChange={e => setStartTime(e.target.value)}
           InputLabelProps={{ shrink: true }}
         />
       </DialogContent>
       <DialogActions>
         <Button onClick={() => setOpenDialog(false)}>ยกเลิก</Button>
         <Button onClick={handleStartJourney} variant="contained" disabled={updating || !startTime}>
           {updating ? 'กำลังอัพเดท...' : 'ยืนยัน'}
         </Button>
       </DialogActions>
     </Dialog>

     {/* Dialog สำหรับกรอกเวลาสิ้นสุดการเดินทาง */}
     <Dialog open={openEndDialog} onClose={() => setOpenEndDialog(false)}>
       <DialogTitle>สิ้นสุดการเดินทาง</DialogTitle>
       <DialogContent>
         <TextField
           autoFocus margin="dense" label="เวลาสิ้นสุดการเดินทาง" type="datetime-local"
           fullWidth value={endTime} onChange={e => setEndTime(e.target.value)}
           InputLabelProps={{ shrink: true }}
         />
       </DialogContent>
       <DialogActions>
         <Button onClick={() => setOpenEndDialog(false)}>ยกเลิก</Button>
         <Button onClick={handleEndJourney} variant="contained" disabled={updating || !endTime}>
           {updating ? 'กำลังอัพเดท...' : 'ยืนยัน'}
         </Button>
       </DialogActions>
     </Dialog>

     {/* Dialog สำหรับแสดงข้อผิดพลาด */}
     <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
       <DialogTitle sx={{ color: 'error.main' }}>เกิดข้อผิดพลาด</DialogTitle>
       <DialogContent><Typography>{errorMessage}</Typography></DialogContent>
       <DialogActions>
         <Button onClick={() => setErrorDialogOpen(false)} color="primary">ตกลง</Button>
       </DialogActions>
     </Dialog>

     {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
   </Container>
 );
};

export default BranchMap;