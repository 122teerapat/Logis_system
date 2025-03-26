const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const app = express();

app.use(cors())

app.use(express.json())

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "logis_db"
})

app.get("/", (req, res) => {
    return res.json("from backend")
})

app.get('/ss', (req, res) => {
    const sql = "SELECT * FROM logis_shipping_status"
    db.query(sql, (err, data) =>{
        if(err) return res.json("Error");
        return res.json(data);
    })
})

app.get('/parcel', (req, res) => {
    const sql = "SELECT * FROM logis_shipping_status"
    db.query(sql, (err, data) =>{
        if(err) return res.json("Error");
        return res.json(data);
    })
})


app.listen(8081, () => {
    console.log("listening");
})