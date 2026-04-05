# Sprint 4 — Auth + Database

## Goal

Save user data

## Stories

### 4.1 Authentication
- Email/password OR Google login

### 4.2 Database Setup
- Use Supabase

### 4.3 Data Models

#### User
- `id`
- `email`

#### Thought
- `id`
- `user_id`
- `content`
- `created_at`

#### GeneratedContent
- `id`
- `thought_id`
- `content`
- `type` (tweet/thread)

### 4.4 Save Thoughts
- On generate:
  - store thought
  - store outputs

### 4.5 Fetch User Data
- Load past thoughts

## Acceptance Criteria
- User login works
- Data persists
