# Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
# Generated: 2026-03-03T20:10:27.778Z

from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ExecutionContext:
    action: str
    step: str
    progress: Dict[str, Any]

@dataclass
class FormChoice:
    id: str
    label: str
    description: str
    icon: str
    variant: str  # Literal['primary', 'secondary', 'danger', 'success']

@dataclass
class FormInput:
    name: str
    type: str  # Literal['text', 'textarea', 'select', 'checkbox', 'radio', 'number']
    label: str
    placeholder: str
    required: bool
    options: List[Dict[str, Any]]

@dataclass
class Request:
    requestId: str
    sessionId: str
    action: str
    context: Dict[str, Any]
    result: "ActionKeyShape"

@dataclass
class HistoryEntry:
    step: str
    action: str
    timestamp: str
    result: Dict[str, Any]

@dataclass
class Response:
    requestId: str
    sessionId: str
    status: str  # Literal['processing', 'completed', 'error', 'waiting']
    execute: "ActionKeyShape"
    context: Dict[str, Any]
    message: str

@dataclass
class ExecuteScript:
    script: Dict[str, Any]

@dataclass
class ExecuteReadFile:
    readFile: Dict[str, Any]

@dataclass
class ExecuteWriteFile:
    writeFile: Dict[str, Any]

@dataclass
class ExecuteRagSearch:
    ragSearch: Dict[str, Any]

@dataclass
class ExecuteCommand:
    executeCommand: Dict[str, Any]

@dataclass
class ExecuteForm:
    form: Dict[str, Any]

@dataclass
class ExecuteMessage:
    message: str

@dataclass
class ResultScript:
    script: Dict[str, Any]

@dataclass
class ResultReadFile:
    readFile: Dict[str, Any]

@dataclass
class ResultWriteFile:
    writeFile: Dict[str, Any]

@dataclass
class ResultRagSearch:
    ragSearch: Dict[str, Any]

@dataclass
class ResultExecuteCommand:
    executeCommand: Dict[str, Any]

@dataclass
class ResultChoice:
    choice: str

@dataclass
class ResultMessage:
    message: str


# Type aliases
ProtocolRequest = Request
ProtocolResponse = Response
ProtocolMessage = Union[Request, Response]
