/**
 * Tactical Geolocation and Coordinate Stamp Utilities for ApexPTT
 */

import { LocationStamp } from '../types';

export interface TacticalPreset {
  id: string;
  name: string;
  gridRef: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const TACTICAL_WAYPOINT_PRESETS: TacticalPreset[] = [
  {
    id: 'lz-bravo',
    name: 'Extraction LZ Bravo',
    gridRef: '10S EJ 8452 0488',
    latitude: 37.7812,
    longitude: -122.4110,
    description: 'Helicopter Landing Zone & Primary Extraction Point',
  },
  {
    id: 'fop-alpha',
    name: 'Forward Observation Post Alpha',
    gridRef: '10S EJ 8380 0390',
    latitude: 37.7725,
    longitude: -122.4285,
    description: 'Elevated High-Ground Reconnaissance Post',
  },
  {
    id: 'cp-main',
    name: 'Tactical Command Post (TOC)',
    gridRef: '10S EJ 8495 0520',
    latitude: 37.7850,
    longitude: -122.4060,
    description: 'Operations Center & Field Dispatch Base',
  },
  {
    id: 'chk-delta',
    name: 'Perimeter Checkpoint Delta',
    gridRef: '10S EJ 8320 0340',
    latitude: 37.7680,
    longitude: -122.4150,
    description: 'South Perimeter Access Gate & Vehicle Sentry',
  },
];

/**
 * Format decimal coordinates to clean tactical string
 */
export function formatDecimalCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

/**
 * Compute approximate Military Grid Reference System (MGRS) style string
 */
export function computeTacticalGridRef(lat: number, lng: number): string {
  // Compute UTM zone
  const zoneNumber = Math.floor((lng + 180) / 6) + 1;
  const letters = 'CDEFGHJKLMNPQRSTUVWX';
  const latIndex = Math.min(letters.length - 1, Math.max(0, Math.floor((lat + 80) / 8)));
  const zoneLetter = letters[latIndex] || 'S';

  // Compute tactical 100k square identifier approximations
  const squareLettersCol = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const squareLettersRow = 'ABCDEFGHJKLMNPQRSTUV';

  const colIdx = Math.abs(Math.floor((lng + 180) * 10)) % squareLettersCol.length;
  const rowIdx = Math.abs(Math.floor((lat + 90) * 10)) % squareLettersRow.length;

  const sq1 = squareLettersCol[colIdx];
  const sq2 = squareLettersRow[rowIdx];

  // 4-figure Easting / Northing
  const easting = Math.abs(Math.floor((lng * 10000) % 10000)).toString().padStart(4, '0');
  const northing = Math.abs(Math.floor((lat * 10000) % 10000)).toString().padStart(4, '0');

  return `${zoneNumber}${zoneLetter} ${sq1}${sq2} ${easting} ${northing}`;
}

/**
 * Obtain current browser coordinates with tactical fallback
 */
export async function getCurrentTacticalPosition(): Promise<{
  stamp: LocationStamp;
  isSimulated: boolean;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const fallbackLat = 37.7749;
      const fallbackLng = -122.4194;
      resolve({
        stamp: {
          latitude: fallbackLat,
          longitude: fallbackLng,
          accuracy: 12,
          gridRef: computeTacticalGridRef(fallbackLat, fallbackLng),
          label: 'Grid Base Terminal (Offline Fallback)',
        },
        isSimulated: true,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 8);
        const altitude = pos.coords.altitude ? Math.round(pos.coords.altitude) : undefined;

        resolve({
          stamp: {
            latitude: lat,
            longitude: lng,
            accuracy,
            altitude,
            gridRef: computeTacticalGridRef(lat, lng),
            label: 'Operator Current GPS Position',
          },
          isSimulated: false,
        });
      },
      (err) => {
        console.warn('Geolocation warning / permission not granted, using tactical field grid coordinates:', err);
        // Provide standard field coordinates with slight randomized offset for multi-unit simulation
        const baseLat = 37.7749 + (Math.random() - 0.5) * 0.008;
        const baseLng = -122.4194 + (Math.random() - 0.5) * 0.008;

        resolve({
          stamp: {
            latitude: Number(baseLat.toFixed(5)),
            longitude: Number(baseLng.toFixed(5)),
            accuracy: 15,
            gridRef: computeTacticalGridRef(baseLat, baseLng),
            label: 'Tactical Ground Grid (Estimated GPS)',
          },
          isSimulated: true,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 10000,
      }
    );
  });
}
