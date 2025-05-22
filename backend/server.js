const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const axios = require('axios')
require('dotenv').config();

app.use(cors())

const upload = multer({ dest: 'uploads/' });

app.use(express.json())

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_Name
})

app.get("/", (req, res) => {
    return res.json("from backend")
})



app.get('/StatusList', (req, res) => {
    const sql = "SELECT * FROM logis_shipment_status"
    db.query(sql, (err, data) =>{
        if(err) return res.json("Error");
        return res.json(data);
    })
})


app.get('/all-parcel', (req, res) => {
    const sql = `SELECT
        p.Weight,
        p.Width,
        p.Height,
        p.Length,
        p.ParcelID,
        p.Sender,
        p.Receiver,
        p.Address,
        p.Subdistrict,
        p.District,
        p.Province,
        p.Postal_code
    FROM
        logis_parcel p
    `;
    
    db.query(sql, (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})


app.get('/parcel/status/:id', (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM logis_parcel_status_history WHERE ParcelID = ?`;
    db.query(sql, [id], (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})

app.post('/parcel/status/:id', (req, res) => {
    const id = req.params.id;
    const { StatusID, Datetime ,Detail, BranchID, create_by } = req.body;
    
    db.beginTransaction(err => {
        if (err) return res.json({ error: err.message });
        
        // อัพเดทสถานะหลัก
        db.query(`UPDATE logis_parcel SET Status = ? WHERE ParcelID = ?`, [StatusID, id], (err, updateResult) => {
            if (err) return db.rollback(() => res.json({ error: err.message }));
            
            // หา sequence ล่าสุด
            db.query(`SELECT COALESCE(MAX(Sequence), 0) as maxSeq FROM logis_parcel_status_history WHERE ParcelID = ?`, [id], (err, result) => {
                if (err) return db.rollback(() => res.json({ error: err.message }));
                
                const newSequence = result[0].maxSeq + 1;
                
                // เพิ่มประวัติสถานะ
                db.query(`INSERT INTO logis_parcel_status_history (ParcelID, Sequence, DateTime, Detail, StatusID, BranchID, create_by)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [id, newSequence, Datetime, Detail, StatusID, BranchID, create_by], (err, insertResult) => {
                    if (err) return db.rollback(() => res.json({ error: err.message }));
                    
                    db.commit(err => {
                        if (err) return db.rollback(() => res.json({ error: err.message }));
                        res.json({ success: true, parcel: id, sequence: newSequence });
                    });
                });
            });
        });
    });
});

app.get('/shipment/status/:id', (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM logis_shipment_status_history WHERE ShipmentID = ?`;
    db.query(sql, [id], (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})


app.post('/shipment/status/:id', (req, res) => {
    const id = req.params.id;
    const { StatusID, DateTime, Detail, BranchID, create_by } = req.body;
    
    // ใช้เวลาปัจจุบันถ้าไม่ได้ระบุ
    const timestamp = DateTime || new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    db.beginTransaction(err => {
        if (err) return res.json({ error: err.message });
        
        // อัพเดทสถานะหลัก
        db.query(`UPDATE logis_shipment SET Status = ? WHERE ShipmentID = ?`, [StatusID, id], (err, updateResult) => {
            if (err) return db.rollback(() => res.json({ error: err.message }));
            
            // หา sequence ล่าสุด
            db.query(`SELECT COALESCE(MAX(Sequence), 0) as maxSeq FROM logis_shipment_status_history WHERE ShipmentID = ?`, [id], (err, result) => {
                if (err) return db.rollback(() => res.json({ error: err.message }));
                
                const newSequence = result[0].maxSeq + 1;
                
                // เพิ่มประวัติสถานะ
                db.query(`INSERT INTO logis_shipment_status_history (ShipmentID, Sequence, DateTime, Detail, StatusID, BranchID, create_by)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id, newSequence, timestamp, Detail || '', StatusID, BranchID, create_by || 'system'], (err, insertResult) => {
                    if (err) return db.rollback(() => res.json({ error: err.message }));
                    
                    db.commit(err => {
                        if (err) return db.rollback(() => res.json({ error: err.message }));
                        res.json({ success: true, shipment: id, sequence: newSequence });
                    });
                });
            });
        });
    });
});


