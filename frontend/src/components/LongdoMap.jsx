import React, { useEffect, useState } from 'react';

const LongdoMap = () => {
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.longdo) {
            const map = window.longdo.Map.map("map", { 
                zoom: 5,
                location: { lon: 100.538316, lat: 13.764953 }
            });
            setMapInstance(map);
        }
    }, []);

    return (
        <div id="map" style={{ width: '100%', height: '300px' }}></div>
    );
};

export default LongdoMap; 