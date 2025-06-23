import * as dvb from 'dvbjs';

// Erweiterte TypeScript Interfaces basierend auf dvbjs
export interface VVOStop {
    id: string;
    name: string;
    city: string;
    coords: [number, number];
    type?: string;
}

export interface VVODeparture {
    id: string;
    line: string;
    direction: string;
    platform?: {
        name: string;
        type: string;
    };
    arrivalTime: Date;
    scheduledTime: Date;
    arrivalTimeRelative: number;
    scheduledTimeRelative: number;
    delayTime: number;
    state: string;
    mode?: {
        title: string;
        name: string;
        iconUrl?: string;
    };
    diva?: {
        number: string;
        network: string;
    };
}

export interface VVOStopDepartures {
    stop: VVOStop;
    departures: VVODeparture[];
    updated: string;
}

// Route Planning Interfaces
export interface VVOLocation {
    id: string;
    name: string;
    city: string;
    coords: [number, number];
}

export interface VVOTrip {
    departure?: {
        id: string;
        name: string;
        city: string;
        coords: [number, number];
        platform?: {
            name: string;
            type: string;
        };
        time: Date;
        type: string;
    };
    arrival?: {
        id: string;
        name: string;
        city: string;
        coords: [number, number];
        platform?: {
            name: string;
            type: string;
        };
        time: Date;
        type: string;
    };
    duration: number;
    interchanges: number;
    nodes: Array<{
        line: string;
        direction: string;
        duration: number;
        mode?: {
            title: string;
            name: string;
        };
        departure?: {
            name: string;
            time: Date;
            platform?: {
                name: string;
                type: string;
            };
        };
        arrival?: {
            name: string;
            time: Date;
            platform?: {
                name: string;
                type: string;
            };
        };
    }>;
}

export interface VVORoute {
    origin?: VVOLocation;
    destination?: VVOLocation;
    trips: VVOTrip[];
}

class VVOApiService {
    // Suche nach Haltestellen mit dvbjs
    async findStops(query: string): Promise<VVOStop[]> {
        try {
            const results = await dvb.findStop(query);

            return results
                .map((stop: any) => ({
                    id: stop.id,
                    name: stop.name,
                    city: stop.city,
                    coords: [stop.coords[0], stop.coords[1]] as [number, number],
                    type: stop.type
                }))
                .sort((a, b) => {
                    const queryLower = query.toLowerCase();
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();

                    // Exakte Treffer zuerst
                    if (nameA === queryLower && nameB !== queryLower) return -1;
                    if (nameB === queryLower && nameA !== queryLower) return 1;

                    // Treffer am Anfang des Namens haben Priorität
                    const startsWithA = nameA.startsWith(queryLower);
                    const startsWithB = nameB.startsWith(queryLower);
                    if (startsWithA && !startsWithB) return -1;
                    if (startsWithB && !startsWithA) return 1;

                    // Bevorzuge Haltestellen in Dresden
                    if (a.city === 'Dresden' && b.city !== 'Dresden') return -1;
                    if (b.city === 'Dresden' && a.city !== 'Dresden') return 1;

                    // Bevorzuge bestimmte Haltestellentypen
                    const typeOrder: { [key: string]: number } = {
                        'Stop': 1,
                        'Station': 2,
                        'Address': 3,
                        'POI': 4
                    };
                    const orderA = typeOrder[a.type || ''] || 5;
                    const orderB = typeOrder[b.type || ''] || 5;
                    if (orderA !== orderB) return orderA - orderB;

                    // Alphabetische Sortierung als Fallback
                    return a.name.localeCompare(b.name);
                });
        } catch (error) {
            console.error('Fehler beim Suchen von Haltestellen:', error);
            return [];
        }
    }