const getCoordinates = async (address) => {
    try {
        const longdoUrl = `https://search.longdo.com/addresslookup/api/addr/geocoding?text=${encodeURIComponent(address)}&key=${process.env.LONGDO_API_KEY}`;
        const response = await axios.get(longdoUrl);

        if (response.data.data.length > 0) {
            return {
                Latitude: response.data.data[0].point[0].lat,
                Longitude: response.data.data[0].point[0].lon
            };
        }
        return { Latitude: null, Longitude: null };
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        return { Latitude: null, Longitude: null };
    }
};

const findShortestPath = async (locations) => {
    try {
        // ตรวจสอบข้อมูลที่รับมา
        if (!Array.isArray(locations) || locations.length < 2) {
            throw new Error('ต้องมีตำแหน่งอย่างน้อย 2 จุดในการหาเส้นทาง');
        }

        // แยกข้อมูลละติจูดและลองจิจูด
        const lat = locations.map(loc => loc.lat);
        const lon = locations.map(loc => loc.lon);

        // สร้าง URL parameters และเรียกใช้ API
        const params = new URLSearchParams();
        params.append('key', process.env.LONGDO_API_KEY);
        
        // เพิ่มพารามิเตอร์ lon[] และ lat[] สำหรับแต่ละตำแหน่ง
        lon.forEach(val => params.append('lon[]', val));
        lat.forEach(val => params.append('lat[]', val));
        
        // ตั้งค่าโหมดและพารามิเตอร์อื่นๆ
        params.append('mode', 't');     // โหมด traffic (เร็วที่สุดพร้อมข้อมูลจราจร)
        params.append('cost', 'false'); // ไม่แสดงข้อมูลค่าใช้จ่าย
        params.append('otsp', 'false'); // ไม่ใช้ OTSP (จุดเริ่มต้นและสิ้นสุดเดียวกัน)

        const response = await axios.post('https://api.longdo.com/route-tsp-v2', params);
        return response.data;
    } catch (error) {
        console.error("Error finding shortest path:", error);
        return null;
    }
}

app.post('/upload/parcel-csv', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "ไม่พบไฟล์" });
    const file = req.file;
    let parcels = [];
    const promises = [];

    fs.createReadStream(file.path, 'utf-8')
        .pipe(csv({ parseNumbers: true, parseBooleans: true, trim: true }))
    .on('data', (row) => {
            const rowProcessingPromise = (async () => {
                try {
                    const { Latitude, Longitude } = await getCoordinates(`${row['Address']}, ${row['Subdistrict']}, ${row['District']}, ${row['Province']} ${row['Postal_code']}`);
                    console.log(Latitude, Longitude);
        parcels.push([
                        row['Width'], row['Height'],  row['Length'], row['Weight'], row['Price'],
                        row['Sender'], row['Sender_Tel'], row['Receiver'], row['Receiver_Tel'],
                        row['ShippingTypeID'], row['Address'], row['Subdistrict'], row['District'],
                        row['Province'], row['Postal_code'].trim(),
                        Latitude,
                        Longitude
                    ]);
                } catch (error) {
                    console.error("Error processing row:", error);
                }
            })();

            promises.push(rowProcessingPromise);
        })
        .on('end', async () => {
            try {
                // Wait for all promises to complete
                await Promise.all(promises);

                // Prepare the SQL query
                const sql = `INSERT INTO logis_parcel(
                    Width, Height, Length,  Weight, 
                    Price,  Sender, Sender_Tel, Receiver, 
                    Receiver_Tel, ShippingTypeID, Address, 
                    Subdistrict, District, Province,  Postal_code, 
                    Latitude, Longitude)  
                VALUES ?`;

                db.query(sql, [parcels], (err, data) => {
                    if (err) return res.json({ message: err.message });
                    return res.json({ message: "Parcels uploaded successfully", data });
                });
            } catch (error) {
                console.error("Error during file processing:", error);
                res.status(500).json({ message: "Error processing file" });
            }
        });
})


