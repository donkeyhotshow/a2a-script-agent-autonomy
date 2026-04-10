"""
Utility Functions Module
"""

# Re-export from network.py for backwards compatibility
from .network import check_port_occupied
from .config import LOCAL_LLM_MODELS_DIR


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


def kill_ports(proxy_port: int, local_llm_upstream_port: int) -> bool:
    """Убивает процессы на указанных портах"""
    print(f"\nОчистка портов:")
    killed_any = False
    
    # Upstream port from LOCAL_LLM_UPSTREAM_URL
    from .local_llm_manager import get_local_llm_upstream_host_port
    local_llm_upstream_host, upstream_target_port = get_local_llm_upstream_host_port()

    ports_to_kill = [proxy_port]
    if upstream_target_port != proxy_port:
        ports_to_kill.append(upstream_target_port)
    
    for port in ports_to_kill:
        if kill_process_on_port(port):
            killed_any = True
    
    if killed_any:
        print(f"  Ports cleared!")
    else:
        print(f"  No processes were using the ports")
    
    return killed_any


def start_local_llm_upstream(local_llm_upstream_host: str, local_llm_upstream_port: int) -> bool:
    """
    Attempts to start local HTTP LLM via LOCAL_LLM_SERVE_CMD (shell string).
    """
    import os
    import shlex
    import subprocess
    import time

    if check_port_occupied(local_llm_upstream_host, local_llm_upstream_port):
        print(f"    Local LLM upstream already running on port {local_llm_upstream_port}")
        return True

    cmd = (os.environ.get('LOCAL_LLM_SERVE_CMD') or '').strip()
    if not cmd:
        print("    [X] LOCAL_LLM_SERVE_CMD is not set; cannot auto-start upstream")
        return False

    env = os.environ.copy()
    env['LOCAL_LLM_UPSTREAM_URL'] = f"http://localhost:{local_llm_upstream_port}"
    if LOCAL_LLM_MODELS_DIR:
        env['LOCAL_LLM_MODELS_DIR'] = LOCAL_LLM_MODELS_DIR
    try:
        print(f"    Attempting to start local LLM upstream on port {local_llm_upstream_port}...")
        if os.name == 'nt':
            subprocess.Popen(
                cmd,
                shell=True,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        else:
            args = shlex.split(cmd)
            subprocess.Popen(
                args,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        for _ in range(10):
            time.sleep(1)
            if check_port_occupied(local_llm_upstream_host, local_llm_upstream_port):
                print("    [OK] Local LLM upstream started successfully!")
                return True
        print("    [X] Could not start Local LLM upstream within 10 seconds")
        return False
    except Exception as e:
        print(f"    [X] Error starting Local LLM upstream: {e}")
        return False
