#!/usr/bin/env tsx
import * as React from 'react';
import { render, Box, Text } from 'ink';
import { logger } from '../src/utils/logger.js';

const TUI = () => {
  const [sessions, setSessions] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Poll for active sessions or use WebSocket/P2P Relay
    const timer = setInterval(() => {
      // Fake refresh for POC
      setSessions(['sess_main', 'sess_agent_1', 'sess_verify_2']);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text color="cyan" bold>A2A Handler TUI Dashboard v2.5</Text>
      <Box flexDirection="row" marginTop={1}>
        <Box width="30%" flexDirection="column">
          <Text underline>Active Sessions</Text>
          {sessions.map(s => (
            <Text key={s}>• {s}</Text>
          ))}
        </Box>
        <Box width="70%" flexDirection="column" marginLeft={2}>
          <Text underline>Real-time Logs</Text>
          <Text dimColor>[GrayRoom] turn-1 completed</Text>
          <Text dimColor>[P2P] Peer relay active</Text>
          <Text color="yellow">[BugFixer] Found 2 potential issues</Text>
        </Box>
      </Box>
    </Box>
  );
};

render(<TUI />);