    // Hole Abfahrten für eine Haltestelle mit dvbjs
    async getDepartures(stopId: string, limit: number = 10, offset: number = 0): Promise<VVOStopDepartures | null> {
        try {
            const departures = await dvb.monitor(stopId, offset, limit);

            if (!departures || departures.length === 0) {
                return null;
            }

            // Hole Stop-Informationen
            const stops = await this.getPopularStops();
            const stop = stops.find(s => s.id === stopId) || {
                id: stopId,
                name: stopId,
                city: 'Dresden',
                coords: [0, 0] as [number, number]
            };

            // Erst sortieren, dann eindeutige IDs zuweisen
            const sortedDepartures = departures
                .map((departure: any) => ({
                    originalId: departure.id,
                    line: departure.line,
                    direction: departure.direction,
                    platform: departure.platform,
                    arrivalTime: departure.arrivalTime,
                    scheduledTime: departure.scheduledTime,
                    arrivalTimeRelative: departure.arrivalTimeRelative,
                    scheduledTimeRelative: departure.scheduledTimeRelative,
                    delayTime: departure.delayTime,
                    state: departure.state,
                    mode: departure.mode,
                    diva: departure.diva
                }))
                .sort((a, b) => {
                    // Sortiere primär nach arrivalTimeRelative (nächste Abfahrt zuerst)
                    const timeA = a.arrivalTimeRelative || 0;
                    const timeB = b.arrivalTimeRelative || 0;
                    if (timeA !== timeB) {
                        return timeA - timeB;
                    }

                    // Sekundär nach Liniennummer (numerisch dann alphabetisch)
                    const lineA = a.line || '';
                    const lineB = b.line || '';
                    const numA = parseInt(lineA);
                    const numB = parseInt(lineB);

                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }

                    return lineA.localeCompare(lineB);
                });

            // Jetzt eindeutige IDs nach der Sortierung zuweisen
            const formattedDepartures: VVODeparture[] = sortedDepartures
                .map((departure: any, index: number) => ({
                    id: `departure-${stopId}-${index}-${departure.line || 'unknown'}-${(departure.direction || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}-${departure.arrivalTimeRelative || 0}`,
                    line: departure.line,
                    direction: departure.direction,
                    platform: departure.platform,
                    arrivalTime: departure.arrivalTime,
                    scheduledTime: departure.scheduledTime,
                    arrivalTimeRelative: departure.arrivalTimeRelative,
                    scheduledTimeRelative: departure.scheduledTimeRelative,
                    delayTime: departure.delayTime,
                    state: departure.state,
                    mode: departure.mode,
                    diva: departure.diva
                }));

            return {
                stop,
                departures: formattedDepartures,
                updated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Fehler beim Laden der Abfahrten:', error);
            return null;
        }
    }

    // Routenplanung mit dvbjs
    async findRoute(
        origin: string,
        destination: string,
        time?: Date,
        isArrivalTime: boolean = false
    ): Promise<VVORoute | null> {
        try {
            const routes = await dvb.route(origin, destination, time, isArrivalTime);

            if (!routes || !routes.trips || routes.trips.length === 0) {
                return null;
            }

            return {
                origin: routes.origin ? {
                    id: routes.origin.id,
                    name: routes.origin.name,
                    city: routes.origin.city,
                    coords: [routes.origin.coords[0], routes.origin.coords[1]] as [number, number]
                } : undefined,
                destination: routes.destination ? {
                    id: routes.destination.id,
                    name: routes.destination.name,
                    city: routes.destination.city,
                    coords: [routes.destination.coords[0], routes.destination.coords[1]] as [number, number]
                } : undefined,
                trips: routes.trips
                    .map((trip: any) => ({
                        departure: trip.departure,
                        arrival: trip.arrival,
                        duration: trip.duration,
                        interchanges: trip.interchanges,
                        nodes: trip.nodes || []
                    }))
                    .sort((a, b) => {
                        // Sortiere primär nach Abfahrtszeit (frühere Abfahrten zuerst)
                        if (a.departure?.time && b.departure?.time) {
                            return new Date(a.departure.time).getTime() - new Date(b.departure.time).getTime();
                        }

                        // Sekundär nach Fahrtdauer (kürzere Fahrten zuerst)
                        if (a.duration !== b.duration) {
                            return a.duration - b.duration;
                        }

                        // Tertiär nach Anzahl Umstiege (weniger Umstiege zuerst)
                        return a.interchanges - b.interchanges;
                    })
            };
        } catch (error) {
            console.error('Fehler bei der Routensuche:', error);
            return null;
        }
    }

    // Hole Linien für eine Haltestelle mit dvbjs
    async getLines(stopId: string): Promise<any[]> {
        try {
            const lines = await dvb.lines(stopId);
            return lines || [];
        } catch (error) {
            console.error('Fehler beim Laden der Linien:', error);
            return [];
        }
    }

