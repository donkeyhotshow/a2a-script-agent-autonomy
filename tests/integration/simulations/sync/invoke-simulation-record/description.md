# invoke-simulation-record

Documents **`SimulationRequestProcessor`** **record** mode (`simulation_name` set, `replay` / `replay_mode` false): `handleNewSimulation` returns `execute.message` `Started simulation: <name>`.

Routing: `determineRequestType` selects `simulation` when `simulation_name` (or related flags) is present on the invoke context.
