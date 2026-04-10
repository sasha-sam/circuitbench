import asyncio
import time
from typing import Dict, List, Callable, Awaitable, Any
from pydantic import BaseModel, Field
from enum import Enum
import uuid

class EventType(str, Enum):
    # Layer 1: Observation
    OBSERVATION_EVENT = "observation_event"
    
    # Layer 2: Interpretation
    TASK_MODEL = "task_model"
    PATTERN_SIGNAL = "pattern_signal"
    
    # Layer 3: Hypothesis
    HYPOTHESIS = "hypothesis"
    PAPER_REFERENCE = "paper_reference"
    RESEARCH_SUMMARY = "research_summary"
    
    # Layer 4: Intervention Idea
    INTERVENTION_PROPOSAL = "intervention_proposal"
    
    # Layer 5: Experimentation
    EXPERIMENT_PLAN = "experiment_plan"
    
    # Layer 6: Execution (Result)
    EXPERIMENT_RESULT = "experiment_result" # Result from the experiment execution
    
    # Layer 7: Governance (Eval)
    EVAL_RESULT = "eval_result"
    CRITIC_FEEDBACK = "critic_feedback"
    
    # Layer 8: Policy
    POLICY_UPDATE = "policy_update"
    DOMAIN_CONFIGURED = "domain_configured"
    
    # System
    SYSTEM_LOG = "system_log"
    ERROR = "error"
    USER_OBSERVATION = "user_observation"

from typing import Dict, List, Callable, Awaitable, Any, Union

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Union[EventType, str] # Relaxed validation
    source: str
    payload: Dict[str, Any]
    timestamp: float = Field(default_factory=time.time)

    class Config:
        use_enum_values = True

# Type alias for event handlers
EventHandler = Callable[[Event], Awaitable[None]]

class EventBus:
    def __init__(self):
        self.subscribers: Dict[EventType, List[EventHandler]] = {}
        self._history: List[Event] = []

    def subscribe(self, event_type: EventType, handler: EventHandler):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)

    async def publish(self, event: Event):
        self._history.append(event)
        if event.type in self.subscribers:
            # Run handlers concurrently
            tasks = [handler(event) for handler in self.subscribers[event.type]]
            if tasks:
                await asyncio.gather(*tasks)

    def get_history(self) -> List[Event]:
        return self._history
