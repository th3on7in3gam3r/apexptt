import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Crosshair,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Minus,
  Radio,
} from 'lucide-react';
import { LocationStamp } from '../types';
import { formatDecimalCoordinates } from '../utils/geoUtils';

interface Props {
  location: LocationStamp;
  callsign: string;
  timestamp: number;
  isMe?: boolean;
}

export const TacticalMapPreview: React.FC<Props> = ({
  location,
  callsign,
  timestamp,
  isMe,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCoords = formatDecimalCoordinates(location.latitude, location.longitude);
  const gridReference = location.gridRef || 'TACTICAL GPS STAMP';

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { latitude, longitude } = location;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
    });

    // Dark Matter Tactical Tiles
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    });

    tileLayer.addTo(map);

    // Fallback to OSM if Carto fails
    tileLayer.on('tileerror', () => {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
    });

    // Custom Tactical Radar Blip Marker
    const radarIcon = L.divIcon({
      className: 'tactical-radar-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.6); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 14px; height: 14px; border-radius: 9999px; background: rgba(16, 185, 129, 0.5); border: 2px solid #10b981;"></div>
          <div style="width: 6px; height: 6px; border-radius: 9999px; background: #ffffff; box-shadow: 0 0 6px #10b981;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Add Marker
    const marker = L.marker([latitude, longitude], { icon: radarIcon }).addTo(map);
    markerRef.current = marker;

    // Add optional accuracy circle
    if (location.accuracy && location.accuracy > 0) {
      L.circle([latitude, longitude], {
        radius: location.accuracy,
        color: '#10b981',
        weight: 1,
        dashArray: '4, 4',
        fillColor: '#10b981',
        fillOpacity: 0.12,
      }).addTo(map);
    }

    // Popup
    marker.bindPopup(`
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #10b981; background: #0c1a11; padding: 4px 6px; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 4px;">
        <strong>[${callsign}]</strong><br/>
        <span>${formattedCoords}</span>
      </div>
    `);

    mapInstanceRef.current = map;

    // Invalidate size to guarantee crisp render inside flex/grid layouts
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [location.latitude, location.longitude, isExpanded]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.setView([location.latitude, location.longitude], 15);
  };

  const handleCopyCoordinates = () => {
    const textToCopy = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (${gridReference})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const externalMapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg font-sans">
      {/* Tactical Map Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-tactical font-bold text-white text-[11px] tracking-wide flex items-center gap-1.5">
              <span>{location.label || 'TACTICAL COORDINATE STAMP'}</span>
              <span className="text-[9px] bg-slate-800 text-emerald-400 px-1 py-0.2 rounded font-code">
                GPS FIX
              </span>
            </div>
            <div className="text-[10px] font-code text-slate-400 flex items-center gap-2">
              <span className="text-emerald-400">{formattedCoords}</span>
              <span>•</span>
              <span>GRID: {gridReference}</span>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyCoordinates}
            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title="Copy Latitude, Longitude & Grid"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title="Open in External Satellite Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse Map' : 'Expand Tactical View'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div className="relative w-full">
        <div
          ref={mapContainerRef}
          className={`w-full transition-all duration-200 z-0 ${
            isExpanded ? 'h-80 sm:h-96' : 'h-48 sm:h-52'
          }`}
        />

        {/* Tactical Scanline & Corner Crosshairs Overlay */}
        <div className="pointer-events-none absolute inset-0 scanline-overlay opacity-30"></div>

        {/* Corner Target Reticles */}
        <div className="pointer-events-none absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-500/60"></div>
        <div className="pointer-events-none absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-500/60"></div>
        <div className="pointer-events-none absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-500/60"></div>
        <div className="pointer-events-none absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-500/60"></div>

        {/* Floating In-Map Tactical Controls */}
        <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col gap-1 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-lg p-0.5 shadow-md">
          <button
            onClick={handleZoomIn}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors"
            title="Recenter on Target Marker"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Accuracy badge if available */}
        {location.accuracy && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-slate-950/80 backdrop-blur-sm border border-emerald-500/40 px-2 py-0.5 rounded text-[9px] font-code text-emerald-400 flex items-center gap-1 shadow">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>ACCURACY: ±{location.accuracy}m</span>
          </div>
        )}
      </div>

      {/* Footer Info Readout */}
      <div className="bg-slate-950 px-3 py-1.5 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-code">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span>UNIT [{callsign}] POSITION STAMP</span>
        </span>
        <span className="opacity-75">{new Date(timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
