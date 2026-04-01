"""
Utility Functions Module
"""

# Re-export from network.py for backwards compatibility
from .network import check_port_occupied
from .config import OLLAMA_MODELS


def get_pid_by_port(port: int):
    """Получает PID процесса, который слушает указанный порт"""
    import subprocess
    try:
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if __import__('os').name == 'nt' else 0
        )
        for line in result.stdout.split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 5:
                    return int(parts[-1])
    except Exception as e:
        print(f"    Error getting PID for port {port}: {e}")
    return None


def kill_process_on_port(port: int) -> bool:
    """Убивает процесс, который слушает указанный порт"""
    import subprocess
    pid = get_pid_by_port(port)
    if pid:
        try:
            subprocess.run(
                ['taskkill', '/F', '/PID', str(pid)],
                capture_output=True,
                creationflags=subprocess.CREATE_NO_WINDOW if __import__('os').name == 'nt' else 0
            )
            print(f"    [OK] Killed process {pid} on port {port}")
            return True
        except Exception as e:
            print(f"    [X] Error killing process on port {port}: {e}")
            return False
    else:
        print(f"    No process found on port {port}")
        return False


def kill_ports(proxy_port: int, ollama_port: int) -> bool:
    """Убивает процессы на указанных портах"""
    print(f"\nОчистка портов:")
    killed_any = False
    
    # Get ollama port from OLLAMA_HOST
    from .ollama_manager import get_ollama_host_port
    ollama_host, ollama_target_port = get_ollama_host_port()
    
    ports_to_kill = [proxy_port]
    if ollama_target_port != proxy_port:
        ports_to_kill.append(ollama_target_port)
    
    for port in ports_to_kill:
        if kill_process_on_port(port):
            killed_any = True
    
    if killed_any:
        print(f"  Ports cleared!")
    else:
        print(f"  No processes were using the ports")
    
    return killed_any


def start_ollama(ollama_host: str, ollama_port: int) -> bool:
    """
    Attempts to start Ollama server automatically
    Returns True if Ollama was started successfully
    """
    import subprocess
    import time
    
    # First check if Ollama is already running on the target port
    if check_port_occupied(ollama_host, ollama_port):
        print(f"    Ollama already running on port {ollama_port}")
        return True
    
    # Check if maybe Ollama is already running on default port
    if ollama_port != 11434 and check_port_occupied(ollama_host, 11434):
        print(f"    Ollama might be running on default port 11434 instead of {ollama_port}")
        print(f"    Please set OLLAMA_HOST=http://localhost:11434 or stop that Ollama instance")
        return False
    
    import os
    default_port = 11434
    if ollama_port != default_port:
        # Need to set custom host/port for Ollama
        env = os.environ.copy()
        env['OLLAMA_HOST'] = f"http://localhost:{ollama_port}"
        if OLLAMA_MODELS:
            env['OLLAMA_MODELS'] = OLLAMA_MODELS
        try:
            print(f"    Attempting to start Ollama on port {ollama_port}...")
            # Start Ollama in background
            subprocess.Popen(
                ['ollama', 'serve'],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            # Wait for Ollama to start
            for i in range(10):
                time.sleep(1)
                if check_port_occupied(ollama_host, ollama_port):
                    print(f"    [OK] Ollama started successfully!")
                    return True
            print(f"    [X] Could not start Ollama within 10 seconds")
            return False
        except Exception as e:
            print(f"    [X] Error starting Ollama: {e}")
            return False
    else:
        # Default port - try to start Ollama normally
        try:
            print(f"    Attempting to start Ollama...")
            env = os.environ.copy()
            if OLLAMA_MODELS:
                env['OLLAMA_MODELS'] = OLLAMA_MODELS
            subprocess.Popen(
                ['ollama', 'serve'],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            # Wait for Ollama to start
            for i in range(10):
                time.sleep(1)
                if check_port_occupied(ollama_host, ollama_port):
                    print(f"    [OK] Ollama started successfully!")
                    return True
            return False
        except Exception as e:
            print(f"    [X] Error starting Ollama: {e}")
            return False
