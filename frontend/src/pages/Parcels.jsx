import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress,
  TablePagination,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getAllParcels, getAllStatus, updateParcelStatus } from '../api';

const Parcels = () => {
  const [parcels, setParcels] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parcelsResponse, statusResponse] = await Promise.all([
          getAllParcels(),
          getAllStatus()
        ]);
        
        const parcelsData = Array.isArray(parcelsResponse.data) ? parcelsResponse.data : [];
        console.log('Parcels data:', parcelsData);
        console.log('Status data:', statusResponse.data);
        
        setParcels(parcelsData);
        setStatusList(statusResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setParcels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ฟังก์ชันสำหรับอัพเดทสถานะ
  const handleStatusChange = async (parcelId, newStatusId) => {
    try {
      await updateParcelStatus(parcelId, newStatusId);
      // อัพเดทข้อมูลใน state
      setParcels(parcels.map(parcel => 
        parcel.ParcelID === parcelId 
          ? { ...parcel, Status: newStatusId }
          : parcel
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      setError('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  // กรองข้อมูลตามคำค้นหา
  const filteredParcels = Array.isArray(parcels) ? parcels.filter(parcel => {
    const searchTermLower = searchTerm.toLowerCase();
    const address = `${parcel.SubDistrict || ''} ${parcel.District || ''} ${parcel.Province}`;
    return (
      String(parcel.ParcelID).toLowerCase().includes(searchTermLower) ||
      String(parcel.Weight).toLowerCase().includes(searchTermLower) ||
      String(parcel.Province).toLowerCase().includes(searchTermLower) ||
      String(parcel.Legion).toLowerCase().includes(searchTermLower) ||
      String(parcel.Status || '').toLowerCase().includes(searchTermLower) ||
      String(parcel.District || '').toLowerCase().includes(searchTermLower) ||
      String(parcel.SubDistrict || '').toLowerCase().includes(searchTermLower) ||
      String(parcel.Address || '').toLowerCase().includes(searchTermLower) ||
      address.toLowerCase().includes(searchTermLower)
    );
  }) : [];

  // คำนวณจำนวนหน้าทั้งหมด
  const totalPages = Math.ceil(filteredParcels.length / rowsPerPage);

  // ดึงข้อมูลสำหรับหน้าปัจจุบัน
  const currentPageData = filteredParcels.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ฟังก์ชันสำหรับแสดงน้ำหนัก
  const renderWeight = (weight) => {
    return `${weight} กรัม`;
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          รายการพัสดุทั้งหมด
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          แสดงรายการพัสดุทั้งหมดในระบบ พร้อมข้อมูลสถานะและรายละเอียด
        </Typography>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="ค้นหาพัสดุ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รหัสพัสดุ</TableCell>
              <TableCell>น้ำหนัก</TableCell>
              <TableCell>ผู้ส่ง</TableCell>
              <TableCell>ผู้รับ</TableCell>
              <TableCell>ที่อยู่</TableCell>
              <TableCell>ตำบล</TableCell>
              <TableCell>อำเภอ</TableCell>
              <TableCell>จังหวัด</TableCell>
              <TableCell>สถานะ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPageData.map((parcel) => (
              <TableRow key={parcel.ParcelID}>
                <TableCell>{parcel.ParcelID}</TableCell>
                <TableCell>{renderWeight(parcel.Weight)}</TableCell>
                <TableCell>{parcel.Sender || '-'}</TableCell>
                <TableCell>{parcel.Receiver || '-'}</TableCell>
                <TableCell>{parcel.Address || '-'}</TableCell>
                <TableCell>{parcel.Subdistrict || '-'}</TableCell>
                <TableCell>{parcel.District || '-'}</TableCell>
                <TableCell>{parcel.Province}</TableCell>
                
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={parcel.Status || ''}
                      onChange={(e) => handleStatusChange(parcel.ParcelID, e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        เลือกสถานะ
                      </MenuItem>
                      {statusList.map((status) => (
                        <MenuItem key={status.StatusID} value={status.StatusID}>
                          {status.StatusName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredParcels.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="จำนวนแถวต่อหน้า:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} จาก ${count} รายการ`
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Parcels; 