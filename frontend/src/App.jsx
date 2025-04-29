import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Home from './pages/Home';
import Parcels from './pages/Parcels';
import Shipments from './pages/Shipments';
import ShipmentDetails from './pages/ShipmentDetails';
import Reports from './pages/Reports';
import UploadCSV from './pages/UploadCSV';
import BranchMap from './pages/BranchMap';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/parcels" element={<Parcels />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/shipments/:shipmentId" element={<ShipmentDetails />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/upload" element={<UploadCSV />} />
            <Route path="/branch-map" element={<BranchMap />} />
            <Route path="/shipment/:shipmentId/route/:routeId" element={<BranchMap />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
