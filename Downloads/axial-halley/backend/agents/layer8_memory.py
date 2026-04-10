from typing import Dict, Any, List
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class MemoryAgent(BaseAgent):
    """
    Agent 13: Memory & State Agent
    Responsibility: Persist structured state across time.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "MemoryAgent", event_bus)
        self.state: Dict[str, Any] = {
            "mistake_patterns": {},
            "policies": {},
            "experiments": [],
            "hypotheses": {}
        }

    def setup_subscriptions(self):
        # Listen to everything that needs persisting
        self.event_bus.subscribe(EventType.PATTERN_SIGNAL, self.handle_pattern)
        self.event_bus.subscribe(EventType.POLICY_UPDATE, self.handle_policy_update)
        self.event_bus.subscribe(EventType.EXPERIMENT_RESULT, self.handle_experiment_result)
        self.event_bus.subscribe(EventType.DOMAIN_CONFIGURED, self.handle_domain)

    async def handle_domain(self, event: Event):
        domain = event.payload.get("domain")
        self.state["domain_context"] = domain
        self.log(f"Domain Context Executed: {domain}")

    async def handle_pattern(self, event: Event):
        pattern = event.payload.get("pattern")
        if pattern:
            count = self.state["mistake_patterns"].get(pattern, 0)
            self.state["mistake_patterns"][pattern] = count + 1
            self.log(f"Updated pattern count: {pattern} -> {count + 1}")

    async def handle_policy_update(self, event: Event):
        strategy = event.payload.get("strategy")
        status = event.payload.get("status")
        if strategy:
            self.state["policies"][strategy] = status
            self.log(f"Policy updated: {strategy} -> {status}")

    async def handle_experiment_result(self, event: Event):
        self.state["experiments"].append(event.payload)
        self.log(f"Experiment result stored. Total experiments: {len(self.state['experiments'])}")

    def get_state(self):
        return self.state
