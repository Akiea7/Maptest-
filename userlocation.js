// =========================================================
// 📍 ملف UserLocation.js - نظام GPS الاحترافي (Alek App)
// =========================================================

let userLocationMarker = null;
let gpsWatchId = null;
let isTracking = false;
let followMode = false;
let totalDistance = 0;
let lastPosition = null;
let geofenceTriggered = false;

// 🎯 نقطة الهدف (Geofence) - تقدر تخليها متغيرة بعدين
const GEOFENCE_TARGET = [44.3835000, 33.6692000]; // موقع الزبون كمثال
const GEOFENCE_RADIUS = 50; // متر

// دوال مساعدة لحساب المسافة
function haversineDist(a, b) {
    const R = 6371000;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function initGPS(mapInstance) {
    const gpsBtn = document.getElementById('gps-btn');
    const gpsIndicator = document.getElementById('gps-indicator');
    const infoPanel = document.getElementById('info-panel');
    const geofenceAlert = document.getElementById('geofence-alert');
    const gpsStatusText = document.getElementById('gps-status');

    // إيقاف التتبع التلقائي إذا المستخدم سحب الخريطة
    mapInstance.on('dragstart', () => {
        followMode = false;
        if (gpsStatusText && isTracking) {
            gpsStatusText.textContent = 'التتبع التلقائي معطّل';
        }
    });

    // 🎯 زر المتابعة التلقائية (اضغط مرتين)
    if (gpsBtn) {
        gpsBtn.addEventListener('dblclick', () => {
            if (!isTracking) return;
            followMode = !followMode;
            if (gpsStatusText) {
                gpsStatusText.textContent = followMode ? 'التتبع التلقائي مفعّل' : 'التتبع التلقائي معطّل';
            }
        });

        // زر GPS - Toggle
        gpsBtn.addEventListener('click', () => {
            if (isTracking) {
                stopGPS();
            } else {
                startGPS();
            }
        });
    }

    function startGPS() {
        if (!navigator.geolocation) {
            alert("متصفحك لا يدعم GPS");
            return;
        }

        gpsBtn.classList.add('active');
        if (gpsIndicator) gpsIndicator.classList.add('show');
        if (infoPanel) infoPanel.classList.add('show');
        if (gpsStatusText) gpsStatusText.textContent = 'جاري البحث عن الموقع...';

        gpsWatchId = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            handlePositionError,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );

        isTracking = true;
    }

    function stopGPS() {
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
        
        gpsBtn.classList.remove('active');
        if (gpsIndicator) gpsIndicator.classList.remove('show');
        if (infoPanel) infoPanel.classList.remove('show');
        if (gpsStatusText) gpsStatusText.textContent = 'تم إيقاف التتبع';
        
        isTracking = false;
        followMode = false;
    }

    function handlePositionUpdate(position) {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const currentPos = [longitude, latitude];

        if (gpsStatusText && isTracking && followMode) {
             gpsStatusText.textContent = 'التتبع مفعّل';
        }

        // 📊 تحديث لوحة المعلومات
        const accuracyEl = document.getElementById('accuracy-value');
        const speedEl = document.getElementById('speed-value');
        const headingEl = document.getElementById('heading-value');
        const distanceEl = document.getElementById('distance-value');

        if (accuracyEl) accuracyEl.textContent = `±${Math.round(accuracy)} م`;
        if (speedEl) speedEl.textContent = speed ? `${(speed * 3.6).toFixed(1)} كم/س` : '0 كم/س';
        if (headingEl) headingEl.textContent = heading !== null ? `${Math.round(heading)}°` : '--°';

        // 📏 حساب المسافة
        if (lastPosition) {
            const segmentDist = haversineDist(lastPosition, currentPos);
            if (segmentDist < 100) totalDistance += segmentDist; // فلترة القفزات
        }
        if (distanceEl) {
             distanceEl.textContent = totalDistance > 1000 ? `${(totalDistance/1000).toFixed(2)} كم` : `${Math.round(totalDistance)} م`;
        }
        lastPosition = currentPos;

        // 🔵 إنشاء أو تحديث النقطة
        if (!userLocationMarker) {
            const container = document.createElement('div');
            container.style.position = 'relative';
            
            // الدائرة الشفافة للدقة
            const accCircle = document.createElement('div');
            accCircle.id = 'gps-accuracy-circle';
            Object.assign(accCircle.style, {
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                borderRadius: '50%', background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)', pointerEvents: 'none',
                transition: 'width 0.5s, height 0.5s'
            });

            // النقطة الزرقاء الصغيرة
            const dotEl = document.createElement('div');
            Object.assign(dotEl.style, {
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '16px', height: '16px', background: '#4285f4',
                border: '3px solid white', borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(66, 133, 244, 0.5)', zIndex: '10'
            });

            container.appendChild(accCircle);
            container.appendChild(dotEl);

            userLocationMarker = new maplibregl.Marker({
                element: container,
                pitchAlignment: 'viewport', 
                rotationAlignment: 'map',
                anchor: 'center'
            })
            .setLngLat(currentPos)
            .addTo(mapInstance);

            mapInstance.flyTo({ center: currentPos, zoom: 17, speed: 1.5, essential: true });
            followMode = true;
        } else {
            userLocationMarker.setLngLat(currentPos);
            if (heading !== null && !isNaN(heading)) {
                userLocationMarker.setRotation(heading);
            }
        }

        // تحديث حجم دائرة الدقة
        const accCircle = document.getElementById('gps-accuracy-circle');
        if (accCircle) {
            const pixelsPerMeter = 2; // تقريبي للتجربة
            const circleSize = Math.max(40, accuracy * pixelsPerMeter);
            accCircle.style.width = `${circleSize}px`;
            accCircle.style.height = `${circleSize}px`;
        }

        // 🎯 Geofencing
        const distanceToTarget = haversineDist(currentPos, GEOFENCE_TARGET);
        if (distanceToTarget < GEOFENCE_RADIUS && !geofenceTriggered) {
            geofenceTriggered = true;
            if (geofenceAlert) {
                geofenceAlert.classList.add('show');
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                setTimeout(() => geofenceAlert.classList.remove('show'), 4000);
            }
        }

        // 🔄 Follow Mode
        if (followMode) {
            mapInstance.easeTo({ center: currentPos, duration: 1000, easing: t => t });
        }
    }

    function handlePositionError(error) {
        console.error("GPS Error:", error);
        let msg = "فشل تحديد الموقع";
        if (error.code === 1) msg = "يرجى السماح بالوصول للموقع";
        else if (error.code === 2) msg = "GPS غير متاح";
        else if (error.code === 3) msg = "انتهت المهلة";
        if (gpsStatusText) gpsStatusText.textContent = msg;
    }

    window.addEventListener('beforeunload', stopGPS);
}