app.post('/upload/shipment-csv', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({message: "ไม่พบไฟล์"});
    
    const shipments = {}, parcels = [], shipList = [], routes = [];
    const statusHistory = []; // เพิ่มอาร์เรย์สำหรับเก็บข้อมูลประวัติสถานะ
    const destMap = {};
    const user = req.session?.username || 'system';
    let prevDestination = "";
    const shipmentSequences = {};
    let lastShipmentID = "";
    
    fs.createReadStream(req.file.path)
        .pipe(csv({parseNumbers: true, parseBooleans: true, trim: true}))
        .on('data', row => {
            if (row.ShipmentID !== lastShipmentID) {
                prevDestination = ""; // รีเซ็ตเมื่อเจอ ShipmentID ใหม่
                lastShipmentID = row.ShipmentID;
            }
            // เก็บ shipment
            if (!shipments[row.ShipmentID]) {
                shipments[row.ShipmentID] = [row.ShipmentID, row.Departure_time, row.Estimated_time, 
                    row.Total_Weight, row.Total_Volume, row.OriginHubID, 
                    row.DestinationHubID, row.VehicleID, row.EmpID, user];
                
                // เริ่มต้นนับ sequence สำหรับ shipment นี้
                shipmentSequences[row.ShipmentID] = 0;
                
                // เพิ่มข้อมูลสำหรับประวัติสถานะ - ใช้ sequence เป็น 1 สำหรับสถานะแรก
                statusHistory.push([
                    row.ShipmentID,     // ShipmentID
                    1,                   // Sequence
                    row.Departure_time,  // DateTime (ใช้ Departure_time ตามที่กำหนด)
                    '',                  // Detail (ไม่มีรายละเอียด)
                    'SS01',              // StatusID (ใช้ค่า SS01 ตามที่กำหนด)
                    row.OriginHubID,     // BranchID (ใช้ OriginHubID เป็น BranchID)
                    user                 // create_by
                ]);
            }
            
            // สร้าง route ที่ไม่ซ้ำ
            const key = `${row.ShipmentID}-${row.DestinationHubID}`;
            if (!destMap[key]) {
                destMap[key] = true;
                const seq = Object.keys(destMap).filter(k => k.startsWith(`${row.ShipmentID}-`)).length;
                if(prevDestination === ""){
                    routes.push([row.ShipmentID, seq, row.Departure_time, 
                        row.Estimated_time, row.OriginHubID, row.DestinationHubID, user]);
                }else if(prevDestination !== row.DestinationHubID){
                    routes.push([row.ShipmentID, seq, row.Departure_time, 
                        row.Estimated_time, prevDestination, row.DestinationHubID, user]);
                }
                prevDestination = row.DestinationHubID;
            }
        
            // เก็บ parcel และ shipment_list
            parcels.push([row.Width, row.Height, row.Length, row.Weight, row.Price,
                row.Sender, row.Sender_Tel, row.Receiver, row.Receiver_Tel, row.ShippingTypeID,
                row.Address, row.Subdistrict, row.District, row.Province, row.Postal_code, user]
            );
            

            shipmentSequences[row.ShipmentID]++;
        
            // ใช้ sequence ที่นับแยกตาม shipment
            shipList.push([row.ShipmentID, shipmentSequences[row.ShipmentID], '',
                null, row.DestinationHubID, user]);
    })
    .on('end', () => {
            if (Object.keys(shipments).length === 0) 
                return handleError(null, "ไม่พบข้อมูล");
            
            db.beginTransaction(err => {
                if (err) return handleError(err, "เริ่ม transaction ล้มเหลว");
                
                // 1. เพิ่ม Shipment
                db.query(`INSERT INTO logis_shipment(ShipmentID, Departure_time, Estimated_time, 
                     Total_Weight, Total_Volume, OriginHubID, DestinationHubID,
                    VehicleID, EmpID, create_by) VALUES ? 
                    ON DUPLICATE KEY UPDATE ShipmentID = VALUES(ShipmentID)`, 
                    [Object.values(shipments)], err => {
                    
                    if (err) return handleError(err, "เพิ่ม shipment ล้มเหลว");
                    
                    // 2. เพิ่ม Parcel
                    db.query(`INSERT INTO logis_parcel(Width, Height, Length, Weight, Price,  
                        Sender, Sender_Tel, Receiver, Receiver_Tel, ShippingTypeID, Address, Subdistrict, 
                        District, Province, Postal_code, create_by) 
                        VALUES ?`, [parcels], (err, result) => {
                        
                        if (err) return handleError(err, "เพิ่ม parcel ล้มเหลว");
                        
                        // ใส่ ParcelID ที่ถูกต้อง
                        shipList.forEach((item, i) => item[3] = result.insertId + i);
                        
                        // 3. เพิ่ม Shipment List
                        db.query(`INSERT INTO logis_shipment_list(ShipmentID, Sequence, Detail,
                            ParcelID, DestinationHubID, create_by) VALUES ?`, 
                            [shipList], err => {
                            
                            if (err) return handleError(err, "เพิ่ม shipment list ล้มเหลว");
                            
                            // 4. เพิ่ม Shipment Route
                            db.query(`INSERT INTO logis_shipment_route(ShipmentID, Sequence, Departure_time,
                                 Estimated_Time, OriginHubID, DestinationHubID, create_by) VALUES ?`, [routes], err => {
                                
                                if (err) return handleError(err, "เพิ่ม route ล้มเหลว");
                                
                                // 5. เพิ่ม Shipment Status History
                                db.query(`INSERT INTO logis_shipment_status_history(ShipmentID, Sequence, DateTime,
                                     Detail, StatusID, BranchID, create_by) VALUES ?`, [statusHistory], err => {
                                    
                                    if (err) return handleError(err, "เพิ่มประวัติสถานะล้มเหลว");
                                    
                                    db.commit(err => {
                                        if (err) return handleError(err, "commit ล้มเหลว");
                                        fs.unlink(req.file.path, () => {});
                                        res.json({message: "สำเร็จ", stats: {
                                            shipments: Object.keys(shipments).length, 
                                            parcels: parcels.length, 
                                            routes: routes.length,
                                            statusHistory: statusHistory.length}});
                                    });
                                });
                            });
                        });
                    });
                });
            });
        })
        .on('error', err => handleError(err, "อ่านไฟล์ล้มเหลว"));
    
    function handleError(err, msg) {
        db.rollback(() => {});
        fs.unlink(req.file.path, () => {});
        res.status(500).json({message: msg, error: err?.message});
    }
});


