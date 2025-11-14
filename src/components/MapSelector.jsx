import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import timezones from '@/lib/timezones.json';
import countries from '@/lib/countries.json';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const getTimezoneFromCoordinates = async (lat, lng) => {
    try {
        const response = await fetch(`https://timeapi.io/api/Time/current/coordinate?latitude=${lat}&longitude=${lng}`);
        const data = await response.json();
        if (data && data.timeZone) {
            return timezones.find(tz => tz.utc.includes(data.timeZone))?.text || null;
        }
        return null;
    } catch (error) {
        console.error("Error fetching timezone:", error);
        return null;
    }
};

const MapController = ({ position }) => {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.flyTo(position, 13);
    }
  }, [position, map]);
  return null;
};

const MapEvents = ({ onLocationSelect, t }) => {
  const { toast } = useToast();
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`);
        const data = await res.json();
        
        if (data && data.display_name && data.address) {
          const countryName = data.address.country;
          const countryCode = data.address.country_code.toUpperCase();
          const foundCountry = countries.find(c => c.code === countryCode);
          
          const timezoneText = await getTimezoneFromCoordinates(lat, lng);

          onLocationSelect({ 
            lat, 
            lng, 
            address: data.display_name,
            country: foundCountry ? foundCountry.name : countryName,
            timezone: timezoneText
          });
          toast({ title: t('success'), description: t('mapAddressSelected') });
        } else {
          toast({ title: t('error'), description: t('mapAddressError'), variant: "destructive" });
        }
      } catch (error) {
        toast({ title: t('error'), description: t('mapNetworkError'), variant: "destructive" });
      }
    },
  });
  return null;
};

const MapSelector = ({ onLocationSelect }) => {
  const { t } = useTranslation();
  const [position, setPosition] = useState([41.0082, 28.9784]); // Default to Istanbul
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleLocationSelected = (location) => {
    setPosition([location.lat, location.lng]);
    onLocationSelect(location);
  };
  
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=en`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPosition = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPosition);

        const detailsResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
        const detailsData = await detailsResponse.json();
        const countryCode = detailsData.address.country_code.toUpperCase();
        const foundCountry = countries.find(c => c.code === countryCode);
        const timezoneText = await getTimezoneFromCoordinates(lat, lon);

        onLocationSelect({
            lat: newPosition[0],
            lng: newPosition[1],
            address: display_name,
            country: foundCountry ? foundCountry.name : detailsData.address.country,
            timezone: timezoneText
        });
      } else {
        toast({ title: t('error'), description: t('mapAddressError'), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t('error'), description: t('mapSearchError'), variant: "destructive" });
    }
  };

  const displayMap = useMemo(() => (
    <MapContainer center={position} zoom={13} scrollWheelZoom={true} style={{ height: '400px', width: '100%', borderRadius: '1rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}></Marker>
      <MapEvents onLocationSelect={handleLocationSelected} t={t} />
      <MapController position={position} />
    </MapContainer>
  ), [position, t]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('mapSearchPlaceholder')}
          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit">{t('search')}</Button>
      </form>
      <p className="text-sm text-slate-600 -mt-2 mb-2">Adresi seçmek için haritaya tıklayın veya yukarıdan arama yapın.</p>
      {displayMap}
    </div>
  );
};

export default MapSelector;