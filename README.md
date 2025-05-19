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
- EAS CLI

### Frontend Setup

```bash
cd RecipeApp/food-app
npm install
cp google-services.example.json google-services.json  # Configure your Google services file
```

### Backend Setup

```bash
cd RecipeBackend/food_recommendation_backend/
python3 -m venv .venv # Linux/Mac python -m venv .venv  # Windows
source .venv/bin/activate  # Linux/Mac .venv/Scripts/activate  # Windows
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
```

## Configuration

1. Set up required API keys in .env file
2. Configure google-services.json for Firebase
3. Configure your app.json settings
4. Set up Razorpay credentials

## Running the Application

### Start Backend Server

```bash
cd RecipeBackend/food_recommendation_backend
source .venv/bin/activate  # Linux/Mac
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

The Django backend will start at `http://localhost:8000`

### Configure Frontend API URL

Update the BASE_URL in your frontend:

```bash
cd RecipeApp/food-app/utils
```

Edit api.ts to point to your local Django server:

```typescript
export const BASE_URL = "http://localhost:8000";
```

### Start Frontend Development Server

```bash
cd RecipeApp/food-app
npx expo start
```

This will start the Expo development server and show a QR code. You can:

- Press 'a' - to open Android emulator
- Press 'i' - to open iOS simulator
- Scan QR code with Expo Go app on your physical device

### Testing the Setup

1. Verify Django backend:
   - Open `http://localhost:8000/api/` in your browser
   - You should see the Django REST framework API root

2. Verify Expo frontend:
   - The app should load in your emulator/device
   - You should be able to see the login screen
   - API requests should connect to your local backend

### Common Issues

1. If you get CORS errors:
   - Ensure Django CORS settings are configured properly
   - Check if BASE_URL is set correctly
   - Try using your machine's IP address instead of localhost

2. If Expo can't connect to Django:
   - Make sure both servers are running
   - Check if your device/emulator can access the Django URL
   - Verify network connectivity between device and backend

3. For Android Emulator:
   - Use `http://10.0.2.2:8000` as BASE_URL instead of localhost