app.get('/shipment/:shipmentId', (req, res) => {
    const shipmentId = req.params.shipmentId;
    const sql = `
         SELECT  
			s.ShipmentID, s.Departure_time, s.Estimated_time, s.Arrival_time, s.Status, p.ParcelID, p.Weight,
            p.Width, p.Height, p.Length,  p.Address, p.Subdistrict,p.District, p.Province,
            p.Postal_code, p.Sender, p.Sender_Tel,sl.DestinationHubID, b.BranchName,
            p.Receiver,p.Receiver_Tel,p.Status AS ParcelStatus , s.EmpID , e.Fname , e.Lname , s.VehicleID , vt.TypeName , vt.Fuel_efficiency
        FROM logis_shipment s
        LEFT JOIN logis_shipment_list sl ON s.ShipmentID = sl.ShipmentID
        LEFT JOIN logis_parcel p ON sl.ParcelID = p.ParcelID 
        LEFT JOIN logis_branch b ON sl.DestinationHubID = b.BranchCode
        LEFT JOIN logis_employee e ON s.EmpID = e.EmpID
        LEFT JOIN logis_vehicle v ON s.VehicleID = v.VehicleID
        LEFT JOIN logis_vehicle_type vt ON v.VehicleTypeID = vt.VehicleTypeID
        WHERE s.ShipmentID = ?
        ORDER BY DestinationHubID`;

    db.query(sql, [shipmentId], (err, data) => {
        if(err) return res.json(err.message);
        
        // จัดรูปแบบข้อมูลให้มี parcels array
        if (data.length > 0) {
            const shipment = {
                ShipmentID: data[0].ShipmentID,
                Departure_time: data[0].Departure_time,
                Estimated_time: data[0].Estimated_time,
                Arrival_time: data[0].Arrival_time,
                EmpID: data[0].EmpID,
                Fname: data[0].Fname,
                Lname: data[0].Lname,
                VehicleID: data[0].VehicleID,
                TypeName: data[0].TypeName,
                Fuel_efficiency: data[0].Fuel_efficiency,
                Status: data[0].Status,
                parcels: data
                    .filter(row => row.ParcelID) // กรองเฉพาะรายการที่มี ParcelID
                    .map(row => ({
                        ParcelID: row.ParcelID,
                        Weight: row.Weight,
                        Area: row.Width * row.Height * row.Length / 1000000, // คำนวณพื้นที่เป็นลูกบาศก์เมตร
                        Sender: row.Sender,
                        Receiver: row.Receiver, 
                        DestinationHubID: row.DestinationHubID,
                        DestinationHubName: row.BranchName,
                        Sender_Tel: row.Sender_Tel,
                        Receiver_Tel: row.Receiver_Tel,
                        Address: row.Address,
                        Subdistrict: row.Subdistrict,
                        District: row.District,
                        Province: row.Province,
                        Postal_code: row.Postal_code,
                        Status: row.ParcelStatus
                    }))
            };
            return res.json([shipment]);
        }
        return res.json([]);
    });
})


