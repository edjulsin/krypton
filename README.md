# Krypton — Real-Time Crypto Trading Dashboard

Krypton is a high-performance, real-time crypto trading dashboard inspired by TradingView-style charting systems.  
It is built to explore **reactive data flows**, **custom chart rendering**, and **low-latency UI updates** using modern front-end architecture.

<p align="center">
  <img src="./src/assets/images/screenshots/1.gif" alt="Krypton multi-chart" width="60%">
  <br>
  <br>
  <img src="./src//assets/images/screenshots/3.gif" alt="Krpton book chart" width="60%">
</p>

**Tech Stack:** React, RxJS, D3.js, HTML5 Canvas, Webpack

🌐 Live Demo: https://krypton-navy.vercel.app/  

---

## Motivation

Many trading dashboards struggle with performance when handling high-frequency real-time data, especially when built using traditional state management approaches.

Krypton was built to explore:
- How **reactive programming (RxJS)** can simplify complex live data flows
- How to render **high-performance charts** beyond standard SVG-only approaches
- How to design reusable UI primitives for data-heavy applications
- How **D3.js** can be used for dragging, zooming, and scaling across different chart types and time zones

---

## Key Features

- 📈 **Real-Time Charting**
  - Live price updates powered by reactive data streams
  - Smooth UI updates with minimal unnecessary re-renders
  - D3-powered drag and zoom for detailed data inspection
  - High-resolution Canvas-based chart rendering suitable for screenshots

- ⚡ **Reactive Data Architecture**
  - Market data modeled as RxJS observables
  - Clear separation between data processing and presentation layers

- 🎨 **Custom UI Components**
  - High-performance color picker built from scratch
  - Lightweight popup and overlay system

- 🌍 **Multi-Timezone Support**
  - Accurate time-axis handling for global markets

- 📱 **Responsive Design**
  - Optimized for desktop and tablet screen sizes

---

## Architecture Overview

Krypton is designed around a **data-first architecture**, where data flow and rendering concerns are clearly separated.

### 1. Reactive Data Layer (RxJS)
- Market data is modeled as observable streams
- Streams are composed, filtered, and throttled before reaching the UI
- This approach avoids deeply nested state logic and reduces UI complexity

### 2. Lazy Rendering
- Only data points visible on screen are rendered
- This approach is more effective than relying solely on avoiding re-renders

### 3. Optimized Canvas Rendering
- At maximum zoom-out levels, hundreds or thousands of data points may be visible simultaneously
- When data points become visually indistinguishable, rectangle-based candle objects are dynamically simplified into line representations
- This significantly improves rendering performance without noticeable visual degradation

### 4. Shared State Management
- A large amount of shared state can have a minor performance impact but significantly reduce code readability
- Introducing a centralized state solution (e.g. React Context or a state management library) would improve maintainability and scalability for future development

---
