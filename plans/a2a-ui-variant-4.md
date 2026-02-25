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
- Task Input (was der Benutzer eingegeben hat)
- Status (pending/proposed/running/completed)

#### Proposed Actions Node

Erscheint nach Server-Antwort (entspricht Variant 3 Proposed Actions)

- Liste der vorgeschlagenen Aktionen
- Approve/Reject Buttons für jede Aktion

#### Executing Node

Während der Ausführung

- Aktuelle Aktion
- Fortschrittsbalken
- Cancel Button

#### History Node

Chain der ausgeführten Schritte

- Liste der abgeschlossenen Aktionen
- Zeitstempel

#### Result Node

Endergebnis

- Zusammenfassung
- "New Task" Button

### 5. VueForm Integration

Formulare für:

- Task Input (Textfeld für Aufgabenbeschreibung)
- Approve/Reject Formulare für Proposed Actions
- Settings Formular

## Workflow

### 1. Idle State

- Header sichtbar mit Project/Session Dropdowns
- VueFlow Canvas leer oder mit vorherigen Nodes
- Floating Panel zeigt "New Task" Button

### 2. Task Request

- Benutzer gibt Task im Floating Panel ein
- Klick auf "Send" sendet Anfrage an Server
- Server antwortet mit vorgeschlagenen Aktionen

### 3. Proposed State (nach Server-Antwort)

- **Neue Node auf VueFlow Canvas**: Proposed Actions Node
- Inhalt entspricht Variant 3 Proposed Actions Sektion
- Benutzer kann Approve/Reject klicken

### 4. Running State

- Neue Node: Executing Node mit Fortschrittsbalken
- Server sendet Updates (Continue #1, #2...)
- History Node wird erstellt/aktualisiert

### 5. Completed State

- Neue Node: Result Node mit Endergebnis
- Option für neue Aufgabe

## Technische Details

- **VueFlow**: @vue-flow/core, @vue-flow/background, @vue-flow/controls
- **VueForm**: @vueform/vueform oder vueform-builder
- **State Management**: Lokales State Management oder Pinia
- **Kommunikation**: WebSocket oder HTTP für Server-Kommunikation

## Visuelles Layout

```
+----------------------------------------------------------+
| [Project: ___v] [Session: ___v]  [New Task] [Connect]   |
+----------------------------------------------------------+
|                    |                                      |
|   FLOATING PANEL   |         VUEFLOW CANVAS              |
|   (resizable,      |                                      |
|    draggable)      |    +-------+    +-------+           |
|                    |    | Task  |----|Proposed|          |
|   [Task Input]     |    | Node  |    | Actions|          |
|   [Send]           |    +-------+    +-------+           |
|                    |         |           |                |
|                    |         v           v                |
|                    |    +--------+   +----------+         |
|                    |    |Executing|  | History  |         |
|                    |    +--------+   +----------+         |
|                    |         |                            |
|                    |         v                            |
|                    |    +--------+                        |
|                    |    | Result |                        |
|                    |    +--------+                        |
+----------------------------------------------------------+
```

## Unterschiede zu Variant 3

| Aspekt | Variant 3 | Variant 4 |
|--------|-----------|-----------|
| Canvas | Kein Canvas | VueFlow Canvas |
| Nodes | Nur HTML Sektionen | Dynamische VueFlow Nodes |
| Interaktion | Buttons in Sektionen | Klick auf Nodes öffnet Panel |
| Formulare | HTML Forms | VueForm Komponenten |
| Layout | Alle Sektionen sichtbar | Floating Panel + Canvas |