app.get('/shipment-route/:shipmentId', (req, res) => {
    const shipmentId = req.params.shipmentId;
    const sql = `SELECT 
                    ShipmentID ,
                    Sequence ,
                    OriginHubID,
                    Departure_time,
                    Estimated_time,
                    Arrival_time,
                    bo.BranchName AS OriginHubName,
                    bo.Latitude AS OriginLatitude,
                    bo.Longitude AS OriginLongitude,
                    DestinationHubID,
                    bd.BranchName AS DestinationHubName,
                    bd.Latitude AS DesLatitude,
                    bd.Longitude AS DesLongitude
                FROM 
                    logis_shipment_route sr
                INNER JOIN logis_branch bo ON
                    sr.OriginHubID = bo.BranchCode
                INNER JOIN logis_branch bd ON
                    sr.DestinationHubID= bd.BranchCode
                WHERE ShipmentID = ?`;
    db.query(sql, [shipmentId], (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})


app.put('/shipment/:shipmentId/route/:sequence?', (req, res) => {
    const { shipmentId, sequence } = req.params;
    const updateData = req.body;
    
    // กรองฟิลด์ที่อนุญาตให้อัพเดต
    const allowedFields = ['Date_Time', 'Distance', 'Duration', 'Arrival_time', 'OriginHubID', 'DestinationHubID', 'Status'];
    const updates = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
    );
    
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับอัพเดต" });
    }
    
    // ถ้ามี Date_Time และ Duration ให้คำนวณ Estimated_Time
    if (updates.Date_Time && updates.Duration) {
        db.query(
            `SELECT DATE_ADD(?, INTERVAL ? SECOND) AS est_time`, 
            [updates.Date_Time, updates.Duration],
            (err, result) => {
                if (err) return res.status(500).json({ message: err.message });
                updates.Estimated_Time = result[0].est_time;
                executeUpdate();
            }
        );
    } else {
        executeUpdate();
    }
    
    function executeUpdate() {
        const setClause = Object.keys(updates).map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), shipmentId];
        
        let sql = `UPDATE logis_shipment_route SET ${setClause} WHERE ShipmentID = ?`;
        if (sequence) {
            sql += ` AND Sequence = ?`;
            values.push(sequence);
        }
        
        db.query(sql, values, (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({
                success: result.affectedRows > 0,
                affectedRows: result.affectedRows
            });
        });
    }
 });


