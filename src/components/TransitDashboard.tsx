import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Route, MapPin, Star, History, Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vvoApi, type VVOStop, type VVOStopDepartures, type VVODeparture } from '@/lib/vvo-api';
import { cookieManager } from '@/lib/cookies';
import RouteSearch from './RouteSearch';
import StopSearch from './StopSearch';

// Neue Komponente für Linienverlauf-Details
interface RouteDetailsProps {
  departure: VVODeparture;
  selectedStop: VVOStop | null;
}

function RouteDetails({ departure, selectedStop }: RouteDetailsProps) {
  const [lineStops, setLineStops] = useState<Array<{
    name: string;
    city?: string;
    arrival?: Date;
    departure?: Date;
    platform?: string;
    isCurrent: boolean;
  }> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLineRoute = async () => {
      if (!selectedStop) return;
      
      setLoading(true);
      try {
        // Lade echten Linienverlauf mit der neuen Funktion
        const result = await vvoApi.getLineRoute(
          selectedStop.id,
          departure.line,
          departure.direction,
          departure.arrivalTime
        );
        setLineStops(result);
      } catch (error) {
        console.error('Fehler beim Laden des Linienverlaufs:', error);
        setLineStops(null);
      } finally {
        setLoading(false);
      }
    };

    loadLineRoute();
  }, [departure.line, departure.direction, selectedStop, departure.arrivalTime]);

  if (loading) {
    return (
      <div className="border-t bg-gray-50 p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-600">Lade Linienverlauf...</span>
        </div>
      </div>
    );
  }

  // Verwende echte Liniendaten oder Fallback
  const displayStops = lineStops || [
    { 
      name: selectedStop?.name || 'Aktuelle Haltestelle',
      city: selectedStop?.city || 'Dresden',
      departure: departure.arrivalTime,
      platform: departure.platform?.name,
      isCurrent: true 
    },
    { 
      name: "Nächste Haltestelle",
      city: 'Dresden',
      arrival: undefined,
      platform: undefined,
      isCurrent: false 
    },
    { 
      name: departure.direction,
      city: 'Dresden',
      arrival: undefined,
      platform: undefined,
      isCurrent: false 
    }
  ];

  const formatTime = (date?: Date): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="border-t bg-gray-50 p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Linienverlauf {departure.line} → {departure.direction}
      </h4>
      <div className="relative">
        {/* Verbindungslinie */}
        {displayStops.length > 1 && (
          <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-gray-300"></div>
        )}
        
        <div className="space-y-3">
          {displayStops.map((stop, index) => {
            // Berechne die ursprüngliche (geplante) Zeit
            const currentTime = new Date();
            
            // Für aktuelle Haltestelle: verwende die ursprünglich geplante Zeit
            let originalTime: string;
            if (stop.isCurrent) {
              // Berechne geplante Zeit basierend auf scheduledTimeRelative
              const scheduledTimeMs = currentTime.getTime() + (departure.scheduledTimeRelative * 60000);
              const scheduledTime = new Date(scheduledTimeMs);
              originalTime = scheduledTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            } else if (stop.departure) {
              // Verwende die ursprüngliche API-Zeit (ohne Verspätung)
              originalTime = formatTime(stop.departure);
            } else if (stop.arrival) {
              // Verwende die ursprüngliche API-Zeit (ohne Verspätung)
              originalTime = formatTime(stop.arrival);
            } else {
              // Schätze ursprüngliche Zeit basierend auf Position (ca. 2 Min pro Stop)
              const estimatedMinutes = (index + 1) * 2;
              const scheduledTimeMs = currentTime.getTime() + (departure.scheduledTimeRelative * 60000);
              const estimatedTime = new Date(scheduledTimeMs + (estimatedMinutes * 60000));
              originalTime = estimatedTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }

            return (
              <div key={index} className="relative flex items-center gap-3 text-sm">
                {/* Punkt mit Z-Index über der Linie */}
                <div className={`relative z-10 w-3 h-3 rounded-full border-2 ${
                  stop.isCurrent 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-300'
                }`}></div>
                
                <div className="flex-1">
                  <div className={`font-medium ${stop.isCurrent ? 'text-blue-600' : 'text-gray-900'}`}>
                    {stop.name}
                    {stop.city && stop.city !== 'Dresden' && (
                      <span className="text-gray-500 font-normal">, {stop.city}</span>
                    )}
                  </div>
                  {stop.platform && (
                    <div className="text-xs text-gray-500">Steig {stop.platform}</div>
                  )}
                </div>
                
                <div className="text-right text-xs">
                  <div className={`font-medium ${stop.isCurrent ? 'text-blue-600' : 'text-gray-600'}`}>
                    {stop.isCurrent ? 'Ab' : 'An'} {originalTime}
                  </div>
                  {stop.isCurrent && departure.delayTime > 0 && (
                    <div className="text-red-500 text-xs">+{departure.delayTime} min</div>
                  )}
                  {!stop.isCurrent && departure.delayTime > 0 && (
                    <div className="text-red-500 text-xs">+{departure.delayTime} min</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DepartureCardProps {
  departure: VVODeparture;
  selectedStop: VVOStop | null;
  uniqueId: string;
  expandedDepartures: Set<string>;
  formatExactTime: (departure: VVODeparture) => string;
  toggleDepartureExpansion: (id: string) => void;
}

function DepartureCard({ 
  departure, 
  selectedStop, 
  uniqueId, 
  expandedDepartures, 
  formatExactTime, 
  toggleDepartureExpansion 
}: DepartureCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => toggleDepartureExpansion(uniqueId)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Verwende echtes Icon aus mode.iconUrl falls verfügbar */}
            {departure.mode?.iconUrl ? (
              <img 
                src={departure.mode.iconUrl} 
                alt={departure.mode.title || departure.mode.name} 
                className="w-5 h-5"
                onError={(e) => {
                  // Fallback zu Emoji wenn Icon nicht lädt
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) nextElement.style.display = 'inline';
                }}
              />
            ) : null}
            <span 
              className="text-lg" 
              style={{ display: departure.mode?.iconUrl ? 'none' : 'inline' }}
            >
              {vvoApi.getModeIcon(departure.mode)}
            </span>
            <Badge className={vvoApi.getModeColor(departure.mode)}>
              {departure.line}
            </Badge>
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              nach {departure.direction}
            </p>
            {/* Ursprüngliche Zeit + Verspätung anzeigen */}
            <div className="text-sm text-gray-500">
              {(() => {
                const currentTime = new Date();
                const scheduledTimeMs = currentTime.getTime() + (departure.scheduledTimeRelative * 60000);
                const scheduledTime = new Date(scheduledTimeMs);
                const originalTime = scheduledTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <span>
                    {originalTime}
                    {departure.delayTime > 0 && (
                      <span className="text-red-500"> +{departure.delayTime} min</span>
                    )}
                    {departure.delayTime < 0 && (
                      <span className="text-green-600"> {departure.delayTime} min</span>
                    )}
                    {departure.delayTime === 0 && (
                      <span className="text-green-600"> pünktlich</span>
                    )}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-lg font-semibold ${vvoApi.getStateColor(departure.state)}`}>
              {vvoApi.formatTime(departure.arrivalTimeRelative)}
            </div>
            <div className="text-sm text-gray-600">
              {formatExactTime(departure)}
            </div>
            {/* Steig ans Ende der Card */}
            {departure.platform && (
              <div className="text-xs text-gray-500 mt-1">
                Steig {departure.platform.name}
              </div>
            )}
          </div>
          {expandedDepartures.has(uniqueId) ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Aufgeklappter Linienverlauf */}
      {expandedDepartures.has(uniqueId) && (
        <RouteDetails 
          departure={departure} 
          selectedStop={selectedStop}
        />
      )}
    </div>
  );
}

export default function TransitDashboard() {
  const [selectedStop, setSelectedStop] = useState<VVOStop | null>(null);
  const [stops, setStops] = useState<VVOStop[]>([]);
  const [departures, setDepartures] = useState<VVOStopDepartures | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [favorites, setFavorites] = useState<VVOStop[]>([]);
  const [searchHistory, setSearchHistory] = useState<VVOStop[]>([]);
  const [searchTime, setSearchTime] = useState<string>('');
  const [expandedDepartures, setExpandedDepartures] = useState<Set<string>>(new Set());
  const [departureCount, setDepartureCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  // Lade beliebte Haltestellen beim Start
  useEffect(() => {
    const loadPopularStops = async () => {
      const popularStops = await vvoApi.getPopularStops();
      setStops(popularStops);
    };
    loadPopularStops();
    
    // Lade Favoriten und Historie
    setFavorites(cookieManager.getFavorites());
    setSearchHistory(cookieManager.getSearchHistory());
  }, []);

  // Leere Tabelle bei Änderung der Parameter
  useEffect(() => {
    setDepartures(null);
    setLastUpdated('');
    setExpandedDepartures(new Set());
    setDepartureCount(10);
  }, [selectedStop, searchTime]);

  const loadDepartures = async () => {
    if (!selectedStop) return;
    
    // Sofort leeren und Loading-State setzen
    setDepartures(null);
    setLastUpdated('');
    setExpandedDepartures(new Set());
    setLoading(true);
    
    try {
      // Berechne Offset in Minuten wenn Suchzeit gesetzt ist
      let timeOffset = 0;
      if (searchTime) {
        const now = new Date();
        const [hours, minutes] = searchTime.split(':').map(Number);
        const searchDate = new Date(now);
        searchDate.setHours(hours, minutes, 0, 0);
        
        // Wenn die Zeit in der Vergangenheit liegt, nehme morgen
        if (searchDate < now) {
          searchDate.setDate(searchDate.getDate() + 1);
        }
        
        timeOffset = Math.floor((searchDate.getTime() - now.getTime()) / (1000 * 60));
      }
      
      const result = await vvoApi.getDepartures(selectedStop.id, departureCount, timeOffset);
      setDepartures(result);
      setLastUpdated(new Date().toLocaleTimeString('de-DE'));
      
      // Zur Historie hinzufügen
      cookieManager.addToSearchHistory(selectedStop);
      setSearchHistory(cookieManager.getSearchHistory());
    } catch (error) {
      console.error('Fehler beim Laden der Abfahrten:', error);
      setDepartures(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDepartures = async () => {
    if (!selectedStop) return;
    
    setLoadingMore(true);
    
    try {
      // Erhöhe die Anzahl der Abfahrten um 10
      const newCount = departureCount + 10;
      setDepartureCount(newCount);
      
      // Berechne Offset wenn Suchzeit gesetzt ist
      let timeOffset = 0;
      if (searchTime) {
        const now = new Date();
        const [hours, minutes] = searchTime.split(':').map(Number);
        const searchDate = new Date(now);
        searchDate.setHours(hours, minutes, 0, 0);
        
        if (searchDate < now) {
          searchDate.setDate(searchDate.getDate() + 1);
        }
        
        timeOffset = Math.floor((searchDate.getTime() - now.getTime()) / (1000 * 60));
      }
      
      const result = await vvoApi.getDepartures(selectedStop.id, newCount, timeOffset);
      setDepartures(result);
      setLastUpdated(new Date().toLocaleTimeString('de-DE'));
    } catch (error) {
      console.error('Fehler beim Laden weiterer Abfahrten:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFavorite = (stop: VVOStop) => {
    const isFavorite = favorites.some(fav => fav.id === stop.id);
    
    if (isFavorite) {
      cookieManager.removeFromFavorites(stop.id);
    } else {
      cookieManager.addToFavorites(stop);
    }
    
    setFavorites(cookieManager.getFavorites());
  };

  const clearSearchHistory = () => {
    cookieManager.clearSearchHistory();
    setSearchHistory([]);
  };

  const formatExactTime = (departure: VVODeparture): string => {
    const now = new Date();
    const departureTime = new Date(now.getTime() + departure.arrivalTimeRelative * 60000);
    return departureTime.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const toggleDepartureExpansion = (departureId: string) => {
    const newExpanded = new Set(expandedDepartures);
    if (newExpanded.has(departureId)) {
      newExpanded.delete(departureId);
    } else {
      newExpanded.add(departureId);
    }
    setExpandedDepartures(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transit Monitor</h1>
          <p className="text-gray-600">Echtzeitabfahrten und Routenplanung</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="departures" className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="departures" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Abfahrten
              </TabsTrigger>
              <TabsTrigger value="connections" className="flex items-center gap-2">
                <Route className="w-4 h-4" />
                Verbindungen
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Departures Tab */}
          <TabsContent value="departures" className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Haltestellenabfahrten</h2>
                {departures && (
                  <Button 
                    onClick={loadDepartures} 
                    disabled={loading || !selectedStop}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </Button>
                )}
              </div>

              {/* Aktive Haltestelle - minimalistisch */}
              {selectedStop && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{selectedStop.name}, {selectedStop.city}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStop(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}

              {/* Stop Selection and Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Haltestelle wählen</label>
                  <StopSearch 
                    onStopSelect={setSelectedStop}
                    selectedStop={null}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Abfahrtszeit (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={searchTime}
                      onChange={(e) => setSearchTime(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTime('')}
                      disabled={!searchTime}
                    >
                      Jetzt
                    </Button>
                  </div>
                  {searchTime && (
                    <p className="text-xs text-gray-500">
                      Abfahrten ab {searchTime} Uhr
                    </p>
                  )}
                </div>
              </div>

              {/* Abfahrten anzeigen Button */}
              {selectedStop && (
                <div className="mb-6">
                  <Button 
                    onClick={loadDepartures} 
                    disabled={loading}
                    className="w-full flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {loading ? 'Lade Abfahrten...' : 'Abfahrten anzeigen'}
                  </Button>
                </div>
              )}

              {/* Favoriten - nur ohne ausgewählte Haltestelle */}
              {!selectedStop && favorites.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-sm font-medium text-gray-700">Favoriten</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {favorites.map((stop) => (
                      <div key={stop.id} className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStop(stop)}
                          className="flex-1 justify-start text-left"
                        >
                          <MapPin className="w-3 h-3 mr-2" />
                          <span className="truncate">{stop.name}, {stop.city}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(stop)}
                          className="ml-1 text-yellow-500 hover:text-red-500"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Letzte Suchen - nur ohne ausgewählte Haltestelle */}
              {!selectedStop && searchHistory.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-medium text-gray-700">Letzte Suchen</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearchHistory}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {searchHistory.slice(0, 6).map((stop) => (
                      <div key={stop.id} className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStop(stop)}
                          className="flex-1 justify-start text-left"
                        >
                          <MapPin className="w-3 h-3 mr-2" />
                          <span className="truncate">{stop.name}, {stop.city}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(stop)}
                          className={`ml-1 ${favorites.some(fav => fav.id === stop.id) 
                            ? 'text-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favorites.some(fav => fav.id === stop.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Popular Stops Fallback */}
              {!selectedStop && stops.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Beliebte Haltestellen</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stops.slice(0, 4).map((stop) => (
                      <Button
                        key={stop.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStop(stop)}
                        className="justify-start text-left"
                      >
                        <MapPin className="w-3 h-3 mr-2" />
                        <span className="truncate">{stop.name}, {stop.city}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Departures List */}
              {selectedStop && (departures || loading) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Abfahrten von {selectedStop.name}, {selectedStop.city}
                    </h3>
                    {lastUpdated && (
                      <span className="text-sm text-gray-500">
                        Aktualisiert: {lastUpdated}
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-600">Lade Abfahrten...</span>
                    </div>
                  ) : departures?.departures.length ? (
                    <div className="space-y-3">
                      {departures.departures.map((departure, index) => {
                        const uniqueId = `departure-${selectedStop?.id}-${index}-${departure.arrivalTimeRelative}-${departure.line}-${departure.direction}`;
                        return (
                          <DepartureCard 
                            key={uniqueId}
                            departure={departure}
                            selectedStop={selectedStop}
                            uniqueId={uniqueId}
                            expandedDepartures={expandedDepartures}
                            formatExactTime={formatExactTime}
                            toggleDepartureExpansion={toggleDepartureExpansion}
                          />
                        );
                      })}
                      
                      {/* Weitere Abfahrten Button */}
                      {departures && departures.departures.length > 0 && (
                        <div className="text-center mt-4">
                          <Button
                            onClick={loadMoreDepartures}
                            disabled={loadingMore}
                            variant="outline"
                            className="w-full flex items-center gap-2"
                          >
                            {loadingMore ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                            {loadingMore ? 'Lade...' : `Weitere Abfahrten laden (${departureCount + 10})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : departures ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTime 
                        ? `Keine Abfahrten ab ${searchTime} Uhr verfügbar`
                        : 'Keine Abfahrten verfügbar'
                      }
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <RouteSearch stops={stops} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 