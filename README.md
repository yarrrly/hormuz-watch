# 🔴 Hormuz Watch

Real-time dashboard tracking the 2026 Strait of Hormuz crisis.

**Live:** Coming soon

## What is this?

Following US-Israel strikes on Iran (Feb 28, 2026), IRGC effectively closed the Strait of Hormuz — blocking ~20% of global oil supply. Hormuz Watch tracks the crisis in real-time and shows you how it affects YOUR fuel prices.

## Features

- ⏱️ **Ticking counters** — Blocked barrels, oil value, Brent crude price
- 🗺️ **Live vessel map** — Real AIS data showing tankers in the Strait
- 💰 **Personal Impact Calculator** — See projected fuel price increase for your country
- 📰 **News ticker** — Latest crisis developments

## Tech Stack

- **Frontend:** Next.js (static export) on Cloudflare Pages
- **Backend:** Cloudflare Workers + Durable Objects
- **Data:** aisstream.io (AIS), Twelve Data (oil prices), Upstash Redis (cache)

## Data Sources

- AIS vessel positions via [aisstream.io](https://aisstream.io)
- Brent crude oil prices via [Twelve Data](https://twelvedata.com)

---

*Built during a crisis. Speed over perfection.*
