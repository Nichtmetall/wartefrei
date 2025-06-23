import { useState, useEffect } from 'react';
import { Search, Clock, ArrowRight, Navigation, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { vvoApi, type VVOStop, type VVORoute, type VVOTrip } from '@/lib/vvo-api';
import { cookieManager } from '@/lib/cookies';

interface RouteSearchProps {
  stops: VVOStop[];
}

export default function RouteSearch({ stops }: RouteSearchProps) {
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [routes, setRoutes] = useState<VVORoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);

  // Load route history on mount
  useEffect(() => {
    setRouteHistory(cookieManager.getRouteHistory());
  }, []);

  // Clear routes when origin or destination changes
  useEffect(() => {
    setRoutes(null);
  }, [origin, destination]);

  const searchRoutes = async () => {
    if (!origin || !destination) return;
    
    const originStop = stops.find(s => s.id === origin);
    const destinationStop = stops.find(s => s.id === destination);
    
    if (!originStop || !destinationStop) return;
    
    setLoading(true);
    setRoutes(null); // Clear old results first
    try {
      const result = await vvoApi.findRoute(origin, destination);
      setRoutes(result);
      
      // Save to route history
      cookieManager.addToRouteHistory(originStop, destinationStop);
      setRouteHistory(cookieManager.getRouteHistory());
    } catch (error) {
      console.error('Fehler bei der Routensuche:', error);
      setRoutes(null); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  const clearRouteHistory = () => {
    cookieManager.clearRouteHistory();
    setRouteHistory([]);
  };

  const loadHistoryRoute = (historyItem: any) => {
    setOrigin(historyItem.origin.id);
    setDestination(historyItem.destination.id);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Route Search Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Verbindungssuche</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Origin */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Von</label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Starthaltestelle wählen..." />
              </SelectTrigger>
              <SelectContent>
                {stops.map((stop) => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nach</label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Zielhaltestelle wählen..." />
              </SelectTrigger>
              <SelectContent>
                {stops.map((stop) => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={searchRoutes}
          disabled={!origin || !destination || loading}
          className="w-full flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Suche...' : 'Verbindung suchen'}
        </Button>
      </div>

      {/* Route History */}
      {routeHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Letzte Verbindungssuchen</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRouteHistory}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {routeHistory.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryRoute(item)}
                className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{item.origin.name}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{item.destination.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.searchedAt).toLocaleDateString('de-DE')} • {new Date(item.searchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {routes && routes.trips.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Gefundene Verbindungen ({routes.trips.length})
          </h3>
          
          <div className="space-y-4">
            {routes.trips.slice(0, 3).map((trip: VVOTrip, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                {/* Trip Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {trip.departure && formatTime(trip.departure.time)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {trip.arrival && formatTime(trip.arrival.time)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(trip.duration)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {trip.interchanges} Umstiege
                    </span>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="flex items-center gap-2 flex-wrap">
                  {trip.nodes.map((node, nodeIndex) => (
                    <div key={nodeIndex} className="flex items-center gap-2">
                      <Badge className={vvoApi.getModeColor(node.mode)}>
                        {node.line}
                      </Badge>
                      {nodeIndex < trip.nodes.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Departure/Arrival Info */}
                {(trip.departure || trip.arrival) && (
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    {trip.departure && (
                      <div>Abfahrt: {trip.departure.name}</div>
                    )}
                    {trip.arrival && (
                      <div>Ankunft: {trip.arrival.name}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {routes && routes.trips.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-8 text-gray-500">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Keine Verbindungen gefunden.</p>
            <p className="text-sm">Versuchen Sie andere Haltestellen.</p>
          </div>
        </div>
      )}
    </div>
  );
} 