import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { PersonNode } from '../types/genealogy';

export interface CityOriginGroup {
  place: string;
  coords: { lat: number; lon: number };
  people: PersonNode[];
  earliestGen: number;
}

export interface MigrationVector {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  branch: PersonNode['branch'];
}

interface AncestralGoogleMapProps {
  apiKey: string;
  cityGroups: CityOriginGroup[];
  migrationVectors: MigrationVector[];
  activeCityPlace: string | null;
  onSelectCity: (place: string, leadPersonId: string) => void;
}

const OriginHubMarker: React.FC<{
  group: CityOriginGroup;
  isActive: boolean;
  onSelect: () => void;
}> = ({ group, isActive, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (isActive) {
      setInfoOpen(true);
    } else {
      setInfoOpen(false);
    }
  }, [isActive]);

  const position = { lat: group.coords.lat, lng: group.coords.lon };
  const sortedPeople = [...group.people].sort((a, b) => a.birthYear - b.birthYear);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={`${group.place} (${group.people.length})`}
        onClick={() => {
          onSelect();
          setInfoOpen(true);
        }}
      >
        <Pin
          background={isActive ? '#1E3A8A' : '#854D0E'}
          borderColor={isActive ? '#172D6B' : '#5C3409'}
          glyphColor="#FBF9F5"
          scale={isActive ? 1.25 : 1.0}
          glyphText={String(group.people.length)}
        />
      </AdvancedMarker>

      {infoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={240}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="p-1 text-[#1C1917] font-sans">
            <div className="text-xs font-semibold">{group.place}</div>
            <div className="text-[11px] text-[#57534E] mt-0.5">
              {group.people.length} documented relative{group.people.length === 1 ? '' : 's'}
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-[#292524]">
              {sortedPeople.slice(0, 4).map((p) => (
                <li key={p.id}>
                  {p.firstName} {p.lastName} ({p.birthYear})
                </li>
              ))}
              {sortedPeople.length > 4 && (
                <li className="text-[#6B6257]">+{sortedPeople.length - 4} more</li>
              )}
            </ul>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const MigrationPolylines: React.FC<{
  vectors: MigrationVector[];
  cityGroups: CityOriginGroup[];
  activeCityPlace: string | null;
}> = ({ vectors, cityGroups, activeCityPlace }) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const mapsLib = useMapsLibrary('maps');

  // Pan smoothly to newly selected city
  useEffect(() => {
    if (!map || !activeCityPlace) return;
    const match = cityGroups.find((g) => g.place === activeCityPlace);
    if (match) {
      map.panTo({ lat: match.coords.lat, lng: match.coords.lon });
    }
  }, [map, activeCityPlace, cityGroups]);

  // Fit bounds when tree city list changes
  useEffect(() => {
    if (!map || !coreLib || cityGroups.length === 0) return;
    if (cityGroups.length === 1) {
      map.setCenter({ lat: cityGroups[0].coords.lat, lng: cityGroups[0].coords.lon });
      map.setZoom(6);
      return;
    }
    const bounds = new coreLib.LatLngBounds();
    cityGroups.forEach((g) => bounds.extend({ lat: g.coords.lat, lng: g.coords.lon }));
    map.fitBounds(bounds, 64);
  }, [map, coreLib, cityGroups]);

  // Render geodesic migration lines using Maps JavaScript Polyline
  useEffect(() => {
    if (!map || !mapsLib) return;
    const polylines = vectors.map((vec) => {
      const color = vec.branch === 'paternal' ? '#1E3A8A' : '#14532D';
      return new mapsLib.Polyline({
        path: [vec.from, vec.to],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.72,
        strokeWeight: 2.2,
        map,
      });
    });

    return () => {
      polylines.forEach((pl) => pl.setMap(null));
    };
  }, [map, mapsLib, vectors]);

  return null;
};

export const AncestralGoogleMap: React.FC<AncestralGoogleMapProps> = ({
  apiKey,
  cityGroups,
  migrationVectors,
  activeCityPlace,
  onSelectCity,
}) => {
  const defaultCenter =
    cityGroups.length > 0
      ? { lat: cityGroups[0].coords.lat, lng: cityGroups[0].coords.lon }
      : { lat: 48.14, lng: 11.58 };

  if (!apiKey) {
    return (
      <div className="w-full h-[460px] rounded border border-[#E4DDD0] bg-[#F4EFE4] flex flex-col items-center justify-center p-6 text-center">
        <p className="font-serif text-base font-semibold text-[#1C1917]">
          Interactive Google Map Initializing
        </p>
        <p className="text-xs text-[#6B6257] mt-1.5 max-w-md">
          Waiting for Google Maps Platform configuration. Ensure a Maps API key is active in your environment secrets to display ancestral origin markers and migration routes.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[460px] rounded border border-[#E4DDD0] overflow-hidden bg-[#F4EFE4]">
      <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="US">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={defaultCenter}
          defaultZoom={4}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <MigrationPolylines
            vectors={migrationVectors}
            cityGroups={cityGroups}
            activeCityPlace={activeCityPlace}
          />
          {cityGroups.map((group) => (
            <OriginHubMarker
              key={group.place}
              group={group}
              isActive={activeCityPlace === group.place}
              onSelect={() => onSelectCity(group.place, group.people[0].id)}
            />
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
