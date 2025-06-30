# Wartefrei - VVO Transit Dashboard

Ein Echtzeit-Dashboard für den Verkehrsverbund Oberelbe (VVO) mit aktuellen Abfahrten und Verbindungsinformationen.

## Features

🚍 **Echtzeitabfahrten** - Aktuelle Abfahrtszeiten für Dresden und Umgebung  
🚋 **Multi-Modal** - Unterstützung für Straßenbahn, Bus, S-Bahn und Metro  
🕒 **Live-Updates** - Automatische Aktualisierung der Abfahrtszeiten  

## Tech Stack

- **Vite** - Build Tool
- **React 19** - Frontend Framework  
- **TypeScript** - Type Safety
- **TailwindCSS 4** - Styling
- **Shadcn/ui** - UI Components
- **VVO API** - Echtzeit-Verkehrsdaten

## Installation

```bash
# Projekt klonen
git clone <repository-url>
cd wartefrei

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

## API Integration

Das Dashboard nutzt die VVO Widgets API für Echtzeit-Verkehrsdaten. Bei CORS-Problemen wird automatisch auf Mock-Daten zurückgegriffen.

## Verwendung

1. **Haltestelle auswählen** - Verwende das Dropdown-Menü
2. **Abfahrten anzeigen** - Automatische Anzeige der nächsten Abfahrten
3. **Aktualisieren** - Klicke auf "Aktualisieren" für neue Daten
4. **Verbindungen** - Tab für zukünftige Routenplanung

## Entwicklung

```bash
# Entwicklungsserver
npm run dev

# Build für Produktion
npm run build

# Linting
npm run lint
```

## Roadmap

- [ ] Verbindungssuche zwischen Haltestellen
- [ ] Favoriten-Haltestellen
- [ ] Karten-Integration
- [ ] Störungsmeldungen

## Lizenz

MIT License
