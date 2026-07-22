import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@maplibre/maplibre-react-native'; // أو حسب المكتبة المستخدمة في بيئتك

// إعداد ستايل الخريطة اللي سويناه (تأكد من مسار الملف أو الرابط)
const ALAK_MAP_STYLE = 'https://your-domain.com/alak-style.json'; 

export default function AlekTrackingScreen() {
  // 1. إحداثيات افتراضية للكابتن والمسار (كمثال لتجربة الإبداع)
  const [captainLocation, setCaptainLocation] = useState([44.3615, 33.3152]); // بغداد كمثال
  const [captainBearing, setCaptainBearing] = useState(45); // اتجاه مقدمة السيارة

  // GeoJSON يمثل مسار الرحلة من نقطة الانطلاق للوصول
  const routeGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [44.3615, 33.3152],
            [44.3650, 33.3180],
            [44.3700, 33.3220],
          ],
        },
      },
    ],
  };

  // GeoJSON يمثل موقع الكابتن الحالي
  const captainGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          bearing: captainBearing, // نمرر الاتجاه للتحكم بدوران الأيقونة
        },
        geometry: {
          type: 'Point',
          coordinates: captainLocation,
        },
      },
    ],
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView 
        style={styles.map} 
        styleURL={ALAK_MAP_STYLE}
        logoEnabled={false}
        compassEnabled={true}
      >
        
        {/* ========================================== */}
        {/* 1. الكاميرا الذكية (3D Pitch & Tracking)   */}
        {/* ========================================== */}
        <MapboxGL.Camera
          zoomLevel={16.5}
          pitch={45} // إمالة الكاميرا لتعطي منظور القيادة الثلاثي الأبعاد
          heading={captainBearing} // تدوير الخريطة لتتطابق مع وجهة الكابتن
          centerCoordinate={captainLocation}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* ========================================== */}
        {/* 2. رسم مسار الرحلة الاحترافي (Route Line)  */}
        {/* ========================================== */}
        <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
          {/* الطبقة السفلية (الظل/الحدود الداكنة للمسار) */}
          <MapboxGL.LineLayer
            id="routeCasing"
            style={{
              lineColor: '#1e3a5f', // كحلي غامق يبرز المسار
              lineWidth: 8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* الطبقة العلوية (قلب المسار بلون التطبيق) */}
          <MapboxGL.LineLayer
            id="routeCore"
            style={{
              lineColor: '#0088FF', // أزرق سماوي فاقع يتناسب مع الخريطة الثلجية
              lineWidth: 4,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ========================================== */}
        {/* 3. حركة سيارة الكابتن (Vehicle Animation)  */}
        {/* ========================================== */}
        <MapboxGL.ShapeSource id="captainSource" shape={captainGeoJSON}>
          <MapboxGL.SymbolLayer
            id="captainIcon"
            style={{
              // تأكد من إضافة صورة السيارة (car-icon) في مجلد assets أو من الـ sprite
              iconImage: 'car-top-view-icon', 
              iconSize: 0.15,
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconPitchAlignment: 'map', // يخلي السيارة ملتصقة بالشارع مع ميلان الكاميرا
              iconRotationAlignment: 'map',
              iconRotate: ['get', 'bearing'], // يقرأ زاوية الدوران من الـ GeoJSON مباشرة!
            }}
          />
        </MapboxGL.ShapeSource>

      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

