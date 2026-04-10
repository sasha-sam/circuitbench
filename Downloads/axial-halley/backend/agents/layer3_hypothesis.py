import random
from typing import List
from backend.core.agent_base import BaseAgent
from backend.core.event_bus import EventBus, Event, EventType

class HypothesisGenerationAgent(BaseAgent):
    """
    Agent 4: Hypothesis Generation Agent
    Responsibility: Generate falsifiable explanations for observed instability.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "HypothesisGenerationAgent", event_bus)
        self.domain = "Software" # Default

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.PATTERN_SIGNAL, self.handle_pattern)
        self.event_bus.subscribe(EventType.DOMAIN_CONFIGURED, self.handle_domain)

    async def handle_domain(self, event: Event):
        self.domain = event.payload.get("domain", "Software")
        self.log(f"Switched reasoning context to: {self.domain}")

    async def handle_pattern(self, event: Event):
        pattern = event.payload.get("pattern")
        location = event.payload.get("location")
        
        # Domain-Aware Reasoning
        hypothesis_claim = ""
        evidence_text = ""
        
        if self.domain == "Hardware":
             hypothesis_claim = f"Signal instability at {location} suggests possible ground loop or sensor noise."
             evidence_text = "Oscillatory signal readings"
        elif self.domain == "Biology":
             hypothesis_claim = f"Culture growth stagnation at {location} suggests nutrient depletion or contamination."
             evidence_text = "Plateau in optical density"
        elif self.domain == "Chemistry":
             hypothesis_claim = f"Reaction variance at {location} suggests uneven heating or catalyst degradation."
             evidence_text = "Inconsistent yield rates"
        else: # Software
             hypothesis_claim = f"User is oscillating at {location} because they lack knowledge of async/await patterns."
             evidence_text = "Repeated edits and undos"

        confidence = 0.85
        
        payload = {
            "id": f"hyp_{random.randint(1000, 9999)}",
            "claim": hypothesis_claim,
            "confidence": confidence,
            "evidence": [event.payload.get("supporting_events"), evidence_text]
        }
        
        self.log(f"Generated Hypothesis ({self.domain}): {hypothesis_claim}")
        await self.publish(EventType.HYPOTHESIS, payload)

class LiteratureDiscoveryAgent(BaseAgent):
    """
    Agent 5: Literature Discovery Agent
    Responsibility: Discover relevant academic research (Mocked).
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "LiteratureDiscoveryAgent", event_bus)

    def setup_subscriptions(self):
        self.event_bus.subscribe(EventType.HYPOTHESIS, self.handle_hypothesis)

    async def handle_hypothesis(self, event: Event):
        if event.payload.get("confidence") > 0.7:
             # Search for papers if hypothesis is confident
             # Mock Search
             paper = {
                 "citation": "Smith et al., 2024",
                 "topic": "Cognitive Load in Async Programming",
                 "url": "http://arxiv.org/abs/example"
             }
             self.log(f"Found paper: {paper['citation']}")
             await self.publish(EventType.PAPER_REFERENCE, paper)

class ResearchSummarizationAgent(BaseAgent):
    """
    Agent 6: Research Summarization Agent
    Responsibility: Extract actionable insights from research.
    """
    def __init__(self, agent_id: str, event_bus: EventBus):
        super().__init__(agent_id, "ResearchSummarizationAgent", event_bus)

    def setup_subscriptions(self):
         self.event_bus.subscribe(EventType.PAPER_REFERENCE, self.handle_paper)

    async def handle_paper(self, event: Event):
        # Mock Summarization
        summary = {
            "citation": event.payload.get("citation"),
            "finding": "Interventions that pause execution reduce error rates by 40%.",
            "limitations": "Tested only on novices.",
            "status": "validated"
        }
        self.log(f"Summarized paper: {summary['citation']}")
        await self.publish(EventType.RESEARCH_SUMMARY, summary)
