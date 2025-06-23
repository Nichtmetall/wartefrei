import { useState, useEffect } from 'react';
import { Search, MapPin, X, Star, Heart, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vvoApi, type VVOStop } from '@/lib/vvo-api';
import { cookieManager } from '@/lib/cookies';

interface StopSearchProps {
  onStopSelect: (stop: VVOStop) => void;
  selectedStop?: VVOStop | null;
}

export default function StopSearch({ onStopSelect, selectedStop }: StopSearchProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VVOStop[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [favorites, setFavorites] = useState<VVOStop[]>([]);
  const [searchHistory, setSearchHistory] = useState<VVOStop[]>([]);
  const [showHistoryAndFavorites, setShowHistoryAndFavorites] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Load favorites and history on mount
  useEffect(() => {
    setFavorites(cookieManager.getFavorites());
    setSearchHistory(cookieManager.getSearchHistory());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-search-dropdown]')) {
        setShowHistoryAndFavorites(false);
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStops = async () => {
      if (query.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        // Don't automatically show history/favorites - only on manual click
        return;
      }

      setShowHistoryAndFavorites(false);
      setIsSearching(true);
      setSearchResults([]); // Clear old results first
      try {
        const results = await vvoApi.findStops(query);
        setSearchResults(results.slice(0, 8)); // Limitiere auf 8 Ergebnisse
        setShowResults(true);
      } catch (error) {
        console.error('Fehler bei der Haltestellensuche:', error);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchStops, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleStopSelect = (stop: VVOStop) => {
    onStopSelect(stop);
    cookieManager.addToSearchHistory(stop);
    setSearchHistory(cookieManager.getSearchHistory());
    setQuery('');
    setShowResults(false);
    setSearchResults([]);
    setShowHistoryAndFavorites(false);
  };

  const clearSelection = () => {
    onStopSelect(null as any); // Clear the selected stop in parent
    setQuery('');
    setShowResults(false);
    setSearchResults([]);
    setShowHistoryAndFavorites(false);
  };

  const toggleFavorite = (stop: VVOStop, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (cookieManager.isFavorite(stop.id)) {
      cookieManager.removeFromFavorites(stop.id);
    } else {
      const success = cookieManager.addToFavorites(stop);
      if (!success) {
        alert('Maximal 5 Favoriten erlaubt!');
        return;
      }
    }
    
    setFavorites(cookieManager.getFavorites());
  };

  const clearHistory = () => {
    cookieManager.clearSearchHistory();
    setSearchHistory([]);
  };

  const handleInputClick = () => {
    setHasUserInteracted(true);
    if (query.length === 0) {
      setShowHistoryAndFavorites(!showHistoryAndFavorites);
      setShowResults(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Stop Display */}
      {selectedStop && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">{selectedStop.name}</p>
              <p className="text-sm text-blue-600">{selectedStop.city}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative" data-search-dropdown>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={handleInputClick}
            placeholder="Haltestelle suchen..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* History and Favorites Dropdown */}
        {hasUserInteracted && showHistoryAndFavorites && (favorites.length > 0 || searchHistory.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Favoriten ({favorites.length}/5)</span>
                    </div>
                  </div>
                </div>
                {favorites.map((stop) => (
                  <button
                    key={`fav-${stop.id}`}
                    onClick={() => handleStopSelect(stop)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{stop.name}</p>
                        <p className="text-sm text-gray-500">{stop.city}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => toggleFavorite(stop, e)}
                          className="p-1 h-6 w-6"
                        >
                          <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        </Button>
                        {stop.type && (
                          <Badge variant="outline" className="text-xs">
                            {stop.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* History Section */}
            {searchHistory.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Letzte Suchen</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="p-1 h-6 w-6 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {searchHistory.map((stop) => (
                  <button
                    key={`hist-${stop.id}`}
                    onClick={() => handleStopSelect(stop)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{stop.name}</p>
                        <p className="text-sm text-gray-500">{stop.city}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => toggleFavorite(stop, e)}
                          className="p-1 h-6 w-6"
                        >
                          <Heart 
                            className={`w-3 h-3 ${cookieManager.isFavorite(stop.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                          />
                        </Button>
                        {stop.type && (
                          <Badge variant="outline" className="text-xs">
                            {stop.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-5 h-5 animate-spin mx-auto mb-2" />
                Suche...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => handleStopSelect(stop)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{stop.name}</p>
                        <p className="text-sm text-gray-500">{stop.city}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => toggleFavorite(stop, e)}
                          className="p-1 h-6 w-6"
                        >
                          <Heart 
                            className={`w-3 h-3 ${cookieManager.isFavorite(stop.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                          />
                        </Button>
                        {stop.type && (
                          <Badge variant="outline" className="text-xs">
                            {stop.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-gray-500">
                <MapPin className="w-5 h-5 mx-auto mb-2 text-gray-300" />
                Keine Haltestellen gefunden
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {query.length === 0 && !selectedStop && (
        <div className="text-sm text-gray-500">
          Beginnen Sie mit der Eingabe um nach Haltestellen zu suchen
        </div>
      )}
    </div>
  );
} 