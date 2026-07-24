// =========================================================
// 📍 ملف UserLocation.js - خاص بتحديد موقع الزبون (GPS)
// =========================================================

function initUserLocation(map) {
    if ("geolocation" in navigator) {
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLng = position.coords.longitude;
                const userLat = position.coords.latitude;
                const userLocation = [userLng, userLat];

                // 1. تحريك الكاميرا لمكان الزبون بنعومة
                map.flyTo({
                    center: userLocation,
                    zoom: 16,
                    speed: 1.5, 
                    curve: 1.4, 
                    essential: true
                });

                // 2. تصميم ماركر الرادار المركزي
                const userMarkerElement = document.createElement('div');
                Object.assign(userMarkerElement.style, {
                    position: 'relative',
                    width: '20px',
                    height: '20px'
                });

                // الموجة الأولى (الرادار الداخلي - تتوسط العنصر تماماً)
                const wave1 = document.createElement('div');
                Object.assign(wave1.style, {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'rgba(66, 133, 244, 0.2)',
                    border: '1px solid rgba(66, 133, 244, 0.4)',
                    borderRadius: '50%',
                    animation: 'radar-pulse 2.5s infinite linear',
                    pointerEvents: 'none'
                });

                // الموجة الثانية (الرادار الخارجي - تتوسط العنصر تماماً)
                const wave2 = document.createElement('div');
                Object.assign(wave2.style, {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    border: '1px solid rgba(66, 133, 244, 0.2)',
                    borderRadius: '50%',
                    animation: 'radar-pulse 2.5s infinite linear 1s',
                    pointerEvents: 'none'
                });

                // النقطة المركزية (البيضاء والزرقاء - في المنتصف الفعلي للإحداثي)
                const coreDot = document.createElement('div');
                Object.assign(coreDot.style, {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#4285F4',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    zIndex: '10'
                });

                userMarkerElement.appendChild(wave2);
                userMarkerElement.appendChild(wave1);
                userMarkerElement.appendChild(coreDot);

                // إضافة ستايل الأنيميشن إذا ما موجود
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

                // 3. إضافة الماركر مع تحديد anchor على 'center' لضمان الثبات التام على الإحداثي
                new maplibregl.Marker({ element: userMarkerElement, anchor: 'center' })
                    .setLngLat(userLocation)
                    .addTo(map);

            },
            (error) => {
                console.error("خطأ في تحديد الموقع: ", error.message);
                alert("يرجى تفعيل الـ GPS والسماح بصلاحية الموقع حتى نقدر نحدد مكانك.");
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
