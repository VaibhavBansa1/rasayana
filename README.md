# [Rasāyana (Recipe App)](https://github.com/VaibhavBansa1/rasayana#:~:text=Ras%C4%81yana%20(Recipe%20App))

## Overview

A recipe recommendation app that helps users discover and share recipes.

## Key Features

- Recipe recommendations based on user preferences
- Voice-enabled recipe search
- Push notifications for recipe updates
- Payment integration for Purchasing Food (No real payment only demo)

## Tech Stack

- Frontend: React Native/Expo
- Backend: Django REST Framework, LangChain
- Database: SQLite
- APIs: Razorpay, Gemini API

## Installation

### Prerequisites

- Node.js 22+
- Python 3.12+
- Expo 52

### Frontend Setup

```bash
cd RecipeApp/food-app
npm install
cp google-services.example.json google-services.json  # Configure your Google services file
```

app.json  # Configure your app settings

### Backend Setup

```bash
cd RecipeBackend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
```

## Configuration

1. Set up required API keys in .env file
2. Configure google-services.json for Firebase
3. Set up Razorpay credentials
