// =========================================================
// 📍 UserLocation.js - النسخة النهائية مع التتبع
// =========================================================

let userLocationMarker = null;
let watchId = null;
let lastValidLocation = null;

function initUserLocation(map) {
    console.log(" بدء initUserLocation...");
    
    if (!("geolocation" in navigator)) {
        console.error("❌ المتصفح لا يدعم GPS");
        return;
    }

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log(" تم إيقاف watch سابق");
    }

    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
        console.log("🗑️ تم إزالة marker سابق");
    }

    // ✅ الحصول على الموقع
    console.log("📡 جاري طلب GPS...");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;
            
            console.log("✅ تم الحصول على الموقع!");
            console.log("   Longitude:", lng);
            console.log("   Latitude:", lat);
            console.log("   Accuracy:", accuracy, "متر");
            
            const userLoc = [lng, lat];
            lastValidLocation = userLoc;
            
            // ✅ إنشاء النقطة الزرقاء
            createBlueDot(userLoc, accuracy, map);
            
            // ⚠️ تحذير: لا نحرك الخريطة هنا!
            console.log("✅ تم إنشاء النقطة الزرقاء - الخريطة لم تتحرك");
        },
        (error) => {
            console.error("❌ خطأ GPS:", error.message);
            console.error("   Code:", error.code);
            
            let msg = "";
            if (error.code === 1) msg = "يرجى السماح بالوصول للموقع";
            if (error.code === 2) msg = "الموقع غير متاح";
            if (error.code === 3) msg = "انتهت المهلة";
            alert("خطأ في GPS: " + msg);
        },
        { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 0 
        }
    );

    // ✅ المراقبة المستمرة
    console.log("👁️ بدء watchPosition...");
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;
            
            console.log("📍 تحديث GPS:", lng.toFixed(6), lat.toFixed(6));
            
            if (accuracy > 100) {
                console.log("   ⚠️ تجاهل - دقة منخفضة:", accuracy);
                return;
            }
            
            const newLoc = [lng, lat];
            lastValidLocation = newLoc;
            
            if (userLocationMarker) {
                userLocationMarker.setLngLat(newLoc);
                console.log("   ✅ تم تحديث موقع النقطة الزرقاء");
                
                // تحديث دائرة الدقة
                const circle = userLocationMarker.getElement().querySelector('.accuracy-circle');
                if (circle) {
                    const size = Math.min(accuracy * 2, 150);
                    circle.style.width = size + 'px';
                    circle.style.height = size + 'px';
                }
            } else {
                console.log("   ⚠️ marker غير موجود!");
            }
            
        },
        (error) => {
            console.error("❌ خطأ في watchPosition:", error);
        },
        { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        }
    );
    
    console.log("✅ initUserLocation اكتمل");
}

function createBlueDot(location, accuracy, map) {
    console.log("🎨 إنشاء النقطة الزرقاء في:", location);
    
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.width = '0px';
    el.style.height = '0px';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';

    // دائرة الدقة
    const circle = document.createElement('div');
    circle.className = 'accuracy-circle';
    const size = Math.min(accuracy * 2, 150);
    circle.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: ${size}px; height: ${size}px;
        background: rgba(66, 133, 244, 0.15);
        border: 1px solid rgba(66, 133, 244, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: all 0.5s ease;
    `;

    // النقطة الزرقاء
    const dot = document.createElement('div');
    dot.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: 16px; height: 16px;
        background: #4285F4;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transform: translate(-50%, -50%);
        z-index: 10;
    `;

    el.appendChild(circle);
    el.appendChild(dot);

    // إضافة CSS
    if (!document.getElementById('gps-style')) {
        const style = document.createElement('style');
        style.id = 'gps-style';
        style.textContent = `
            @keyframes gps-pulse {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // إنشاء Marker
    userLocationMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .addTo(map);
    
    console.log("✅ تم إنشاء marker بنجاح");
    console.log("   Center الخريطة الحالي:", map.getCenter());
}

function goToMyLocation(map) {
    console.log("🔘 ضغط على زر موقعي");
    
    if (lastValidLocation) {
        console.log("️ تحريك الخريطة إلى:", lastValidLocation);
        map.flyTo({
            center: lastValidLocation,
            zoom: 16.5,
            speed: 1.2,
            duration: 1000
        });
    } else {
        console.log(" لا يوجد موقع، جاري التحديد...");
        initUserLocation(map);
    }
}

// تنظيف
window.addEventListener('beforeunload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log("🧹 تم إيقاف GPS tracking");
    }
});
