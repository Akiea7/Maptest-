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

                const userMarkerElement = document.createElement('div');
userMarkerElement.style.position = 'relative';

// الموجة الأولى (الرادار الداخلي)
const wave1 = document.createElement('div');
Object.assign(wave1.style, {
    position: 'absolute', top: '-15px', left: '-15px',
    width: '50px', height: '50px',
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    border: '1px solid rgba(66, 133, 244, 0.4)',
    borderRadius: '50%',
    animation: 'radar-pulse 2.5s infinite linear'
});

// الموجة الثانية (الرادار الخارجي)
const wave2 = document.createElement('div');
Object.assign(wave2.style, {
    position: 'absolute', top: '-30px', left: '-30px',
    width: '80px', height: '80px',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    border: '1px solid rgba(66, 133, 244, 0.2)',
    borderRadius: '50%',
    animation: 'radar-pulse 2.5s infinite linear 1s' // تأخير ثانية حتى تبين موجات متتالية
});

// النقطة المركزية (البيضاء والزرقاء)
const coreDot = document.createElement('div');
Object.assign(coreDot.style, {
    position: 'absolute', top: '0', left: '0',
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

// إضافة ستايل الأنيميشن إذا ما موجود
if (!document.getElementById('radar-style')) {
    const style = document.createElement('style');
    style.id = 'radar-style';
    style.textContent = `
        @keyframes radar-pulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

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

