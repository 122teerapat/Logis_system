import { OilBarrel } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:8081';


// ดึงข้อมูลพัสดุทั้งหมด
export const getAllParcels = () => {
    return axios.get(`${API_URL}/all-parcel`);
};

// ฟังก์ชันสำหรับฟังก์ชันสำหรับดึงข้อมูลสถานะทั้งหมด
export const getAllStatus = () => {
    return axios.get(`${API_URL}/StatusList`);
};

// ฟังก์ชันสำหรับดึงข้อมูลการจัดส่งทั้งหมด
export const getAllShipments = () => {
    return axios.get(`${API_URL}/all-shipment`);
};

// ฟังก์ชันสำหรับดึงรายละเอียดการจัดส่งตาม ID
export const getShipmentById = (shipmentId) => {
    return axios.get(`${API_URL}/shipment/${shipmentId}`);
}; 

export const getBranch = () => {
    return axios.get(`${API_URL}/branch`);
};

export const getParcelStatusList = (parcelId) => {
    return axios.get(`${API_URL}/parcel-status-list/${parcelId}`);
};

export const getShipmentRoute = (shipmentId) => {
    return axios.get(`${API_URL}/shipment-route/${shipmentId}`);
};

export const getShipmentRouteByIndex= (shipmentId, sequence) => {
    return axios.get(`${API_URL}/shipment-route-index/${shipmentId}/${sequence}`);
};

export const uploadShipmentCSV = (file) => {
    return axios.post(`${API_URL}/upload/shipment-csv`, file, {
        headers: {
            'accept': 'application/json'
        }
    });
};

export const updateParcelStatus = (parcelId, statusId , Datetime, Detail, BranchID) => {
    return axios.post(`${API_URL}/parcel/status/${parcelId}`, { StatusID: statusId, Datetime: Datetime, Detail: Detail, BranchID: BranchID});
};

export const updateShipmentStatusByIndex = (shipmentId, statusId, DateTime, Detail, BranchID) => {
    return axios.post(`${API_URL}/shipment/status/${shipmentId}`, { StatusID: statusId, DateTime: DateTime, Detail: Detail, BranchID: BranchID});
};

export const updateShipmentRouteByIndex = async (shipmentId, routeId, data) => {
  try {
    const response = await axios.put(`${API_URL}/shipment/${shipmentId}/route/${routeId}`, data);
    return response;
  } catch (error) {
    throw error;
  }
};