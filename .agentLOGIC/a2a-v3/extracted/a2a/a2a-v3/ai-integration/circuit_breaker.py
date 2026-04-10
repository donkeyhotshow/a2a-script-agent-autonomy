import time, threading

class CircuitBreaker:
    CLOSED = "CLOSED"      # всё ок, пропускаем запросы
    OPEN   = "OPEN"        # слишком много ошибок, блокируем
    HALF   = "HALF_OPEN"   # пробуем один запрос

    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.state = self.CLOSED
        self.failures = 0
        self.threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.opened_at = None
        self._lock = threading.Lock()

    def call(self, fn, *args, **kwargs):
        with self._lock:
            if self.state == self.OPEN:
                if time.time() - self.opened_at > self.recovery_timeout:
                    self.state = self.HALF
                else:
                    raise RuntimeError("circuit_open: Ollama недоступна, повтор через 60s")

        try:
            result = fn(*args, **kwargs)
            with self._lock:
                self.failures = 0
                self.state = self.CLOSED
            return result
        except Exception as e:
            with self._lock:
                self.failures += 1
                if self.failures >= self.threshold:
                    self.state = self.OPEN
                    self.opened_at = time.time()
            raise e

    def status(self):
        return {"state": self.state, "failures": self.failures}
