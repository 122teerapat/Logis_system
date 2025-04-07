import { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { getParcelWeight } from '../api';

const Weight = () => {
  const [weightData, setWeightData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeightData = async () => {
      try {
        const response = await getParcelWeight();
        setWeightData(response.data);
      } catch (error) {
        console.error('Error fetching weight data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeightData();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        ข้อมูลน้ำหนักพัสดุและความสามารถในการบรรทุก
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รหัสรถ</TableCell>
              <TableCell>ชื่อรถ</TableCell>
              <TableCell>น้ำหนักบรรทุกสูงสุด</TableCell>
              <TableCell>น้ำหนักพัสดุรวมทั้งหมด</TableCell>
              <TableCell>น้ำหนักคงเหลือ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weightData.map((data) => (
              <TableRow key={data.รหัสรถ}>
                <TableCell>{data.รหัสรถ}</TableCell>
                <TableCell>{data.ชื่อรถ}</TableCell>
                <TableCell>{data.น้ำหนักบรรทุกสูงสุด} กก.</TableCell>
                <TableCell>{data.น้ำหนักพัสดุรวมทั้งหมด} กก.</TableCell>
                <TableCell>{data.น้ำหนักคงเหลือ} กก.</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Weight; 