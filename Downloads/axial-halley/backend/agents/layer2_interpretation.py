from typing import List, Dict
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class TaskUnderstandingAgent(BaseAgent):
    """
    Agent 2: Task Understanding Agent
    Responsibility: Build an internal reasoning-path model.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "TaskUnderstandingAgent", event_bus)
        self.current_task_context = None

    def setup_subscriptions(self):
        # In a full impl, this might listen for "New Task" signals or significant context shifts
        # For now, we'll assume it runs once on startup or when explicitly triggered
        pass

    async def analyze_task(self, task_description: str):
        """
        Analyzes the task and emits a TASK_MODEL event.
        """
        # Mock logic for task decomposition
        model = {
            "checkpoints": ["setup", "implementation", "verification"],
            "assumptions": ["environment is python", "internet is available"],
            "failure_modes": ["syntax_error", "logic_error", "timeout"]
        }
        self.current_task_context = model
        self.log("Task model generated.")
        await self.publish(EventType.TASK_MODEL, model)


class MistakeAnalysisAgent(BaseAgent):
    """
    Agent 3: Mistake & Pattern Analysis Agent
    Responsibility: Detect instability patterns from observation events.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "MistakeAnalysisAgent", event_bus)
        self.recent_observations: List[Dict] = []

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.OBSERVATION_EVENT, self.handle_observation)

    async def handle_observation(self, event: Event):
        obs = event.payload
        self.recent_observations.append(obs)
        
        # Simple Logic: Detect "rapid_undo"
        # If last 3 events are edits in same location within short time -> Instability
        if len(self.recent_observations) >= 3:
            last_3 = self.recent_observations[-3:]
            signals = [o['signal'] for o in last_3]
            
            if signals == ['edit', 'undo', 'edit']:
                pattern = {
                    "pattern": "oscillation_detected",
                    "location": last_3[0]['location'],
                    "supporting_events": [o['event_id'] for o in last_3]
                }
                self.log(f"Pattern Detected: {pattern['pattern']}")
                await self.publish(EventType.PATTERN_SIGNAL, pattern)
                self.recent_observations = [] # Reset buffer after detection
