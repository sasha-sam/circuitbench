import asyncio
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel


from backend.core.event_bus import EventBus, Event, EventType
from backend.agents.layer1_observation import ObservationAgent
from backend.agents.layer2_interpretation import TaskUnderstandingAgent, MistakeAnalysisAgent
from backend.agents.layer3_hypothesis import HypothesisGenerationAgent, LiteratureDiscoveryAgent, ResearchSummarizationAgent
from backend.agents.layer4_intervention import SuggestionGenerationAgent, InterventionExperimentAgent, ExperimentControllerAgent
from backend.agents.layer5_governance import EvaluationAgent, CriticAgent, MetaScientistAgent
from backend.agents.layer8_memory import MemoryAgent

app = FastAPI(title="AUTO-SCIENTIST API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React App (Static Files)
# This assumes 'frontend/dist' exists (created by Docker build)
from fastapi.staticfiles import StaticFiles
import os

if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")


# Global State
event_bus = EventBus()
agents = {}

@app.on_event("startup")
async def startup_event():
    global agents
    # Initialize all agents
    agents["memory"] = MemoryAgent("mem_1", event_bus)
    agents["observation"] = ObservationAgent("obs_1", event_bus)
    agents["task"] = TaskUnderstandingAgent("task_1", event_bus)
    agents["mistake"] = MistakeAnalysisAgent("mistake_1", event_bus)
    agents["hypothesis"] = HypothesisGenerationAgent("hyp_1", event_bus)
    agents["lit"] = LiteratureDiscoveryAgent("lit_1", event_bus)
    agents["research"] = ResearchSummarizationAgent("res_1", event_bus)
    agents["suggest"] = SuggestionGenerationAgent("sugg_1", event_bus)
    agents["experiment"] = InterventionExperimentAgent("exp_1", event_bus)
    agents["controller"] = ExperimentControllerAgent("ctrl_1", event_bus)
    agents["evaluation"] = EvaluationAgent("eval_1", event_bus)
    agents["critic"] = CriticAgent("critic_1", event_bus)
    agents["meta"] = MetaScientistAgent("meta_1", event_bus)
    
    # NEW AGENTS
    from backend.agents.layer6_research_vision import ResearchAgent, VisualReasoningAgent
    agents["research_assistant"] = ResearchAgent("res_assist_1", event_bus)
    agents["visual_reasoner"] = VisualReasoningAgent("vis_1", event_bus)

    print("All Agents Initialized and Subscribed.")

class ChatRequest(BaseModel):
    message: str

@app.post("/research/chat")
async def research_chat(req: ChatRequest):
    agent: ResearchAgent = agents["research_assistant"]
    result = await agent.chat_with_context(req.message)
    return result

class VisionRequest(BaseModel):
    domain: str
    image_data: str = "" # Placeholder for base64

@app.post("/vision/analyze")
async def vision_analyze(req: VisionRequest):
    agent: VisualReasoningAgent = agents["visual_reasoner"]
    result = await agent.analyze_frame(req.image_data, req.domain)
    
    # Broadcast findings
    await event_bus.publish(Event(
        type=EventType.INTERVENTION_PROPOSAL,
        source="visual_reasoner",
        payload={"intervention": result['suggestion'], "reasoning": result['analysis']}
    ))
    
    return result

class GenericEvent(BaseModel):
    type: str
    source: str
    payload: dict

@app.post("/event")
async def ingest_event(evt: GenericEvent):
    """
    Generic endpoint for ingesting manual logs or external signals.
    """
    print(f"RECEIVED EVENT: {evt.type} | PAYLOAD: {evt.payload}")
    await event_bus.publish(Event(
        type=evt.type,
        source=evt.source,
        payload=evt.payload
    ))
    return {"status": "Event Recorded"}

@app.get("/history")
async def get_history():
    """
    Retrieve full event history for telemetry display.
    """
    return event_bus.get_history()

class DomainConfig(BaseModel):
    domain: str

@app.post("/configure/domain")
async def configure_domain(config: DomainConfig):
    """
    Set the active research domain context.
    """
    print(f"Configuring Domain: {config.domain}")
    await event_bus.publish(Event(
        type=EventType.DOMAIN_CONFIGURED,
        source="user_onboarding",
        payload={"domain": config.domain}
    ))
    return {"status": "Domain Configured", "domain": config.domain}

class SimRequest(BaseModel):
    pass

@app.post("/simulate/user-mistake")
async def simulate_mistake(req: SimRequest = None):
    """
    Trigger a simulated sequence for demo purposes.
    """
    # ... existing logic if needed, or simple placeholder
    return {"status": "Simulation Triggered"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
