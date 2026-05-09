import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ===== Fix Leaflet default marker icon (Vite/Webpack issue) =====
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ===== Custom warehouse icon =====
const warehouseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <circle cx="12" cy="12" r="11" fill="#6366f1" stroke="white" stroke-width="2"/>
    <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">K</text>
</svg>`;

const warehouseIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(warehouseIconSvg),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

// ===== Types =====
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    address?: {
        road?: string;
        suburb?: string;
        city?: string;
        state?: string;
        country?: string;
    };
}

interface AddressMapPickerProps {
    value: string;
    onChange: (address: string) => void;
    onCoordinatesChange?: (lat: number, lng: number) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    showDistance?: boolean;
    warehouseCoords?: { lat: number; lng: number };
    height?: string;
    defaultCenter?: { lat: number; lng: number };
    initialCoords?: { lat: number; lng: number } | null;
    className?: string;
}

// ===== Haversine distance calculation =====
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ===== Sub-component: Map click handler =====
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// ===== Sub-component: Fly to position =====
function FlyToPosition({ position }: { position: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16, { duration: 1 });
        }
    }, [position, map]);
    return null;
}

// ===== Main Component =====
const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
    value,
    onChange,
    onCoordinatesChange,
    placeholder = 'Tìm kiếm địa chỉ...',
    label,
    required = false,
    showDistance = false,
    warehouseCoords,
    height = '300px',
    defaultCenter = { lat: 21.0285, lng: 105.8542 }, // Hà Nội
    initialCoords = null,
    className = '',
}) => {
    const [showMap, setShowMap] = useState(false);
    const [markerPos, setMarkerPos] = useState<[number, number] | null>(
        initialCoords ? [initialCoords.lat, initialCoords.lng] : null
    );
    const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [reverseLoading, setReverseLoading] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    const handleSearchChange = useCallback((term: string) => {
        setSearchTerm(term);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (term.trim().length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&countrycodes=vn&limit=6&addressdetails=1`,
                    { headers: { 'Accept-Language': 'vi' } }
                );
                const data: NominatimResult[] = await res.json();
                setSearchResults(data);
                setShowResults(data.length > 0);
            } catch (err) {
                console.error('Nominatim search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 500);
    }, []);

    // Select a search result
    const selectResult = (result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setMarkerPos([lat, lng]);
        setFlyTarget([lat, lng]);
        onChange(result.display_name);
        onCoordinatesChange?.(lat, lng);
        setShowResults(false);
        setSearchTerm('');
        if (!showMap) setShowMap(true);
    };

    // Reverse geocode (coordinates -> address)
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setReverseLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'vi' } }
            );
            const data = await res.json();
            if (data?.display_name) {
                onChange(data.display_name);
            }
        } catch (err) {
            console.error('Reverse geocode error:', err);
        } finally {
            setReverseLoading(false);
        }
    }, [onChange]);

    // Map click handler
    const handleMapClick = useCallback((lat: number, lng: number) => {
        setMarkerPos([lat, lng]);
        onCoordinatesChange?.(lat, lng);
        reverseGeocode(lat, lng);
    }, [onCoordinatesChange, reverseGeocode]);

    // Get current location (GPS)
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Trình duyệt không hỗ trợ định vị GPS');
            return;
        }
        setIsGeolocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setMarkerPos([latitude, longitude]);
                setFlyTarget([latitude, longitude]);
                onCoordinatesChange?.(latitude, longitude);
                await reverseGeocode(latitude, longitude);
                if (!showMap) setShowMap(true);
                setIsGeolocating(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                alert('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí trong trình duyệt.');
                setIsGeolocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Calculate distance
    const distance = (showDistance && warehouseCoords && markerPos)
        ? haversineDistance(warehouseCoords.lat, warehouseCoords.lng, markerPos[0], markerPos[1])
        : null;

    const mapCenter: [number, number] = markerPos || [defaultCenter.lat, defaultCenter.lng];

    return (
        <div className={`address-map-picker ${className}`}>
            {/* Label */}
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Search Box */}
            <div ref={searchRef} className="relative mb-2">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                        type="text"
                        value={searchTerm || ''}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-400"
                    />
                    {isSearching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <span className="block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </span>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div className="absolute z-[1000] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {searchResults.map((r) => (
                            <button
                                key={r.place_id}
                                type="button"
                                onClick={() => selectResult(r)}
                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-2"
                            >
                                <span className="text-indigo-500 mt-0.5 flex-shrink-0">📍</span>
                                <span className="text-sm text-slate-700 leading-snug line-clamp-2">{r.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Current Address Display */}
            {value && (
                <div className="mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 flex-shrink-0 mt-0.5">📌</span>
                    <span className="flex-1 leading-snug">{value}</span>
                    {reverseLoading && <span className="animate-spin text-xs">⏳</span>}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        showMap
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                >
                    🗺️ {showMap ? 'Ẩn bản đồ' : 'Mở bản đồ'}
                </button>
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGeolocating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-50"
                >
                    {isGeolocating ? (
                        <>
                            <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            Đang lấy...
                        </>
                    ) : (
                        <>📍 Vị trí hiện tại</>
                    )}
                </button>
                {markerPos && (
                    <button
                        type="button"
                        onClick={() => {
                            setMarkerPos(null);
                            setFlyTarget(null);
                            onChange('');
                            onCoordinatesChange?.(0, 0);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all"
                    >
                        🔄 Đặt lại
                    </button>
                )}
            </div>

            {/* Distance Display */}
            {distance !== null && distance > 0 && (
                <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                    <span>📏</span>
                    <span>Khoảng cách từ kho: <strong>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`}</strong></span>
                </div>
            )}

            {/* Map Container */}
            {showMap && (
                <div
                    className="rounded-xl overflow-hidden border-2 border-indigo-200 shadow-lg transition-all duration-300"
                    style={{ height }}
                >
                    <MapContainer
                        center={mapCenter}
                        zoom={markerPos ? 16 : 13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onMapClick={handleMapClick} />
                        <FlyToPosition position={flyTarget} />

                        {/* Selected position marker */}
                        {markerPos && (
                            <Marker
                                position={markerPos}
                                draggable={true}
                                eventHandlers={{
                                    dragend: (e) => {
                                        const marker = e.target as L.Marker;
                                        const pos = marker.getLatLng();
                                        setMarkerPos([pos.lat, pos.lng]);
                                        onCoordinatesChange?.(pos.lat, pos.lng);
                                        reverseGeocode(pos.lat, pos.lng);
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="text-xs max-w-[200px]">
                                        <p className="font-semibold text-indigo-700 mb-1">📍 Vị trí đã chọn</p>
                                        <p className="text-slate-600 leading-snug">{value || 'Đang lấy địa chỉ...'}</p>
                                        <p className="text-slate-400 mt-1 font-mono text-[10px]">
                                            {markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Warehouse marker */}
                        {showDistance && warehouseCoords && (
                            <Marker position={[warehouseCoords.lat, warehouseCoords.lng]} icon={warehouseIcon}>
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-semibold text-indigo-700">🏭 Kho Tổng</p>
                                        <p className="text-slate-500">Số 1, Trịnh Văn Bô, Hà Nội</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>
            )}

            {/* Map hint */}
            {showMap && !markerPos && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <span>💡</span> Click vào bản đồ để chọn vị trí, hoặc tìm kiếm ở ô phía trên
                </p>
            )}

            {/* Coordinates display */}
            {markerPos && (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    🌐 {markerPos[0].toFixed(6)}°N, {markerPos[1].toFixed(6)}°E
                </p>
            )}
        </div>
    );
};

export default AddressMapPicker;
