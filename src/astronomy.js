// src/astronomy.js

// Standard astronomical constants mapped to Minecraft time
const DAYS_PER_YEAR = 365.25;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Orbital Elements (Simplified Keplerian parameters for demonstration)
// a: Semi-major axis (AU)
// e: Eccentricity
// i: Inclination (degrees)
// L: Mean longitude at epoch (degrees)
// w: Longitude of perihelion (degrees)
// node: Longitude of ascending node (degrees)
// period: Orbital period in Earth days
const ORBITAL_DATA = {
    sun:     { a: 0.0, e: 0.0, i: 0.0, L: 0.0, w: 0.0, node: 0.0, period: 1 }, // Heliocentric center
    earth:   { a: 1.0, e: 0.0167, i: 0.0, L: 100.46, w: 102.94, node: 0.0, period: 365.25 },
    moon:    { a: 0.00257, e: 0.0549, i: 5.14, L: 0.0, w: 0.0, node: 0.0, period: 27.32 }, // Earth-relative
    mercury: { a: 0.387, e: 0.2056, i: 7.00, L: 252.25, w: 77.45, node: 48.33, period: 87.97 },
    venus:   { a: 0.723, e: 0.0068, i: 3.39, L: 181.98, w: 131.53, node: 76.68, period: 224.70 },
    mars:    { a: 1.524, e: 0.0934, i: 1.85, L: 355.45, w: 336.04, node: 49.57, period: 686.98 }
};

export class AstronomyEngine {
    constructor() {
        this.axialTilt = 23.44; // Earth's axial tilt in degrees
    }

    /**
     * Calculates the heliocentric coordinates (x, y, z) for a body.
     */
    getHeliocentricCoords(bodyId, daysPassed) {
        if (bodyId === 'sun') return { x: 0, y: 0, z: 0 };

        const data = ORBITAL_DATA[bodyId];
        if (!data) return { x: 0, y: 0, z: 0 };

        // Mean Anomaly
        const n = 360 / data.period; 
        let M = data.L - data.w + (n * daysPassed);
        M = M * DEG_TO_RAD;

        // Equation of Center (Simplified approximation for true anomaly)
        const v = M + (2 * data.e * Math.sin(M)); 
        
        // Heliocentric Distance
        const r = data.a * (1 - data.e * data.e) / (1 + data.e * Math.cos(v));

        // Heliocentric Ecliptic Coordinates
        const x = r * Math.cos(v + data.w * DEG_TO_RAD);
        const y = r * Math.sin(v + data.w * DEG_TO_RAD);
        const z = r * Math.sin(data.i * DEG_TO_RAD) * Math.sin(v + data.w * DEG_TO_RAD - data.node * DEG_TO_RAD);

        return { x, y, z };
    }

    /**
     * Calculates Earth-relative Right Ascension and Declination 
     * Output maps directly to the Bedrock bone hierarchy:
     * Right Ascension = pivot_bone (Y-axis rotation)
     * Declination = declination_bone (X-axis rotation)
     */
    getApparentGeocentricAngles(bodyId, daysPassed, timeOfDay) {
        let geoX, geoY, geoZ;

        const earthCoords = this.getHeliocentricCoords('earth', daysPassed);

        if (bodyId === 'moon') {
            // Moon is calculated relative to Earth directly
            const moonData = ORBITAL_DATA.moon;
            const n = 360 / moonData.period;
            const M = (moonData.L + (n * daysPassed)) * DEG_TO_RAD;
            
            geoX = moonData.a * Math.cos(M);
            geoY = moonData.a * Math.sin(M);
            geoZ = moonData.a * Math.sin(moonData.i * DEG_TO_RAD) * Math.sin(M - moonData.node * DEG_TO_RAD);
        } else if (bodyId === 'sun') {
            // Sun from Earth is the inverse of Earth from Sun
            geoX = -earthCoords.x;
            geoY = -earthCoords.y;
            geoZ = -earthCoords.z;
        } else {
            // Planet from Earth
            const planetCoords = this.getHeliocentricCoords(bodyId, daysPassed);
            geoX = planetCoords.x - earthCoords.x;
            geoY = planetCoords.y - earthCoords.y;
            geoZ = planetCoords.z - earthCoords.z;
        }

        // Convert Geocentric Ecliptic to Ecliptic Longitude and Latitude
        let eclipticLon = Math.atan2(geoY, geoX) * RAD_TO_DEG;
        let eclipticLat = Math.atan2(geoZ, Math.sqrt(geoX*geoX + geoY*geoY)) * RAD_TO_DEG;

        // Apply Earth's Axial Tilt to get Equatorial Coordinates (RA / Dec)
        const lonRad = eclipticLon * DEG_TO_RAD;
        const latRad = eclipticLat * DEG_TO_RAD;
        const tiltRad = this.axialTilt * DEG_TO_RAD;

        const sinDec = Math.sin(latRad) * Math.cos(tiltRad) + Math.cos(latRad) * Math.sin(tiltRad) * Math.sin(lonRad);
        const declination = Math.asin(sinDec) * RAD_TO_DEG;

        const y = Math.sin(lonRad) * Math.cos(tiltRad) - Math.tan(latRad) * Math.sin(tiltRad);
        const x = Math.cos(lonRad);
        let rightAscension = Math.atan2(y, x) * RAD_TO_DEG;

        // Factor in diurnal rotation (Time of day)
        // 1 full day = 360 degrees. Shift so noon puts the Sun at Zenith.
        const diurnalShift = (timeOfDay * 360) + 180;
        let hourAngle = rightAscension - diurnalShift;

        return {
            pivotY: hourAngle,      // Maps to bone_body_pivot [0, Y, 0]
            declinationX: declination // Maps to bone_body_declination [X, 0, 0]
        };
    }
}