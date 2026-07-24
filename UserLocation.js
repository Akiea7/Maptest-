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

                // 2. تصميم النقطة الزرقاء (ماركر الزبون)
                const userMarkerElement = document.createElement('div');
                Object.assign(userMarkerElement.style, {
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#4285F4',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 0 15px rgba(66, 133, 244, 0.6)',
                    position: 'relative'
                });

                // تأثير النبض للنقطة
                const pulse = document.createElement('div');
                Object.assign(pulse.style, {
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(66, 133, 244, 0.4)',
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    animation: 'pulse-animation 2s infinite'
                });
                userMarkerElement.appendChild(pulse);

                // 3. إضافة الماركر للخريطة
                new maplibregl.Marker({ element: userMarkerElement })
                    .setLngLat(userLocation)
                    .addTo(map);
                    
                console.log("📍 تم العثور على الموقع:", userLocation);
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

