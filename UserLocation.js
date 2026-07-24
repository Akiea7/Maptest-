// =========================================================
// 📍 ملف UserLocation.js - خاص بتحديد موقع الزبون وتتبعه المباشر
// =========================================================

let userCurrentMarker = null;
let isTrackingMap = true; // حالة قفل الخريطة والمؤشر على النقطة الزرقاء
let watchId = null;

function initUserLocation(map) {
    // 1. من يسحب المستخدم الخريطة، نفك القفل حتى يصير المؤشر المركزي "حر"
    map.on('dragstart', () => {
        isTrackingMap = false;
    });

    if ("geolocation" in navigator) {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const userLocation = [position.coords.longitude, position.coords.latitude];

                if (!userCurrentMarker) {
                    
                    // 2. تصميم النقطة بحجم صفر حتى يكون التوسيط دقيق 100% بدون إزاحة
                    const userMarkerElement = document.createElement('div');
                    Object.assign(userMarkerElement.style, {
                        position: 'relative', width: '0px', height: '0px'
                    });

                    // الموجة الداخلية
                    const wave1 = document.createElement('div');
                    Object.assign(wave1.style, {
                        position: 'absolute', top: '0', left: '0',
                        transform: 'translate(-50%, -50%)',
                        width: '50px', height: '50px',
                        backgroundColor: 'rgba(66, 133, 244, 0.2)',
                        border: '1px solid rgba(66, 133, 244, 0.4)',
                        borderRadius: '50%',
                        animation: 'radar-pulse 2.5s infinite linear',
                        pointerEvents: 'none' // حتى لا تمنع سحب الخريطة
                    });

                    // الموجة الخارجية
                    const wave2 = document.createElement('div');
                    Object.assign(wave2.style, {
                        position: 'absolute', top: '0', left: '0',
                        transform: 'translate(-50%, -50%)',
                        width: '80px', height: '80px',
                        backgroundColor: 'rgba(66, 133, 244, 0.1)',
                        border: '1px solid rgba(66, 133, 244, 0.2)',
                        borderRadius: '50%',
                        animation: 'radar-pulse 2.5s infinite linear 1s',
                        pointerEvents: 'none'
                    });

                    // النقطة الزرقاء المركزية
                    const coreDot = document.createElement('div');
                    Object.assign(coreDot.style, {
                        position: 'absolute', top: '0', left: '0',
                        transform: 'translate(-50%, -50%)',
                        width: '20px', height: '20px',
                        backgroundColor: '#4285F4',
                        borderRadius: '50%',
                        border: '3px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: '10'
                    });

                    userMarkerElement.appendChild(wave2);
                    userMarkerElement.appendChild(wave1);
                    userMarkerElement.appendChild(coreDot);

                    if (!document.getElementById('radar-style')) {
                        const style = document.createElement('style');
                        style.id = 'radar-style';
                        style.textContent = `
                            @keyframes radar-pulse {
                                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                                50% { opacity: 1; }
                                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    // إضافة النقطة للخريطة
                    userCurrentMarker = new maplibregl.Marker({ element: userMarkerElement })
                        .setLngLat(userLocation)
                        .addTo(map);

                } else {
                    // تحديث مكان النقطة باستمرار
                    userCurrentMarker.setLngLat(userLocation);
                }

                // 3. إذا القفل شغال (isTrackingMap)، خلي الخريطة والمؤشر يلحقون النقطة
                if (isTrackingMap) {
                    map.flyTo({ center: userLocation, speed: 1.2, zoom: 16 });
                }
            },
            (error) => {
                console.error("خطأ في تحديد الموقع: ", error.message);
            },
            {
                enableHighAccuracy: true, 
                timeout: 10000,           
                maximumAge: 0             
            }
        );
    } else {
        alert("عذراً، متصفحك لا يدعم تحديد الموقع.");
    }
}

// 4. دالة مخصصة لزر "موقعي الحالي" ترجع تقفل المؤشر على النقطة
function goToMyLocation(map) {
    isTrackingMap = true; // تفعيل القفل من جديد
    if (userCurrentMarker) {
        map.flyTo({ center: userCurrentMarker.getLngLat(), zoom: 16, speed: 1.5 });
    } else {
        initUserLocation(map);
    }
}
