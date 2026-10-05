# Negotiation Dojo

Negotiation Dojo is an Agentic AI sparring environment for practicing high-stakes negotiations such as salary discussions, insurance claims, and rent renewals. It features an adversarial counterpart agent, real-time coaching, and comprehensive post-session debriefs.

## Architecture

```mermaid
flowchart TD
    User([User])
    
    subgraph Frontend [Frontend (React + Vite + Zustand)]
        UI[Dojo UI]
        Chat[Chat Window]
        CoachPanel[Coach Panel]
        Debrief[Debrief Scorecard]
        Audio[Web Speech API Voice/Audio]
    end

    subgraph Backend [Backend (FastAPI + SQLite)]
        API[API Router]
        DB[(SQLite DB)]
        Knowledge[(Knowledge Base / Tactics)]
        
        subgraph Orchestration
            Orchestrator[Multi-Agent Orchestrator]
            Counterpart[Counterpart Agent]
            Coach[Coach Agent]
            DebriefAgent[Debrief Agent]
        end
        
        LLMLayer[LLM Client Interface]
    end

    subgraph Providers [LLM Providers]
        Anthropic[Anthropic API]
        OpenAI[OpenAI API]
        Mock[Mock LLM / Offline]
    end

    User <-->|HTTP / SSE| UI
    UI --> Chat
    UI --> CoachPanel
    UI --> Debrief
    UI <--> Audio

    Chat <-->|REST + SSE| API
    API <--> DB
    API --> Orchestrator
    
    Orchestrator --> Counterpart
    Orchestrator --> Coach
    Orchestrator --> DebriefAgent
    
    Counterpart <..> Knowledge
    
    Counterpart --> LLMLayer
    Coach --> LLMLayer
    DebriefAgent --> LLMLayer
    
    LLMLayer --> Anthropic
    LLMLayer --> OpenAI
    LLMLayer --> Mock