app.get('/all-shipment', (req, res) => {
    const sql = `
SELECT 
        ls.ShipmentID, ls.Departure_time, ls.Estimated_time, ls.Arrival_time,ls.Total_Weight,
        ls.OriginHubID,ls.DestinationHubID,ls.VehicleID,ls.EmpID,sl.ShipmentID,
        sl.Sequence,sl.ParcelID, p.ParcelID, p.Width,p.Height,
        p.Weight, p.Length,p.Address, p.Subdistrict, p.District,
        p.Province,p.Postal_code, p.Status,ss.AltName
FROM 
	logis_shipment ls
INNER JOIN 
    logis_shipment_list sl 
ON 
    ls.ShipmentID = sl.ShipmentID
INNER JOIN 
	logis_parcel p 
ON 
	sl.ParcelID = p.ParcelID
LEFT JOIN
    logis_shipment_status ss ON p.Status = ss.StatusID`;
    db.query(sql, (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})

app.put('/shipment-status/:shipmentId', (req, res) => {
    const shipmentId = req.params.shipmentId;
    const { StatusID } = req.body;

    // ใช้ SQL สำหรับอัปเดตสถานะของพัสดุทั้งหมดใน shipment
    const sql = `UPDATE logis_parcel 
                 SET Status = ? 
                 WHERE ParcelID IN (SELECT ParcelID FROM logis_shipment_list WHERE ShipmentID = ?)`;

    db.query(sql, [StatusID, shipmentId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({ message: "Parcel status updated successfully", data });
    });
});

app.get('/shipment-route-index/:shipmentId/:sequence?', (req, res) => {
    const shipmentId = req.params.shipmentId;
    const sequence = req.params.sequence;
    
    let sql = `
        SELECT 
            ShipmentID ,
            Sequence ,
            OriginHubID,
            Departure_time,
            Estimated_time,
            Arrival_time,
            bo.BranchName AS OriginHubName,
            bo.Latitude AS OriginLatitude,
            bo.Longitude AS OriginLongitude,
            DestinationHubID,
            bd.BranchName AS DestinationHubName,
            bd.Latitude AS DesLatitude,
            bd.Longitude AS DesLongitude
        FROM 
            logis_shipment_route sr
        INNER JOIN logis_branch bo ON
            sr.OriginHubID = bo.BranchCode
        INNER JOIN logis_branch bd ON
            sr.DestinationHubID= bd.BranchCode
        WHERE ShipmentID = ?`;
    
    const params = [shipmentId];
    
    if (sequence) {
        sql += ` AND Sequence = ?`;
        params.push(sequence);
    }
    
    db.query(sql, params, (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    });
});

app.get('/all-branch', (req, res) => {
    const sql = `SELECT
        BranchCode, 
        BranchName, 
        Tel,
        Latitude, 
        Longitude
    FROM logis_branch`;
    db.query(sql, (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})

app.get('/parcel-status-list/:parcelId', (req, res) => {
    const parcelId = req.params.parcelId;
    const sql = `SELECT 
        sl.ParcelID,
        sl.Sequence,
        sl.DateTime,
        ss.AltName,
        b.BranchName
    FROM logis_parcel_status_history sl
    LEFT JOIN 
    logis_shipment_status ss ON sl.StatusID = ss.StatusID
    LEFT JOIN
    logis_branch b ON sl.BranchID = b.BranchCode
    WHERE sl.ParcelID = ?`;
    db.query(sql, [parcelId], (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})

app.listen(8081, () => {
    console.log("listening");
})