import React, { useState, useEffect } from 'react';
import { Map, Marker, ZoomControl } from 'pigeon-maps';
import { Search, MapPin, Navigation } from 'lucide-react';

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialName?: string;
  onLocationSelect: (lat: number, lng: number, name: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  initialLat, 
  initialLng, 
  initialName = '', 
  onLocationSelect 
}) => {
  const [center, setCenter] = useState<[number, number]>([initialLat || 51.5074, initialLng || -0.1278]);
  const [zoom, setZoom] = useState(13);
  const [marker, setMarker] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState(initialName);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setCenter([lat, lon]);
    setMarker([lat, lon]);
    setAddress(place.display_name);
    setSuggestions([]);
    setSearchQuery('');
    onLocationSelect(lat, lon, place.display_name);
  };

  const handleMapClick = async ({ latLng }: { latLng: [number, number] }) => {
    setMarker(latLng);
    onLocationSelect(latLng[0], latLng[1], address || 'Custom location');
    
    // Reverse geocode to get address
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng[0]}&lon=${latLng[1]}`);
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
        onLocationSelect(latLng[0], latLng[1], data.display_name);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCenter([lat, lon]);
        handleMapClick({ latLng: [lat, lon] });
      },
      (err) => console.error('Geolocation error:', err)
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative group">
          <input 
            type="text"
            placeholder="Search city, neighborhood, or address..."
            className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-[2rem] pl-14 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink font-bold"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={18} />
          {searching && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-3xl border border-brand-light shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => selectPlace(s)}
                className="w-full px-6 py-4 text-left hover:bg-bg-warm flex items-start gap-4 transition-colors border-b border-brand-light/20 last:border-0"
              >
                <MapPin className="text-brand shrink-0 mt-0.5" size={16} />
                <span className="text-xs font-bold text-ink leading-tight">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-[300px] rounded-[32px] overflow-hidden border border-brand-light group shadow-inner bg-bg-warm">
        <Map 
          center={center} 
          zoom={zoom} 
          onBoundsChanged={({ center, zoom }) => {
            setCenter(center);
            setZoom(zoom);
          }}
          onClick={handleMapClick}
        >
          <ZoomControl />
          {marker && (
            <Marker 
              width={50} 
              anchor={marker} 
              color="rgb(var(--brand))" 
            />
          )}
        </Map>
        
        <button 
          onClick={getMyLocation}
          className="absolute bottom-6 right-6 bg-white w-12 h-12 rounded-full flex items-center justify-center text-ink shadow-lg border border-brand-light hover:bg-brand hover:text-white transition-all active:scale-95"
          title="Use my current location"
        >
          <Navigation size={20} />
        </button>

        <div className="absolute top-6 right-20 left-6 text-[10px] font-black uppercase tracking-widest text-ink/40 pointer-events-none bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full w-fit border border-brand-light/30">
          Click on map to pin exact location
        </div>
      </div>

      {address && (
        <div className="px-6 py-4 bg-white rounded-3xl border border-brand-light flex items-center gap-3">
          <MapPin className="text-brand/40" size={16} />
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/60 truncate">
            {address}
          </p>
        </div>
      )}
    </div>
  );
};