    // Linienverlauf für eine spezifische Linie ermitteln
    async getLineRoute(
        currentStopId: string,
        line: string,
        direction: string,
        currentTime?: Date
    ): Promise<Array<{
        name: string;
        city?: string;
        arrival?: Date;
        departure?: Date;
        platform?: string;
        isCurrent: boolean;
    }> | null> {
        try {
            // Schritt 1: Endhaltestelle ermitteln via dvb.findStop
            const destinationStops = await dvb.findStop(direction);
            if (!destinationStops || destinationStops.length === 0) {
                console.warn(`Keine Endstation für "${direction}" gefunden`);
                return null;
            }

            // Bevorzuge Stops in Dresden mit exaktem Namen
            let destinationStop = destinationStops.find(stop =>
                stop.name.toLowerCase() === direction.toLowerCase() &&
                stop.city === 'Dresden'
            );

            if (!destinationStop) {
                destinationStop = destinationStops[0]; // Fallback
            }

            // Schritt 2: Fahrtverlauf abrufen mit dvb.route
            const time = currentTime || new Date();
            const routes = await dvb.route(currentStopId, destinationStop.id, time, false);

            if (!routes || !routes.trips || routes.trips.length === 0) {
                console.warn(`Keine Route von ${currentStopId} nach ${destinationStop.id} gefunden`);
                return null;
            }

            // Schritt 3: Trip für die Linie filtern
            const matchingTrip = routes.trips.find(trip =>
                trip.nodes && trip.nodes.some(node => node.line === line)
            );

            if (!matchingTrip) {
                console.warn(`Kein Trip für Linie "${line}" gefunden`);
                return null;
            }

            // Schritt 4: Alle Stops aus trip.nodes[].stops auslesen
            const lineStops: Array<{
                name: string;
                city?: string;
                arrival?: Date;
                departure?: Date;
                platform?: string;
                isCurrent: boolean;
            }> = [];

            // Finde alle Nodes für unsere spezifische Linie (kann mehrere geben)
            const lineNodes = matchingTrip.nodes.filter(node => node.line === line);

            if (!lineNodes || lineNodes.length === 0) {
                console.warn(`Keine Nodes für Linie "${line}" gefunden`);
                return null;
            }

            // Alle Stops aus allen Nodes für diese Linie sammeln
            lineNodes.forEach((lineNode: any) => {
                if (lineNode.stops && lineNode.stops.length > 0) {
                    lineNode.stops.forEach((stop: any) => {
                        // Überprüfe, ob Stop bereits vorhanden ist (Duplikate vermeiden)
                        const existingStop = lineStops.find(existing => existing.name === stop.name);
                        if (!existingStop) {
                            lineStops.push({
                                name: stop.name,
                                city: stop.city || 'Dresden', // Stadt hinzufügen
                                arrival: stop.arrival ? new Date(stop.arrival) : undefined,
                                departure: stop.departure ? new Date(stop.departure) : undefined,
                                platform: stop.platform?.name, // Schritt 5: Platform ausgeben
                                isCurrent: stop.id === currentStopId
                            });
                        }
                    });
                }
            });

            if (lineStops.length === 0) {
                console.warn(`Keine Stops in den Nodes für Linie "${line}" gefunden`);
                return null;
            }

            // Sortiere Stops chronologisch nach Abfahrts-/Ankunftszeit
            lineStops.sort((a, b) => {
                const timeA = a.departure || a.arrival;
                const timeB = b.departure || b.arrival;

                if (!timeA && !timeB) return 0;
                if (!timeA) return 1;  // Stops ohne Zeit ans Ende
                if (!timeB) return -1;

                return timeA.getTime() - timeB.getTime();
            });

            // Markiere den aktuellen Stop korrekt als den ersten in der Reihenfolge
            const currentStopIndex = lineStops.findIndex(stop => stop.isCurrent);
            if (currentStopIndex > 0) {
                // Wenn der aktuelle Stop nicht am Anfang ist, schneide die Liste ab diesem Punkt ab
                return lineStops.slice(currentStopIndex);
            }

            return lineStops;

        } catch (error) {
            console.error('Fehler beim Laden des Linienverlaufs:', error);
            return null;
        }
    }

