import { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { uploadShipmentCSV } from '../api';

const UploadCSV = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
      setSuccess('');
    } else {
      setError('กรุณาเลือกไฟล์ CSV เท่านั้น');
      setFile(null);
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์ก่อนอัพโหลด');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadShipmentCSV(formData);
      setSuccess('อัพโหลดไฟล์สำเร็จ');
      setFile(null);
    } catch (error) {
      setError(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัพโหลด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          อัพโหลดข้อมูลการจัดส่ง
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            รูปแบบไฟล์ CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ไฟล์ CSV ต้องมีคอลัมน์ดังนี้:
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box component="ul" sx={{ pl: 2, flex: 1 }}>
              <li>ShipmentID (รหัสการจัดส่ง)</li>
              <li>Departure_time (รูปแบบ: YYYY-MM-DD HH:mm:ss)</li>
              <li>Estimated_arrival (รูปแบบ: YYYY-MM-DD HH:mm:ss)</li>
              <li>Total_Weight (น้ำหนักรวม)</li>
              <li>Total_Volume (ปริมาตรรวม)</li>
              <li>OriginHubID (รหัสศูนย์ต้นทาง)</li>
              <li>DestinationHubID (รหัสศูนย์ปลายทาง)</li>
              <li>VehicleID (รหัสรถ)</li>
              <li>EmpID (รหัสพนักงาน)</li>
              <li>Width (ความกว้าง)</li>
              <li>Height (ความสูง)</li>
              <li>Length (ความยาว)</li>
            </Box>
            <Box component="ul" sx={{ pl: 2, flex: 1 }}>
              <li>Weight (น้ำหนัก)</li>
              <li>Price (ราคา)</li>
              <li>Sender (ผู้ส่ง)</li>
              <li>Sender_Tel (เบอร์ผู้ส่ง)</li>
              <li>Receiver (ผู้รับ)</li>
              <li>Receiver_Tel (เบอร์ผู้รับ)</li>
              <li>ShippingTypeID (รหัสประเภทการจัดส่ง)</li>
              <li>Address (ที่อยู่)</li>
              <li>Subdistrict (ตำบล)</li>
              <li>District (อำเภอ)</li>
              <li>Province (จังหวัด)</li>
              <li>Postal_code (รหัสไปรษณีย์)</li>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-file-input"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="csv-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFile />}
            >
              เลือกไฟล์ CSV
            </Button>
          </label>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              ไฟล์ที่เลือก: {file.name}
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'กำลังอัพโหลด...' : 'อัพโหลด'}
        </Button>
      </Paper>
    </Container>
  );
};

export default UploadCSV; 