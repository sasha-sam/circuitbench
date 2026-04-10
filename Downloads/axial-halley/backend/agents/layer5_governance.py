from typing import List, Dict
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class EvaluationAgent(BaseAgent):
    """
    Agent 10: Evaluation & Measurement Agent
    Responsibility: Quantitatively measure outcomes.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "EvaluationAgent", event_bus)

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.EXPERIMENT_RESULT, self.handle_result)

    async def handle_result(self, event: Event):
        # Calculate Metrics
        # Mock Metric Calculation
        outcome = event.payload.get("outcome")
        score = 10 if outcome == "positive" else -5
        
        eval_data = {
            "experiment_id": event.payload.get("experiment_id"),
            "metrics": {
                "score": score,
                "time_to_correction_delta": -200 # ms
            }
        }
        self.log(f"Eval Complete. Score: {score}")
        await self.publish(EventType.EVAL_RESULT, eval_data)

class CriticAgent(BaseAgent):
    """
    Agent 11: Critic Agent
    Responsibility: Challenge weak logic and bias.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "CriticAgent", event_bus)

    def setup_subscriptions(self):
         self.event_bus.subscribe(EventType.EVAL_RESULT, self.handle_eval)

    async def handle_eval(self, event: Event):
        # Check if eval is biased
        # Mock Critic
        passed_checks = True
        if passed_checks:
            self.log("Critic Verification Passed.")
            # Could emit endorsement, but for now silence implies consent?
            # Or emit CRITIC_FEEDBACK to MetaScientist
            pass

class MetaScientistAgent(BaseAgent):
    """
    Agent 12: Meta-Scientist Agent (Primary Controller)
    Responsibility: Long-horizon governance and learning.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "MetaScientistAgent", event_bus)

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.EVAL_RESULT, self.handle_eval)

    async def handle_eval(self, event: Event):
        # Update Policy based on Eval
        metrics = event.payload.get("metrics")
        if metrics["score"] > 0:
            policy_update = {
                "strategy": "intervention_prompting",
                "status": "promoted",
                "scope": "global"
            }
            self.log("Promoting Strategy based on positive eval.")
            await self.publish(EventType.POLICY_UPDATE, policy_update)
        else:
            self.log("Strategy penalized.")
