import { type VVOStop } from './vvo-api';

// Cookie names
const SEARCH_HISTORY_COOKIE = 'vvo_search_history';
const FAVORITES_COOKIE = 'vvo_favorites';
const ROUTE_HISTORY_COOKIE = 'vvo_route_history';

// Cookie expiry (30 days)
const COOKIE_EXPIRY_DAYS = 30;

interface RouteHistory {
  id: string;
  origin: VVOStop;
  destination: VVOStop;
  searchedAt: string;
}

// Utility functions for cookie management
export class CookieManager {
  
  // Set cookie with expiry
  private setCookie(name: string, value: string, days: number = COOKIE_EXPIRY_DAYS): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  // Get cookie value
  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Search History Management
  getSearchHistory(): VVOStop[] {
    const cookie = this.getCookie(SEARCH_HISTORY_COOKIE);
    if (!cookie) return [];
    
    try {
      return JSON.parse(decodeURIComponent(cookie));
    } catch {
      return [];
    }
  }

  addToSearchHistory(stop: VVOStop): void {
    let history = this.getSearchHistory();
    
    // Remove if already exists (to move to front)
    history = history.filter(s => s.id !== stop.id);
    
    // Add to front
    history.unshift(stop);
    
    // Keep only last 10 searches
    history = history.slice(0, 10);
    
    this.setCookie(SEARCH_HISTORY_COOKIE, encodeURIComponent(JSON.stringify(history)));
  }

  clearSearchHistory(): void {
    this.setCookie(SEARCH_HISTORY_COOKIE, '', -1);
  }

  // Favorites Management
  getFavorites(): VVOStop[] {
    const cookie = this.getCookie(FAVORITES_COOKIE);
    if (!cookie) return [];
    
    try {
      return JSON.parse(decodeURIComponent(cookie));
    } catch {
      return [];
    }
  }

  addToFavorites(stop: VVOStop): boolean {
    let favorites = this.getFavorites();
    
    // Check if already favorited
    if (favorites.some(f => f.id === stop.id)) {
      return false;
    }
    
    // Check max limit
    if (favorites.length >= 5) {
      return false;
    }
    
    favorites.push(stop);
    this.setCookie(FAVORITES_COOKIE, encodeURIComponent(JSON.stringify(favorites)));
    return true;
  }

  removeFromFavorites(stopId: string): void {
    let favorites = this.getFavorites();
    favorites = favorites.filter(f => f.id !== stopId);
    this.setCookie(FAVORITES_COOKIE, encodeURIComponent(JSON.stringify(favorites)));
  }

  isFavorite(stopId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(f => f.id === stopId);
  }

  // Route History Management
  getRouteHistory(): RouteHistory[] {
    const cookie = this.getCookie(ROUTE_HISTORY_COOKIE);
    if (!cookie) return [];
    
    try {
      return JSON.parse(decodeURIComponent(cookie));
    } catch {
      return [];
    }
  }

  addToRouteHistory(origin: VVOStop, destination: VVOStop): void {
    let history = this.getRouteHistory();
    
    const routeId = `${origin.id}-${destination.id}`;
    
    // Remove if already exists (to move to front)
    history = history.filter(r => r.id !== routeId);
    
    // Add to front
    history.unshift({
      id: routeId,
      origin,
      destination,
      searchedAt: new Date().toISOString()
    });
    
    // Keep only last 8 route searches
    history = history.slice(0, 8);
    
    this.setCookie(ROUTE_HISTORY_COOKIE, encodeURIComponent(JSON.stringify(history)));
  }

  clearRouteHistory(): void {
    this.setCookie(ROUTE_HISTORY_COOKIE, '', -1);
  }
}

// Export singleton instance
export const cookieManager = new CookieManager(); 