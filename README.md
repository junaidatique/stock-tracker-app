# Stock Tracker Web Application

A full-stack web application for tracking stock index values, setting price‐threshold alerts, and receiving email notifications when thresholds are breached.

---

## Features

- **User Authentication**: Sign up / Sign in using Firebase Authentication  
- **Index Search**: Search for stock/ETF/index tickers via the Polygon.io reference API  
- **Intraday Charts**: View intraday price data (1-minute bars) using Twelve Data's free time_series endpoint  
- **Ticker Details**: See overview metadata (name, market, exchange, etc.) and price chart for a selected symbol  
- **Threshold Alerts**: Create one-shot thresholds (above/below price) and receive an email when breached  
- **Threshold Management**: List all user thresholds, see enabled/disabled status, delete thresholds  
- **Automated Scheduler**: Cron job checks enabled thresholds every 5 minutes, enqueues email via Firebase Trigger-Email extension, disables after firing  

---

## Tech Stack

- **Backend**: NestJS, TypeScript, Firebase Functions  
- **Database & Auth**: Firebase Auth, Firestore  
- **Email Notifications**: Firebase Trigger-Email extension (SendGrid)  
- **APIs**: Polygon.io (ticker search & overview), Twelve Data (intraday bars)  
- **Frontend**: Next.js, React, Tailwind CSS, Recharts  

---

## Prerequisites

- Node.js v18.x  
- npm 9.x  
- A Firebase project with:  
  - Authentication enabled  
  - Firestore database  
  - Functions (2nd-gen or 1st-gen)  
  - Trigger-Email extension installed (configured for a `mail` collection)  
- API keys for:  
  - Twelve Data (`TIME_SERIES` endpoint)  
  - Polygon.io (Reference & Overview endpoints)  

---

## Installation & Setup

### Backend (NestJS / Firebase Functions)

1. Navigate to the backend functions folder:  
   ```bash
   cd backend
   ```

2.	Install dependencies:   
```
npm install
```
3. Run the development server:
```
npm run start:dev
```

### Frontend (Next.js)
1.	Navigate to the frontend folder:
```
cd frontend
```
2. Install Dependencies
```
npm install
```
3. Run the development server:
```
npm run dev
```
### Configuration
-	Firebase Functions config: set via firebase functions:config:set apis.*
-	Trigger-Email: ensure the extension is installed and uses the mail collection
-	NestJS ConfigModule: pulls TWELVEDATA_API_KEY and POLYGON_API_KEY from process.env

### Usage
1. Sign Up / Sign In via the Next.js UI
2. Dashboard:
    -	Search for tickers
    -	Click a ticker to view details
    -	View & delete existing thresholds
3. Details Page:
    -	See ticker overview & intraday chart
    -	Click Create Threshold to set a price alert
4. Threshold Scheduler (backend):
    -	Runs every 5 minutes
    -	Enqueues emails on breach
    -	Disables thresholds after firing

