import React, { useState, useEffect, useRef } from 'react';
import { Map, Marker, APIProvider, MapControl, ControlPosition } from '@vis.gl/react-google-maps';
import { Search, MapPin, Navigation } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

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
  const [position, setPosition] = useState<google.maps.LatLngLiteral>(
    (initialLat && initialLng) ? { lat: initialLat, lng: initialLng } : { lat: 51.5074, lng: -0.1278 }
  );
  const [address, setAddress] = useState(initialName);
  const [inputValue, setInputValue] = useState(initialName);
  
  const places = useMapsLibrary('places');
  const geocoding = useMapsLibrary('geocoding');
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['formatted_address', 'geometry', 'name'],
    };

    const ac = new places.Autocomplete(inputRef.current, options);
    setAutocomplete(ac);

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newPos = { lat, lng };
        setPosition(newPos);
        const name = place.formatted_address || place.name || '';
        setAddress(name);
        setInputValue(name);
        onLocationSelect(lat, lng, name);
      }
    });

    return () => {
      if (window.google && google.maps && google.maps.event && ac) {
        google.maps.event.clearInstanceListeners(ac);
      }
    };
  }, [places]);

  const handleMapClick = async (ev: any) => {
    if (!ev.detail.latLng || !geocoding) return;
    
    const latLng = ev.detail.latLng;
    setPosition(latLng);

    const geocoder = new geocoding.Geocoder();
    try {
      const response = await geocoder.geocode({ location: latLng });
      if (response.results[0]) {
        const name = response.results[0].formatted_address;
        setAddress(name);
        setInputValue(name);
        onLocationSelect(latLng.lat, latLng.lng, name);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      onLocationSelect(latLng.lat, latLng.lng, 'Selected location');
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos = { lat, lng };
        setPosition(newPos);
        // Trigger reverse geocode
        handleMapClick({ detail: { latLng: newPos } });
      },
      (err) => console.error('Geolocation error:', err)
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative group">
          <input 
            ref={inputRef}
            type="text"
            placeholder="Search address or neighborhood..."
            className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-[2.5rem] pl-14 pr-6 py-5 focus:border-brand/40 focus:outline-none transition-all text-ink font-bold text-lg"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={20} />
        </div>
      </div>

      <div className="relative h-[350px] rounded-[40px] overflow-hidden border border-brand-light group shadow-inner bg-stone-50">
        <Map 
          defaultCenter={position}
          center={position}
          defaultZoom={13}
          onClick={handleMapClick}
          mapId="bf50a41d06e23652" // Using a default ID or custom if available
          disableDefaultUI={true}
        >
          <Marker position={position} />
          
          <MapControl position={ControlPosition.RIGHT_BOTTOM}>
            <div className="m-6">
              <button 
                type="button"
                onClick={getMyLocation}
                className="bg-white w-14 h-14 rounded-full flex items-center justify-center text-ink shadow-2xl border border-brand-light hover:bg-brand hover:text-white transition-all active:scale-95"
                title="Use my current location"
              >
                <Navigation size={22} />
              </button>
            </div>
          </MapControl>
        </Map>
        
        <div className="absolute top-6 left-6 text-[9px] font-black uppercase tracking-[0.2em] text-ink/60 pointer-events-none bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full w-fit border border-brand-light/30 shadow-sm">
          Click map to pin location
        </div>
      </div>

      {address && (
        <div className="px-6 py-5 bg-[#F2F1EA]/30 rounded-[2rem] border border-brand-light flex items-center gap-4 transition-all animate-in fade-in zoom-in-95">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
            <MapPin size={16} />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-stone-600 leading-tight">
            {address}
          </p>
        </div>
      )}
    </div>
  );
};