    // Hole beliebte Haltestellen
    async getPopularStops(): Promise<VVOStop[]> {
        try {
            // Verwende dvbjs um echte Haltestellen zu finden
            const stops = await Promise.all([
                this.findStops('Hauptbahnhof'),
                this.findStops('Postplatz'),
                this.findStops('Pirnaischer Platz'),
                this.findStops('Albertplatz'),
                this.findStops('Technische Universität')
            ]);

            const popularStops: VVOStop[] = [];

            stops.forEach(stopList => {
                if (stopList.length > 0) {
                    // Nimm den ersten Treffer von jeder Suche
                    popularStops.push(stopList[0]);
                }
            });

            // Fallback wenn dvbjs nicht funktioniert
            if (popularStops.length === 0) {
                return [
                    {
                        id: '33000113',
                        name: 'Dresden Hauptbahnhof',
                        city: 'Dresden',
                        coords: [13.732235, 51.040563],
                        type: 'Stop'
                    },
                    {
                        id: '33000037',
                        name: 'Postplatz',
                        city: 'Dresden',
                        coords: [13.738746, 51.050407],
                        type: 'Stop'
                    },
                    {
                        id: '33000028',
                        name: 'Pirnaischer Platz',
                        city: 'Dresden',
                        coords: [13.747314, 51.049542],
                        type: 'Stop'
                    },
                    {
                        id: '33000742',
                        name: 'Technische Universität',
                        city: 'Dresden',
                        coords: [13.720829, 51.025755],
                        type: 'Stop'
                    },
                    {
                        id: '33000109',
                        name: 'Albertplatz',
                        city: 'Dresden',
                        coords: [13.741579, 51.064463],
                        type: 'Stop'
                    }
                ];
            }

            return popularStops;
        } catch (error) {
            console.error('Fehler beim Laden der beliebten Haltestellen:', error);
            // Fallback zu statischen Daten
            return [
                {
                    id: '33000113',
                    name: 'Dresden Hauptbahnhof',
                    city: 'Dresden',
                    coords: [13.732235, 51.040563],
                    type: 'Stop'
                },
                {
                    id: '33000037',
                    name: 'Postplatz',
                    city: 'Dresden',
                    coords: [13.738746, 51.050407],
                    type: 'Stop'
                },
                {
                    id: '33000028',
                    name: 'Pirnaischer Platz',
                    city: 'Dresden',
                    coords: [13.747314, 51.049542],
                    type: 'Stop'
                },
                {
                    id: '33000742',
                    name: 'Technische Universität',
                    city: 'Dresden',
                    coords: [13.720829, 51.025755],
                    type: 'Stop'
                },
                {
                    id: '33000109',
                    name: 'Albertplatz',
                    city: 'Dresden',
                    coords: [13.741579, 51.064463],
                    type: 'Stop'
                }
            ];
        }
    }

    // Hilfsfunktion um Verkehrsmittel-Icons zu bekommen
    getModeIcon(mode?: { title: string; name: string }): string {
        if (!mode) return '🚌';

        const modeName = mode.name?.toLowerCase() || mode.title?.toLowerCase();
        switch (modeName) {
            case 'tram':
            case 'straßenbahn':
                return '🚋';
            case 'bus':
                return '🚌';
            case 'sbahn':
            case 's-bahn':
                return '🚆';
            case 'metro':
            case 'subway':
                return '🚇';
            default:
                return '🚌';
        }
    }

    // Hilfsfunktion um Verkehrsmittel-Farben zu bekommen
    getModeColor(mode?: { title: string; name: string }): string {
        if (!mode) return 'bg-gray-100 text-gray-800 border-gray-200';

        const modeName = mode.name?.toLowerCase() || mode.title?.toLowerCase();
        switch (modeName) {
            case 'tram':
            case 'straßenbahn':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'bus':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'sbahn':
            case 's-bahn':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'metro':
            case 'subway':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    // Hilfsfunktion um Zeit zu formatieren
    formatTime(minutes: number): string {
        if (minutes === 0) return 'sofort';
        if (minutes === 1) return 'in 1 min';
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return hours === 1 ? 'in 1 h' : `in ${hours} h`;
            }
            return `in ${hours}h ${remainingMinutes}min`;
        }
        return `in ${minutes} min`;
    }

    // Hilfsfunktion um Status-Farben zu bekommen
    getStateColor(state: string): string {
        switch (state?.toLowerCase()) {
            case 'intime':
            case 'pünktlich':
                return 'text-green-600';
            case 'delayed':
            case 'verspätet':
                return 'text-red-600';
            case 'early':
            case 'früh':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    }
}

export const vvoApi = new VVOApiService(); 