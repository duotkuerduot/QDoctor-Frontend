# QDoctor AI - Mental Health Professional Assistant

A specialized Next.js frontend for the QDoctor Mental Health AI platform, providing a supportive and evidence-based chat experience.

## Overview

QDoctor AI is a modern healthcare interface that connects to a dedicated Mental Health Orchestrator. Unlike generic chatbots, this frontend is specifically configured to handle validated medical context, suicide/self-harm safety filters, and real-time local context retrieval.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **UI Library**: React with shadcn/ui
- **Styling**: Tailwind CSS
- **API Communication**: Next.js Route Handlers (Edge-ready)

## Features

### Current Features

- **Mental Health Specialized Chat**: Designed with high-empathy UI for sensitive consultations.
- **RAG Integration**: Communicates with a FastAPI backend to pull context from 9,000+ verified medical chunks.
- **Intent Validation**: Frontend handles and displays specific fallback states when queries are flagged as non-mental health related.
- **Responsive Design**: Fully optimized for mobile and desktop support.
- **Dark/Light Theme**: Accessible UI for different user preferences.

### Component Structure

- **Navigation**: Site header, app sidebar with document navigation
- **Chat**: Chat input with textarea and message display
- **UI Components**: Reusable button, input, dropdown, avatar, tooltip components
- **Layout**: Responsive layout with sidebar navigation


## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/           # Next.js app router pages and API routes
├── components/    # Reusable React components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
└── provider/      # Context providers (theme, etc.)
types/            # TypeScript type definitions
public/           # Static assets
```

## Development

Make sure you have Node.js 18+ installed. Install dependencies and run the development server to start working on the project.