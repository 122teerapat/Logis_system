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

const regions = {
        "north": [
            "เชียงใหม่", "เชียงราย", "ลำปาง", "ลำพูน", "แพร่", 
            "น่าน", "พะเยา", "แม่ฮ่องสอน", "อุตรดิตถ์", 
            "พิษณุโลก", "สุโขทัย", "ตาก", "กำแพงเพชร", 
            "นครสวรรค์", "พิจิตร"
        ],
        "northeast": [
            "กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", 
            "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร", 
            "ร้อยเอ็ด", "เลย", "ศรีสะเกษ", "สกลนคร", "สุรินทร์", 
            "หนองคาย", "หนองบัวลำภู", "อำนาจเจริญ", "อุดรธานี", "อุบลราชธานี", 
            "เพชรบูรณ์"
        ],
        "central": [
            "อุทัยธานี", "ชัยนาท", "สิงห์บุรี", "อ่างทอง", "พระนครศรีอยุธยา", 
            "ลพบุรี", "สระบุรี", "นครนายก", "ปราจีนบุรี", "สระแก้ว", 
            "ฉะเชิงเทรา", "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด", "กรุงเทพมหานคร", 
            "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร", "สมุทรสงคราม", 
            "นครปฐม", "สุพรรณบุรี", "กาญจนบุรี", "ราชบุรี", "เพชรบุรี", "ประจวบคีรีขันธ์"
        ],
        "south": [
            "ชุมพร", "สุราษฎร์ธานี", "นครศรีธรรมราช", "พัทลุง", "สงขลา", 
            "ปัตตานี", "ยะลา", "นราธิวาส", "กระบี่", "พังงา", 
            "ภูเก็ต", "ตรัง", "สตูล", "ระนอง"
        ]    
};

app.get("/", (req, res) => {
    return res.json("from backend")
})



app.get('/StatusList', (req, res) => {
    const sql = "SELECT * FROM logis_shipping_status"
    db.query(sql, (err, data) =>{
        if(err) return res.json("Error");
        return res.json(data);
    })
})

