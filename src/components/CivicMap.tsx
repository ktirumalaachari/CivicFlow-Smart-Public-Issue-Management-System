import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Polygon,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import axios from "axios";
import { Search, Navigation } from "lucide-react";
import toast from "react-hot-toast";

// Fix Leaflet's default icon path issues with CDN URLs
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define interfaces
interface Complaint {
  id: number;
  title: string;
  category: string;
  priority: string;
  location_lat: number;
  location_lng: number;
  status: string;
}

interface CivicMapProps {
  mode: "interactive" | "dashboard";
  lat?: number;
  lng?: number;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  complaints?: Complaint[];
}

// ------------------------------------------------------------------
// Sub-component: Heatmap Layer
// ------------------------------------------------------------------
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heat = (L as any)
      .heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
      })
      .addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
};

// ------------------------------------------------------------------
// Sub-component: Map Interactions (Click to place marker)
// ------------------------------------------------------------------
const LocationPicker = ({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
export default function CivicMap({
  mode,
  lat = 12.9716,
  lng = 77.5946,
  onLocationSelect,
  complaints = [],
}: CivicMapProps) {
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(false);

  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mode === "interactive") {
      setCurrentLat(lat);
      setCurrentLng(lng);
    }
  }, [lat, lng, mode]);

  const fetchAddress = async (qLat: number, qLng: number) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${qLat}&lon=${qLng}`,
      );

      const address = res.data.display_name;

      if (onLocationSelect) {
        onLocationSelect(qLat, qLng, address);
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
      toast.error("Failed to fetch address details for this location.");
    }
  };

  const handleMapClick = (newLat: number, newLng: number) => {
    if (mode === "interactive") {
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      fetchAddress(newLat, newLng);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    toast.loading("Locating you...", { id: "locate" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setCurrentLat(latitude);
        setCurrentLng(longitude);

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 15);
        }

        fetchAddress(latitude, longitude);

        toast.success("Location found!", {
          id: "locate",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);

        toast.error("Unable to retrieve your location.", {
          id: "locate",
        });
      },
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery) return;

    toast.loading("Searching...", {
      id: "search",
    });

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}`,
      );

      if (res.data && res.data.length > 0) {
        const result = res.data[0];

        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        setCurrentLat(newLat);
        setCurrentLng(newLng);

        if (mapRef.current) {
          mapRef.current.flyTo([newLat, newLng], 15);
        }

        if (onLocationSelect && mode === "interactive") {
          onLocationSelect(newLat, newLng, result.display_name);
        }

        toast.success("Location found!", {
          id: "search",
        });
      } else {
        toast.error("Location not found.", {
          id: "search",
        });
      }
    } catch (err) {
      console.error("Search failed", err);

      toast.error("Search failed.", {
        id: "search",
      });
    }
  };

  const sampleBoundaries = [
    [
      [12.98, 77.58],
      [12.98, 77.61],
      [12.95, 77.61],
      [12.95, 77.58],
    ],
  ] as [number, number][][];

  const heatPoints = complaints
    .filter((c) => c.location_lat && c.location_lng)
    .map(
      (c) => [c.location_lat, c.location_lng, 1] as [number, number, number],
    );

  return (
    <div className="relative flex flex-col h-full w-full rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <div className="bg-white p-3 flex flex-wrap gap-3 items-center justify-between border-b border-slate-200 z-[400] relative">
        <form
          onSubmit={handleSearch}
          className="flex-1 min-w-[200px] max-w-sm relative"
        >
          <input
            type="text"
            placeholder="Search address or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

          <button type="submit" className="hidden">
            Search
          </button>
        </form>

        <div className="flex gap-2">
          {mode === "interactive" && (
            <button
              onClick={locateMe}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Locate Me
            </button>
          )}

          {mode === "dashboard" && (
            <>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showHeatmap
                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                }`}
              >
                🔥 Heatmap
              </button>

              <button
                onClick={() => setShowBoundaries(!showBoundaries)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showBoundaries
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                }`}
              >
                🗺️ Boundaries
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-[400px] min-h-[400px] relative z-0">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={13}
          className="w-full h-full"
          ref={mapRef}
        >
          {/* OpenStreetMap tile layer */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            referrerPolicy="strict-origin-when-cross-origin"
          />

          {mode === "interactive" && (
            <>
              <LocationPicker onSelect={handleMapClick} />

              <Marker position={[currentLat, currentLng]}>
                <Popup>
                  <div className="text-center font-semibold text-sm">
                    Selected Location
                    <br />
                    <span className="text-xs text-slate-500 font-normal">
                      {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {mode === "dashboard" && !showHeatmap && (
            <MarkerClusterGroup chunkedLoading>
              {complaints
                .filter((c) => c.location_lat && c.location_lng)
                .map((c) => (
                  <Marker
                    key={c.id}
                    position={[c.location_lat, c.location_lng]}
                  >
                    <Popup>
                      <div className="p-1 min-w-[150px]">
                        <h4 className="font-bold text-slate-800 text-sm">
                          {c.title}
                        </h4>

                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-semibold">Category:</span>{" "}
                          {c.category}
                        </p>

                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Priority:</span>{" "}
                          {c.priority}
                        </p>

                        <span
                          className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === "Resolved" || c.status === "Closed"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MarkerClusterGroup>
          )}

          {mode === "dashboard" && showHeatmap && (
            <HeatmapLayer points={heatPoints} />
          )}

          {mode === "dashboard" && showBoundaries && (
            <Polygon
              positions={sampleBoundaries}
              pathOptions={{
                color: "purple",
                fillColor: "purple",
                fillOpacity: 0.2,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
