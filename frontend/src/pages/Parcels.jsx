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
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getAllParcels, getParcelStatusList } from '../api';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Parcels = () => {
  const [parcels, setParcels] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const parcelsResponse = await getAllParcels();
      
        const parcelsData = Array.isArray(parcelsResponse.data) ? parcelsResponse.data : [];

        setParcels(parcelsData);

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

  // ฟังก์ชันดูสถานะพัสดุ
  const handleViewStatus = async (parcel) => {
    try {
      setSelectedParcel(parcel);
      setLoadingStatus(true);
      const response = await getParcelStatusList(parcel.ParcelID);
      setStatusList(response.data);
      setOpenDialog(true);
    } catch (error) {
      console.error('Error fetching parcel status:', error);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูลสถานะพัสดุ');
    } finally {
      setLoadingStatus(false);
    }
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
              <TableCell>รายการสถานะ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPageData.map((parcel, index) => (
              <TableRow key={`${parcel.ParcelID}-${index}`}>
                <TableCell>{parcel.ParcelID}</TableCell>
                <TableCell>{renderWeight(parcel.Weight)}</TableCell>
                <TableCell>{parcel.Sender || '-'}</TableCell>
                <TableCell>{parcel.Receiver || '-'}</TableCell>
                <TableCell>{parcel.Address || '-'}</TableCell>
                <TableCell>{parcel.Subdistrict || '-'}</TableCell>
                <TableCell>{parcel.District || '-'}</TableCell>
                <TableCell>{parcel.Province}</TableCell>
                
                <TableCell>
                  <Button
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewStatus(parcel)}
                    size="small"
                  >
                    ดูสถานะ
                  </Button>
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

      {/* Dialog แสดงสถานะพัสดุ */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ประวัติสถานะพัสดุ
          {selectedParcel && ` - ${selectedParcel.ParcelID}`}
        </DialogTitle>
        <DialogContent>
          {loadingStatus ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {statusList.map((status, index) => (
                <Box key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {index + 1}.
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {status.AltName}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ ml: 'auto' }}>
                            {new Date(status.DateTime).toLocaleString('th-TH')}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body1" color="text.secondary">
                            สาขา: {status.BranchName || '-'}
                          </Typography>
                          {status.Detail && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              รายละเอียด: {status.Detail}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < statusList.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

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