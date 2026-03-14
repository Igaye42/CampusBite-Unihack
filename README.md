# 🍽️ CampusBite AI

**Hyper-Local Food Waste Rescue Network**

## 1. Project Overview

CampusBite is an AI-powered peer-to-peer platform designed exclusively for university campuses. It predicts food surplus and matches needs in real-time to reduce landfill waste. By processing visual data through an LLM, it automates the creation of structured food listings and uses client-side matching logic to connect providers with consumers instantly.

## 2. Tech Stack (Hackathon MVP)

- **Frontend:** React Native (Expo)
- **Backend:** Firebase Firestore
- **AI Integration:** Google Gemini Vision API

## 3. Core Features & Architecture

### 3.1 Image Upload & AI Extraction

- **What it does:** Captures a photo of leftover food and sends it to the Gemini API to instantly extract structured, database-ready parameters.
- **Features:** Forces the LLM to output strict JSON. Limits detection to predefined categories (pizza, sandwich, pastries, rice/noodle box, salad, drinks).
- **Example flow:** 1. Provider snaps a photo. 2. App sends to Gemini. 3. API invisibly returns: `{"type": "sandwich", "estimated_qty": 5, "safety_risk": false}`.

### 3.2 Listing Generation & Tagging

- **What it does:** Displays AI-extracted data for a quick review, allowing the provider to append specific attributes before writing to the database.
- **Features:** Uses basic boolean toggles for dietary constraints. Auto-calculates pickup deadline (+2 hours from upload).
- **Example flow:** 1. Provider reviews "Sandwich, Qty: 5". 2. Taps "Vegetarian" toggle. 3. Taps "Post Listing". App writes a single document to Firestore `listings`.

### 3.3 Decision-Oriented Feed (Smart Matching)

- **What it does:** Retrieves active listings and presents them to consumers, executing hard filters on dietary constraints and ranking the remainder.
- **Features:** Fetches items where `status == 'available'`. Calculates distance client-side (Haversine formula). Sorts purely by distance and time-to-expiry.
- **Example flow:** 1. Consumer opens feed and sets preference to "Vegetarian". 2. Feed hides meat items and displays: "Sandwich — 200m away — Expires in 1h 45m".

### 3.4 Atomic Claim & Verification

- **What it does:** Executes a state change when a consumer selects an item, locking the database entry to prevent simultaneous claims.
- **Features:** Generates a 4-digit random alphanumeric string upon a successful Firestore transaction instead of complex QR codes.
- **Example flow:** 1. Consumer taps "Claim". 2. Firestore transaction sets status to `claimed`. 3. App displays: "Claim Successful. Show code: X7B2". Item disappears from other feeds.

### 3.5 Clickstream Logging & Impact Dashboard

- **What it does:** Records successful claims as discrete event logs to track platform impact without complex database aggregations.
- **Features:** Appends a lightweight document to a `metrics_log` collection per claim. The dashboard reads these logs.
- **Example flow:** 1. Consumer claims an item. 2. App silently writes `+1 meal saved` to the database. 3. Dashboard updates: "Total Meals Rescued: 125".
