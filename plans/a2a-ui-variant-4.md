# A2A UI Variant 4 - VueFlow + VueForm Integration

## Konzept

Variant 4 kombiniert VueFlow Canvas mit VueForm auf einem benutzerdefinierten Floating Panel. Die UI zeigt eine Header-Leiste mit notwendigen Buttons und einen VueFlow-Canvas, auf dem dynamisch Nodes erscheinen.

## Komponenten

### 1. Header (oben)

- **Project Dropdown**: Auswahl des Projekts
- **Session Dropdown**: Auswahl der Session
- **Buttons**:
  - "New Task" - neue Aufgabe erstellen
  - "Connect" - mit Server verbinden
  - "Debug Mode" - Debug-Panel umschalten
  - "Settings" - Einstellungen

### 2. VueFlow Canvas (Hauptbereich)

- Hintergrund mit Grid
- Zoom/Pan Steuerung
- Nodes werden dynamisch hinzugefügt bei Server-Antworten

### 3. Floating Panel (Task Panel)

- **Position**: Rechts oder links vom Canvas, als schwebendes Panel
- **Drag & Drop**: Das Panel kann verschoben werden
- **Resize**: Das Panel kann in der Größe angepasst werden

### 4. Node-Typen auf VueFlow Canvas

#### Task Node
Zeigt die aktuelle Aufgabe
- Task ID
- Task Input
- Status

#### Proposed Actions Node
- Liste der vorgeschlagenen Aktionen
- Approve/Reject Buttons

#### Executing Node
- Aktuelle Aktion
- Fortschrittsbalken
- Cancel Button

#### History Node
- Liste der abgeschlossenen Aktionen
- Zeitstempel

#### Result Node
- Zusammenfassung
- "New Task" Button

### 5. VueForm Integration
Formulare für Task Input, Approve/Reject, Settings

## Workflow

### 1. Idle State
- Header sichtbar mit Project/Session Dropdowns
- VueFlow Canvas leer oder mit vorherigen Nodes

### 2. Task Request
- Benutzer gibt Task ein
- Server antwortet mit vorgeschlagenen Aktionen

### 3. Proposed State
- Neue Node: Proposed Actions Node

### 4. Running State
- Neue Node: Executing Node mit Fortschrittsbalken

### 5. Completed State
- Neue Node: Result Node

## Technische Details

- **VueFlow**: @vue-flow/core
- **VueForm**: @vueform/vueform
- **State Management**: Lokales State Management oder Pinia
- **Kommunikation**: HTTP (REST API)

## Unterschiede zu Variant 3

| Aspekt | Variant 3 | Variant 4 |
|--------|-----------|-----------|
| Canvas | Kein Canvas | VueFlow Canvas |
| Nodes | Nur HTML Sektionen | Dynamische VueFlow Nodes |