app.get('/parcel/region/:region', (req, res) => {
    const region = req.params.region;

    if (!regions[region]) {
        return res.status(400).json({ message: "Invalid region" });
    }

    const sql = `
    SELECT
        p.Weight,p.Width,p.Height,p.Length,
        p.ParcelID, p.Sender,p.Receiver, p.Address,
        p.Subdistrict,p.District,p.Province,p.Postal_code
    FROM
        logis_parcel p
    WHERE
        p.Province IN (?)`;
    db.query(sql, [regions[region]], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
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

app.put('/parcel/:id', (req, res) => {
    const id = req.params.id;
    const { StatusID } = req.body;
    const sql = `UPDATE logis_parcel SET Status = ? WHERE ParcelID = ?`;
    db.query(sql, [StatusID, id], (err, data) => {
        if(err) return res.json(err.message);
        return res.json(data);
    })
})


app.get('/parcel/status/:id', (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM logis_shipping_status_list WHERE ParcelID = ?`;
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
            db.query(`SELECT COALESCE(MAX(Sequence), 0) as maxSeq FROM logis_shipping_status_list WHERE ParcelID = ?`, [id], (err, result) => {
                if (err) return db.rollback(() => res.json({ error: err.message }));
                
                const newSequence = result[0].maxSeq + 1;
                
                // เพิ่มประวัติสถานะ
                db.query(`INSERT INTO logis_shipping_status_list (ParcelID, Sequence, DateTime, Detail, StatusID, BranchID, create_by)
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
                shipments[row.ShipmentID] = [row.ShipmentID, row.Departure_time, row.Estimated_arrival, 
                    row.Total_Weight, row.Total_Volume, row.OriginHubID, 
                    row.DestinationHubID, row.VehicleID, row.EmpID, user];
                
                // เริ่มต้นนับ sequence สำหรับ shipment นี้
                shipmentSequences[row.ShipmentID] = 0;
            }
            
            // สร้าง route ที่ไม่ซ้ำ
            const key = `${row.ShipmentID}-${row.DestinationHubID}`;
            if (!destMap[key]) {
                destMap[key] = true;
                const seq = Object.keys(destMap).filter(k => k.startsWith(`${row.ShipmentID}-`)).length;
                if(prevDestination === ""){
                    routes.push([row.ShipmentID, seq, row.Departure_time, 
                        row.Estimated_arrival, row.OriginHubID, row.DestinationHubID, user]);
                }else if(prevDestination !== row.DestinationHubID){
                    routes.push([row.ShipmentID, seq, row.Departure_time, 
                        row.Estimated_arrival, prevDestination, row.DestinationHubID, user]);
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
                db.query(`INSERT INTO logis_shipment(ShipmentID, Departure_time, Estimated_arrival, 
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
                            db.query(`INSERT INTO logis_shipment_route(ShipmentID, Sequence, Date_Time,
                                 Estimated_Time, OriginHubID, DestinationHubID,create_by) VALUES ?`, [routes], err => {
                                
                                if (err) return handleError(err, "เพิ่ม route ล้มเหลว");
                                
                                db.commit(err => {
                                    if (err) return handleError(err, "commit ล้มเหลว");
                                    fs.unlink(req.file.path, () => {});
                                    res.json({message: "สำเร็จ", stats: {
                                        shipments: Object.keys(shipments).length, 
                                        parcels: parcels.length, routes: routes.length}});
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
			s.ShipmentID,s.Departure_time, s.Estimated_arrival, s.Status, p.ParcelID, p.Weight,
            p.Width, p.Height, p.Length,  p.Address, p.Subdistrict,p.District, p.Province,
            p.Postal_code, p.Sender, p.Sender_Tel,sl.DestinationHubID, b.BranchName,
            p.Receiver,p.Receiver_Tel,p.Status AS ParcelStatus
        FROM logis_shipment s
        LEFT JOIN logis_shipment_list sl ON s.ShipmentID = sl.ShipmentID
        LEFT JOIN logis_parcel p ON sl.ParcelID = p.ParcelID 
        LEFT JOIN logis_branch b ON sl.DestinationHubID = b.BranchCode
        WHERE s.ShipmentID = ?
        ORDER BY DestinationHubID`;

    db.query(sql, [shipmentId], (err, data) => {
        if(err) return res.json(err.message);
        
        // จัดรูปแบบข้อมูลให้มี parcels array
        if (data.length > 0) {
            const shipment = {
                ShipmentID: data[0].ShipmentID,
                Departure_time: data[0].Departure_time,
                Estimated_arrival: data[0].Estimated_arrival,
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


// API Endpoint สำหรับเพิ่มข้อมูล Shipment และ Shipment List (แบบง่าย)
app.post('/shipment', (req, res) => {
    // รับข้อมูลเฉพาะที่จำเป็น
    const {
        departure_time,
        estimated_arrival,
        total_weight,
        parcelsID // รายการพัสดุเป็น array ของ ID
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!departure_time || !estimated_arrival || !total_weight || 
        !parcelsID || !Array.isArray(parcelsID) || parcelsID.length === 0) {
        return res.status(400).json({ 
            message: "กรุณาระบุข้อมูลให้ครบถ้วน (departure_time, estimated_arrival, total_weight, parcelsID[])"
        });
    }

    // กำหนดให้ total_volume เท่ากับจำนวนพัสดุ
    const total_volume = parcelsID.length;

    // เริ่มการทำงานแบบ Transaction
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // SQL สำหรับเพิ่มข้อมูล Shipment (รวม total_weight และ total_volume)
        const shipmentSql = `INSERT INTO Logis_Shipment (Departure_time, Estimated_arrival, Total_Weight, Total_Volume) VALUES (?, ?, ?, ?)`;
        const shipmentValues = [departure_time, estimated_arrival, total_weight, total_volume];

        // ทำการ Insert ข้อมูล Shipment
        db.query(shipmentSql, shipmentValues, (err, shipmentResult) => {
            if (err) {
                // หากเกิดข้อผิดพลาด ทำการ Rollback Transaction
                return db.rollback(() => {
                    res.status(500).json({ error: err.message });
                });
            }

            // รับ ID ของ Shipment ที่เพิ่งสร้าง
            const shipmentId = shipmentResult.insertId;

            // เตรียมคำสั่ง SQL สำหรับการ Insert ข้อมูล Shipment List
            const shipmentListSql = `INSERT INTO Logis_Shipment_List (ShipmentID, Sequence, ParcelID) VALUES ?`;

            // สร้างข้อมูลสำหรับการ Insert แบบ Bulk
            const shipmentListValues = parcelsID.map((parcelId, index) => [
                shipmentId,
                index + 1, // Sequence เริ่มจาก 1
                parcelId
            ]);

            // ทำการ Insert ข้อมูล Shipment List แบบ Bulk
            db.query(shipmentListSql, [shipmentListValues], (err, listResult) => {
                if (err) {
                    // หากเกิดข้อผิดพลาด ทำการ Rollback Transaction
                    return db.rollback(() => {
                        res.status(500).json({ error: err.message });
                    });
                }

                // Commit Transaction เมื่อทุกอย่างเสร็จสมบูรณ์
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }

                    // ส่งข้อมูลตอบกลับ
                    res.status(201).json({
                        message: "สร้าง Shipment และ Shipment List สำเร็จ",
                        shipment_id: shipmentId,
                        items_added: listResult.affectedRows,
                        total_volume: total_volume // ส่งกลับค่า total_volume ที่กำหนดอัตโนมัติ
                    });
                });
            });
        });
    });
});


app.post('/shipment/:shipmentId/parcels', (req, res) => {
    const shipmentId = req.params.shipmentId;
    const { parcelsID } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!parcelsID || !Array.isArray(parcelsID) || parcelsID.length === 0) {
        return res.status(400).json({ 
            message: "กรุณาระบุรายการ parcelsID ที่ต้องการเพิ่ม (parcelsID[])" 
        });
    }

    // ตรวจสอบว่า Shipment ID ที่ระบุมีอยู่จริง
    const checkShipmentSql = `SELECT ShipmentID FROM Logis_Shipment WHERE ShipmentID = ?`;
    
    db.query(checkShipmentSql, [shipmentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: "ไม่พบ Shipment ID ที่ระบุ" });
        }

        // หาค่า Sequence ล่าสุดของ Shipment นี้
        const getLastSequenceSql = `SELECT MAX(Sequence) as lastSequence FROM Logis_Shipment_List WHERE ShipmentID = ?`;
        
        db.query(getLastSequenceSql, [shipmentId], (err, sequenceResult) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // ค่า Sequence เริ่มต้น
            let startSequence = 1;
            
            if (sequenceResult[0].lastSequence) {
                startSequence = sequenceResult[0].lastSequence + 1;
            }

            // เริ่ม Transaction
            db.beginTransaction((err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // เตรียมคำสั่ง SQL สำหรับการ Insert ข้อมูล Shipment List
                const shipmentListSql = `INSERT INTO Logis_Shipment_List (ShipmentID, Sequence, ParcelID) VALUES ?`;

                // สร้างข้อมูลสำหรับการ Insert แบบ Bulk
                const shipmentListValues = parcelsID.map((parcelId, index) => [
                    shipmentId,
                    startSequence + index, // Sequence ต่อจากค่าล่าสุด
                    parcelId
                ]);

                // ทำการ Insert ข้อมูล Shipment List แบบ Bulk
                db.query(shipmentListSql, [shipmentListValues], (err, listResult) => {
                    if (err) {
                        // หากเกิดข้อผิดพลาด ทำการ Rollback Transaction
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }

                    // Commit Transaction เมื่อทุกอย่างเสร็จสมบูรณ์
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: err.message });
                            });
                        }

                        // ส่งข้อมูลตอบกลับ
                        res.status(201).json({
                            message: "เพิ่มรายการพัสดุเข้า Shipment สำเร็จ",
                            shipment_id: shipmentId,
                            items_added: listResult.affectedRows
                        });
                    });
                });
            });
        });
    });
});

app.put('/shipment/:shipmentId/route/:sequence?', (req, res) => {
    const { shipmentId, sequence } = req.params;
    const updateData = req.body;
    
    // กรองฟิลด์ที่อนุญาตให้อัพเดต
    const allowedFields = ['Date_Time', 'Distance', 'Duration', 'Actual_Time', 'OriginHubID', 'DestinationHubID', 'Status'];
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
        ls.ShipmentID, ls.Departure_time, ls.Estimated_arrival,ls.Total_Weight,
        ls.OriginHubID,ls.DestinationHubID,ls.VehicleID,ls.EmpID,sl.ShipmentID,
        sl.Sequence,sl.ParcelID, p.ParcelID, p.Width,p.Height,
        p.Weight, p.Length,p.Address, p.Subdistrict, p.District,
        p.Province,p.Postal_code, p.Status,ss.StatusName
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
    logis_shipping_status ss ON p.Status = ss.StatusID`;
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
    FROM logis_shipping_status_list sl
    LEFT JOIN 
    logis_shipping_status ss ON sl.StatusID = ss.StatusID
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