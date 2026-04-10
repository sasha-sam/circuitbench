from abc import ABC, abstractmethod
from typing import List
from backend.core.event_bus import EventBus, Event, EventType

class BaseAgent(ABC):
    def __init__(self, agent_id: str, name: str, event_bus: EventBus):
        self.agent_id = agent_id
        self.name = name
        self.event_bus = event_bus
        self.setup_subscriptions()

    @abstractmethod
    def setup_subscriptions(self):
        """Register the agent's specific event listeners."""
        pass

    async def publish(self, type: EventType, payload: dict):
        """Helper to publish events from this agent."""
        event = Event(
            type=type,
            source=self.name,
            payload=payload
        )
        await self.event_bus.publish(event)

    def log(self, message: str):
        """Internal logging helper."""
        print(f"[{self.name}] {message}")
