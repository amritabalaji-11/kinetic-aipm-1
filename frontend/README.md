# Kinetic Frontend

React + Tailwind project for the Kinetic app.

## Getting started

cd frontend
npm install
npm run dev

## Folder structure

components/ - things that are reused across multiple pages like NavBar and buttons
pages/      - one file per screen in the app
hooks/      - shared logic that multiple pages need
services/   - all the API calls to the backend go here
types/      - shared data shapes used across the app

## Naming

- pages are PascalCase with Page at the end e.g. ProfilePage.jsx
- components are PascalCase e.g. NavBar.jsx
- hooks start with use e.g. useVideoUpload.js
- services are camelCase e.g. authService.js

## Branching

always branch off dev, never commit to main directly
branch format: feat/your-feature-name
open a PR to dev when your work is ready