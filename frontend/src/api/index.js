import axios from 'axios';

const API_URL = 'http://localhost:8081';


// ดึงข้อมูลพัสดุทั้งหมด
export const getAllParcels = () => {
    return axios.get(`${API_URL}/all-parcel`);
};

// ดึงข้อมูลพัสดุตามภูมิภาค
export const getParcelsByRegion = (region) => {
    return axios.get(`${API_URL}/parcel/region/${region}`);
};

// ดึงข้อมูลน้ำหนักพัสดุและความสามารถในการบรรทุก
export const getParcelWeight = () => {
    return axios.get(`${API_URL}/parcel/weight`);
};

// ฟังก์ชันสำหรับดึงรายการสถานะทั้งหมด
export const getStatusList = () => {
    return axios.get(`${API_URL}/StatusList`);
};

// ฟังก์ชันสำหรับฟังก์ชันสำหรับดึงข้อมูลสถานะทั้งหมด
export const getAllStatus = () => {
    return axios.get(`${API_URL}/StatusList`);
};

// ฟังก์ชันสำหรับอัพเดทสถานะพัสดุ
export const updateParcelStatus = (parcelId, statusId) => {
    return axios.put(`${API_URL}/parcel/${parcelId}`, { StatusID: statusId });
};

// ฟังก์ชันสำหรับสร้างการจัดส่ง
export const createShipment = (shipmentData) => {
    return axios.post(`${API_URL}/shipment`, shipmentData);
};

// ฟังก์ชันสำหรับดึงข้อมูลการจัดส่งทั้งหมด
export const getAllShipments = () => {
    return axios.get(`${API_URL}/all-shipment`);
};

// ฟังก์ชันสำหรับอัพเดทสถานะการจัดส่ง
export const updateShipmentStatus = (shipmentId, statusId) => {
    return axios.put(`${API_URL}/shipment-status/${shipmentId}`, { StatusID: statusId });
};

// ฟังก์ชันสำหรับดึงรายละเอียดการจัดส่งตาม ID
export const getShipmentById = (shipmentId) => {
    return axios.get(`${API_URL}/shipment/${shipmentId}`);
}; 

export const getBranch = () => {
    return axios.get(`${API_URL}/branch`);
};

export const getShipmentRoute = (shipmentId) => {
    return axios.get(`${API_URL}/shipment-route/${shipmentId}`);
};

export const uploadShipmentCSV = (file) => {
    return axios.post(`${API_URL}/upload/shipment-csv`, file, {
        headers: {
            'accept': 'application/json'
        }
    });
};