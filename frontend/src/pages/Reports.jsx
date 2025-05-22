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
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { getAllShipments, getShipmentRoute } from '../api';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

const Reports = () => {
  const [shipments, setShipments] = useState([]);
  const [shipmentRoutes, setShipmentRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [tabValue, setTabValue] = useState(0);
  const [performanceData, setPerformanceData] = useState([]);

  // ดึงข้อมูลการจัดส่งและเส้นทาง
  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await getAllShipments();
      const shipmentsData = response.data;
      
      // จัดกลุ่มข้อมูลตาม ShipmentID
      const groupedShipments = shipmentsData.reduce((acc, item) => {
        if (!acc[item.ShipmentID]) {
          acc[item.ShipmentID] = {
            ShipmentID: item.ShipmentID,
            Departure_time: item.Departure_time,
            Estimated_time: item.Estimated_time,
            Arrival_time: item.Arrival_time,
            Status: item.Status,
            Total_Weight: item.Total_Weight,
            parcels: []
          };
        }
        
        if (item.ParcelID) {
          acc[item.ShipmentID].parcels.push({
            ParcelID: item.ParcelID,
            Weight: item.Weight,
            Address: item.Address,
            Province: item.Province,
            Status: item.Status
          });
        }
        
        return acc;
      }, {});

      const shipmentsArray = Object.values(groupedShipments);
      setShipments(shipmentsArray);

      // ดึงข้อมูลเส้นทางสำหรับแต่ละ shipment
      const routePromises = shipmentsArray.map(async (shipment) => {
        try {
          const routeResponse = await getShipmentRoute(shipment.ShipmentID);
          return {
            shipmentId: shipment.ShipmentID,
            routes: routeResponse.data
          };
        } catch (error) {
          console.error(`Error fetching route for ${shipment.ShipmentID}:`, error);
          return {
            shipmentId: shipment.ShipmentID,
            routes: []
          };
        }
      });

      const routeResults = await Promise.all(routePromises);
      const routesMap = {};
      routeResults.forEach(result => {
        routesMap[result.shipmentId] = result.routes;
      });
      
      setShipmentRoutes(routesMap);
      
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการจัดส่ง');
    } finally {
      setLoading(false);
    }
  };

  // คำนวณข้อมูลการวิเคราะห์เวลา
  const calculateTimeAnalysis = () => {
    const analysis = shipments.map(shipment => {
      const routes = shipmentRoutes[shipment.ShipmentID] || [];
      
      // คำนวณเวลารวม
      const departureTime = new Date(shipment.Departure_time);
      const estimatedTime = new Date(shipment.Estimated_time);
      const actualArrivalTime = shipment.Arrival_time ? new Date(shipment.Arrival_time) : null;
      
      // เวลาที่คาดหวัง (ชั่วโมง)
      const expectedDurationHours = (estimatedTime - departureTime) / (1000 * 60 * 60);
      
      // เวลาที่ใช้จริง (ชั่วโมง) - ถ้ายังไม่เสร็จให้ใช้เวลาปัจจุบัน
      const actualEndTime = actualArrivalTime || new Date();
      const actualDurationHours = (actualEndTime - departureTime) / (1000 * 60 * 60);
      
      // ความแตกต่างของเวลา (ชั่วโมง)
      const timeDifferenceHours = actualDurationHours - expectedDurationHours;
      
      // สถานะการดำเนินการ
      const isCompleted = !!shipment.Arrival_time;
      const isOnTime = isCompleted ? timeDifferenceHours <= 0 : (new Date() <= estimatedTime);
      const isDelayed = timeDifferenceHours > 0;
      
      // วิเคราะห์แต่ละขั้นตอน
      const routeAnalysis = routes.map((route, index) => {
        const routeDeparture = new Date(route.Departure_time);
        const routeEstimated = new Date(route.Estimated_time);
        const routeArrival = route.Arrival_time ? new Date(route.Arrival_time) : null;
        
        const routeExpectedDuration = (routeEstimated - routeDeparture) / (1000 * 60 * 60);
        const routeActualDuration = routeArrival ? 
          (routeArrival - routeDeparture) / (1000 * 60 * 60) : 0;
        const routeTimeDifference = routeActualDuration - routeExpectedDuration;
        
        return {
          sequence: route.Sequence,
          origin: route.OriginHubName,
          destination: route.DestinationHubName,
          expectedDuration: routeExpectedDuration,
          actualDuration: routeActualDuration,
          timeDifference: routeTimeDifference,
          isCompleted: !!route.Arrival_time,
          isOnTime: routeArrival ? routeTimeDifference <= 0 : (new Date() <= routeEstimated)
        };
      });

      return {
        ...shipment,
        expectedDurationHours,
        actualDurationHours,
        timeDifferenceHours,
        isCompleted,
        isOnTime,
        isDelayed,
        routeAnalysis,
        completionPercentage: isCompleted ? 100 : Math.min(95, (actualDurationHours / expectedDurationHours) * 100)
      };
    });

    return analysis;
  };

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
  const timeAnalysisData = calculateTimeAnalysis().filter(shipment => 
    filteredShipments.some(fs => fs.ShipmentID === shipment.ShipmentID)
  );

  const statistics = {
    totalShipments: filteredShipments.length,
    completedShipments: timeAnalysisData.filter(s => s.isCompleted).length,
    onTimeShipments: timeAnalysisData.filter(s => s.isOnTime).length,
    delayedShipments: timeAnalysisData.filter(s => s.isDelayed && s.isCompleted).length,
    averageDelay: timeAnalysisData.filter(s => s.isCompleted && s.timeDifferenceHours > 0)
      .reduce((sum, s) => sum + s.timeDifferenceHours, 0) / 
      Math.max(1, timeAnalysisData.filter(s => s.isCompleted && s.timeDifferenceHours > 0).length),
    totalParcels: filteredShipments.reduce((sum, shipment) => sum + (shipment.parcels?.length || 0), 0),
    averageCompletionTime: timeAnalysisData.filter(s => s.isCompleted)
      .reduce((sum, s) => sum + s.actualDurationHours, 0) / 
      Math.max(1, timeAnalysisData.filter(s => s.isCompleted).length)
  };

  // ข้อมูลสำหรับกราฟ
  const performanceChartData = timeAnalysisData.map(shipment => ({
    shipmentId: shipment.ShipmentID,
    expected: Number(shipment.expectedDurationHours.toFixed(1)),
    actual: Number(shipment.actualDurationHours.toFixed(1)),
    difference: Number(shipment.timeDifferenceHours.toFixed(1))
  }));

  const statusDistribution = [
    { name: 'ตรงเวลา', value: statistics.onTimeShipments, color: '#4caf50' },
    { name: 'ล่าช้า', value: statistics.delayedShipments, color: '#f44336' },
    { name: 'กำลังดำเนินการ', value: statistics.totalShipments - statistics.completedShipments, color: '#ff9800' }
  ];

  useEffect(() => {
    fetchShipments();
  }, []);

  // ฟังก์ชันจัดรูปแบบเวลา
  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} นาที`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} ชั่วโมง`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} วัน ${remainingHours.toFixed(1)} ชั่วโมง`;
    }
  };

  const getStatusColor = (isOnTime, isCompleted, isDelayed) => {
    if (!isCompleted) return 'warning';
    if (isOnTime) return 'success';
    if (isDelayed) return 'error';
    return 'default';
  };

  const getStatusText = (isOnTime, isCompleted, isDelayed) => {
    if (!isCompleted) return 'กำลังดำเนินการ';
    if (isOnTime) return 'ตรงเวลา';
    if (isDelayed) return 'ล่าช้า';
    return 'เสร็จสิ้น';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          รายงานการจัดส่งและการวิเคราะห์เวลา
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
                  <MenuItem value="completed">เสร็จสิ้น</MenuItem>
                  <MenuItem value="in-progress">กำลังดำเนินการ</MenuItem>
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

        {/* สถิติหลัก */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">จำนวนการจัดส่ง</Typography>
                <Typography variant="h4">{statistics.totalShipments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  เสร็จสิ้น: {statistics.completedShipments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" color="success.main">ตรงเวลา</Typography>
                <Typography variant="h4">{statistics.onTimeShipments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {statistics.totalShipments > 0 ? 
                    `${((statistics.onTimeShipments / statistics.totalShipments) * 100).toFixed(1)}%` : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <WarningIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h6" color="error.main">ล่าช้า</Typography>
                <Typography variant="h4">{statistics.delayedShipments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  เฉลี่ย: {formatDuration(statistics.averageDelay)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccessTimeIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6" color="info.main">เวลาเฉลี่ย</Typography>
                <Typography variant="h4">{formatDuration(statistics.averageCompletionTime)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ต่อการจัดส่ง
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* แท็บสำหรับรายงานแต่ละประเภท */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="ภาพรวม" />
            <Tab label="การวิเคราะห์เวลา" />
            <Tab label="รายละเอียดแต่ละเส้นทาง" />
          </Tabs>

          {/* แท็บภาพรวม */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    การเปรียบเทียบเวลาคาดหวังกับเวลาจริง
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceChartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="shipmentId" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ชั่วโมง`, 
                          name === 'expected' ? 'เวลาคาดหวัง' : 'เวลาจริง'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="expected" fill="#8884d8" name="เวลาคาดหวัง" />
                      <Bar dataKey="actual" fill="#82ca9d" name="เวลาจริง" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    สัดส่วนสถานะการจัดส่ง
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* แท็บการวิเคราะห์เวลา */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>รหัสการจัดส่ง</TableCell>
                      <TableCell>วันที่ออกเดินทาง</TableCell>
                      <TableCell>เวลาคาดหวัง</TableCell>
                      <TableCell>เวลาจริง</TableCell>
                      <TableCell>ความแตกต่าง</TableCell>
                      <TableCell>สถานะ</TableCell>
                      <TableCell>ความคืบหน้า</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timeAnalysisData.map((shipment) => (
                      <TableRow key={shipment.ShipmentID}>
                        <TableCell>{shipment.ShipmentID}</TableCell>
                        <TableCell>
                          {new Date(shipment.Departure_time).toLocaleDateString('th-TH')}
                        </TableCell>
                        <TableCell>{formatDuration(shipment.expectedDurationHours)}</TableCell>
                        <TableCell>
                          {shipment.isCompleted ? 
                            formatDuration(shipment.actualDurationHours) : 
                            `${formatDuration(shipment.actualDurationHours)} (กำลังดำเนินการ)`
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {shipment.timeDifferenceHours > 0 ? (
                              <>
                                <TrendingUpIcon sx={{ color: 'error.main', mr: 1 }} />
                                <Typography color="error.main">
                                  +{formatDuration(Math.abs(shipment.timeDifferenceHours))}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <TrendingDownIcon sx={{ color: 'success.main', mr: 1 }} />
                                <Typography color="success.main">
                                  -{formatDuration(Math.abs(shipment.timeDifferenceHours))}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusText(shipment.isOnTime, shipment.isCompleted, shipment.isDelayed)}
                            color={getStatusColor(shipment.isOnTime, shipment.isCompleted, shipment.isDelayed)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(100, shipment.completionPercentage)} 
                              sx={{ width: 100, mr: 2 }}
                            />
                            <Typography variant="body2">
                              {Math.round(shipment.completionPercentage)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* แท็บรายละเอียดแต่ละเส้นทาง */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              {timeAnalysisData.map((shipment) => (
                <Paper key={shipment.ShipmentID} sx={{ mb: 3, p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    การจัดส่ง #{shipment.ShipmentID}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ลำดับ</TableCell>
                          <TableCell>จุดเริ่มต้น</TableCell>
                          <TableCell>จุดหมาย</TableCell>
                          <TableCell>เวลาคาดหวัง</TableCell>
                          <TableCell>เวลาจริง</TableCell>
                          <TableCell>ความแตกต่าง</TableCell>
                          <TableCell>สถานะ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {shipment.routeAnalysis.map((route) => (
                          <TableRow key={`${shipment.ShipmentID}-${route.sequence}`}>
                            <TableCell>{route.sequence}</TableCell>
                            <TableCell>{route.origin}</TableCell>
                            <TableCell>{route.destination}</TableCell>
                            <TableCell>{formatDuration(route.expectedDuration)}</TableCell>
                            <TableCell>
                              {route.isCompleted ? 
                                formatDuration(route.actualDuration) : 
                                'กำลังดำเนินการ'
                              }
                            </TableCell>
                            <TableCell>
                              {route.isCompleted ? (
                                <Typography 
                                  color={route.timeDifference > 0 ? 'error.main' : 'success.main'}
                                >
                                  {route.timeDifference > 0 ? '+' : ''}
                                  {formatDuration(Math.abs(route.timeDifference))}
                                </Typography>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={route.isCompleted ? (route.isOnTime ? 'ตรงเวลา' : 'ล่าช้า') : 'กำลังดำเนินการ'}
                                color={route.isCompleted ? (route.isOnTime ? 'success' : 'error') : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Reports;