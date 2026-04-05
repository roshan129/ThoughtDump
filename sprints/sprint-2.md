# Sprint 2 — AI Integration (Core Feature)

## Goal

Turn thoughts → generated content

## Stories

### 2.1 OpenAI Integration
- Setup API service
- Create function:
  - `generateContent(input, tone, format)`

### 2.2 Prompt Engineering
Create structured prompt:
- Input: user thought
- Output:
  - 3 tweet variations
  - 1 thread

### 2.3 API Endpoint
- Create backend route:
  - `/api/generate`

### 2.4 Connect UI to API
- On click:
  - send request
  - show loading state

### 2.5 Error Handling
- API failure UI
- Retry option

## Acceptance Criteria
- User writes thought → gets outputs
- Loading + error states handled
