import asyncio
from typing import Dict, Any
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class ObservationAgent(BaseAgent):
    """
    Agent 1: Observation Agent
    Responsibility: Capture raw, factual signals from workspaces.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "ObservationAgent", event_bus)

    def setup_subscriptions(self):
        # Observation Agent is primarily an emitter, but might listen for system resets
        pass

    async def process_raw_signal(self, signal_data: Dict[str, Any]):
        """
        Public method to inject raw signals (e.g. from IDE hook).
        Validates and emits an OBSERVATION_EVENT.
        """
        # In a real system, this would listen to a socket or hook
        payload = {
             "event_id": signal_data.get("id"),
             "source": signal_data.get("source", "workspace"),
             "signal": signal_data.get("signal"),
             "location": signal_data.get("location"),
             "duration_ms": signal_data.get("duration_ms", 0),
             "timestamp": signal_data.get("timestamp")
        }
        
        self.log(f"Emitting observation: {payload['signal']}")
        await self.publish(EventType.OBSERVATION_EVENT, payload)
