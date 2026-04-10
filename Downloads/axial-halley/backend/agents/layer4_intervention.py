from typing import List, Dict
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class SuggestionGenerationAgent(BaseAgent):
    """
    Agent 7: Suggestion Generation Agent
    Responsibility: Propose minimal, non-spoiling interventions.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "SuggestionGenerationAgent", event_bus)
        self.domain = "Software"

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.HYPOTHESIS, self.handle_hypothesis)
        self.event_bus.subscribe(EventType.DOMAIN_CONFIGURED, self.handle_domain)

    async def handle_domain(self, event: Event):
        self.domain = event.payload.get("domain", "Software")

    async def handle_hypothesis(self, event: Event):
        # Generate suggestion if hypothesis is strong enough
        if event.payload.get("confidence") > 0.5:
            
            intervention_text = ""
            if self.domain == "Hardware":
                intervention_text = "Check grounding connections and apply a low-pass filter."
            elif self.domain == "Biology":
                intervention_text = "Re-check reagent dates and incubate control group."
            elif self.domain == "Chemistry":
                intervention_text = "Calibrate the heating mantle and stir rate."
            else:
                intervention_text = "Suggest user breaks down the async function."

            # Mock Suggestion Logic
            proposal = {
                 "hypothesis_id": event.payload.get("id"),
                 "intervention": intervention_text,
                 "strength": "low",
                 "timing": "immediate"
            }
            self.log(f"Proposed Intervention ({self.domain}): {proposal['intervention']}")
            await self.publish(EventType.INTERVENTION_PROPOSAL, proposal)

class InterventionExperimentAgent(BaseAgent):
    """
    Agent 8: Intervention Experiment Agent
    Responsibility: Design controlled experiments around interventions.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "InterventionExperimentAgent", event_bus)

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.INTERVENTION_PROPOSAL, self.handle_proposal)

    async def handle_proposal(self, event: Event):
        # Design Experiment
        plan = {
            "intervention_id": f"int_{event.payload.get('hypothesis_id')}",
            "variable_changed": "guidance_message",
            "control_reference": "no_action"
        }
        self.log("Experiment Plan Created")
        await self.publish(EventType.EXPERIMENT_PLAN, plan)

class ExperimentControllerAgent(BaseAgent):
    """
    Agent 9: Experiment Controller Agent
    Responsibility: Execution gatekeeper.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "ExperimentControllerAgent", event_bus)

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.EXPERIMENT_PLAN, self.handle_plan)

    async def handle_plan(self, event: Event):
        # Approve and Execute
        # In real system, this checks rate limits and user policy
        self.log("Experiment Approved. Executing...")
        
        # Simulate Execution Result
        result = {
            "experiment_id": event.payload.get("intervention_id"),
            "outcome": "positive",
            "details": "User adopted the suggestion."
        }
        await self.publish(EventType.EXPERIMENT_RESULT, result)
