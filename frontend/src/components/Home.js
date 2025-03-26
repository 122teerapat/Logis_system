import React, { useEffect, useState } from 'react'
import axios from 'axios'

function Home() {
    const [data, setData] = useState([])
    useEffect(()=>{
        axios.get('http://127.0.0.1:8081/ss')
        .then(res => setData(res.data))
        .catch(err => console.log(err));
    }, [])
      
    return (
        <div>
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>StatusID</th>
                            <th>StatusName</th>
                            <th>Detail</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <body>
                        {data.map((status,index) =>{
                            return(<tr key={index}>
                                <td>{status.StatusID}</td>
                                <td>{status.StatusName}</td>
                                <td>{status.Detail}</td>
                                <td>
                                    <button>Edit</button>
                                </td>
                            </tr>
                            );
                        })}
                    </body>
                </table>
            </div>
        </div>
    )
}

export default Home