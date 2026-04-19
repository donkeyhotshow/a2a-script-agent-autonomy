"""Lightweight dependency-injection container."""
from typing import Any, Callable, Dict, Optional, Type, TypeVar

T = TypeVar("T")


class Container:
    """Simple synchronous DI container."""

    def __init__(self) -> None:
        self._factories: Dict[str, Callable[[], Any]] = {}
        self._singletons: Dict[str, Any] = {}

    def register(self, name: str, factory: Callable[[], Any], singleton: bool = True) -> None:
        self._factories[name] = factory
        if not singleton:
            self._singletons.pop(name, None)

    def resolve(self, name: str) -> Any:
        if name in self._singletons:
            return self._singletons[name]
        if name not in self._factories:
            raise KeyError(f"DI: no factory registered for '{name}'")
        instance = self._factories[name]()
        self._singletons[name] = instance
        return instance


# Global container instance
container = Container()
