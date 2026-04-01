'use client';
import { useQueryState, parseAsString, parseAsBoolean } from 'nuqs';

/**
 * Centralised URL state hook (Part 6 — nuqs).
 * All state is reflected in the URL so that deep-links work and
 * browser back/forward navigate the UI correctly.
 */
export function useAppState() {
  const [selectedProject, setSelectedProject] = useQueryState(
    'project',
    parseAsString.withDefault('proj_001')
  );
  const [selectedSession, setSelectedSession] = useQueryState(
    'session',
    parseAsString.withDefault('')
  );
  const [rightTab, setRightTab] = useQueryState(
    'rtab',
    parseAsString.withDefault('taskflow')
  );
  const [bottomTab, setBottomTab] = useQueryState(
    'btab',
    parseAsString.withDefault('terminal')
  );
  const [preflightOpen, setPreflightOpen] = useQueryState(
    'preflight',
    parseAsBoolean.withDefault(false)
  );
  const [validationOpen, setValidationOpen] = useQueryState(
    'validation',
    parseAsBoolean.withDefault(false)
  );
  const [steeringOpen, setSteeringOpen] = useQueryState(
    'steering',
    parseAsBoolean.withDefault(false)
  );
  const [artifactInspector, setArtifactInspector] = useQueryState(
    'artifact',
    parseAsString.withDefault('')
  );

  return {
    selectedProject,
    setSelectedProject,
    selectedSession,
    setSelectedSession,
    rightTab,
    setRightTab,
    bottomTab,
    setBottomTab,
    preflightOpen,
    setPreflightOpen,
    validationOpen,
    setValidationOpen,
    steeringOpen,
    setSteeringOpen,
    artifactInspector,
    setArtifactInspector,
  };
}
