import React, { useState, useEffect } from 'react'

function Parcel() {
    const [statuses, setStatuses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      fetch('http://127.0.0.1:8081/ep')
        .then(res => {
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.json();
        })
        .then(data => {
          // Ensure data is an array
          const statusArray = Array.isArray(data) ? data : 
                              (data.data && Array.isArray(data.data)) ? data.data : 
                              (typeof data === 'object' ? [data] : []);
          
          setStatuses(statusArray);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching shipping statuses:', err);
          setError(err.message);
          setIsLoading(false);
        });
    }, []);
  
    if (isLoading) {
      return (
        <div className="p-4 text-center text-gray-600">
          กำลังโหลดสถานะการจัดส่ง...
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="p-4 text-center text-red-500">
          เกิดข้อผิดพลาด: {error}
        </div>
      );
    }
  
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">สถานะการจัดส่ง</h1>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead className="bg-blue-100">
              <tr>
                {Object.keys(statuses[0] || {}).map((key) => (
                  <th 
                    key={key} 
                    className="border p-2 text-left bg-blue-200 text-blue-800"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statuses.length === 0 ? (
                <tr>
                  <td 
                    colSpan={Object.keys(statuses[0] || {}).length} 
                    className="text-center p-4 text-gray-500"
                  >
                    ไม่พบข้อมูลสถานะการจัดส่ง
                  </td>
                </tr>
              ) : (
                statuses.map((status, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-100 border-b"
                  >
                    {Object.values(status).map((value, cellIndex) => (
                      <td 
                        key={cellIndex} 
                        className="border p-2"
                      >
                        {value !== null ? String(value) : 'N/A'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
export default Parcel;