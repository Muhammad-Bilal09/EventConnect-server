# EventConnect Backend Server

Production API & Real-time Socket.IO server for EventConnect event staffing platform.

## Features
- **Authentication**: JWT token based authentication with password hashing (bcrypt).
- **Role-Based Access Control (RBAC)**: Strict role guards (`ADMIN`, `CLIENT`, `PROMOTER`).
- **Data Privacy Sanitization**: Automatic field masking so promoters cannot see private client phone/email, and clients cannot see private promoter contact details.
- **Temporary Event Groups**: Dedicated event-based group messaging powered by Socket.IO.
- **Geolocation Check-In**: Geofence radius validation (Haversine formula) for mobile check-in/out.
- **Event Lifecycle**: Auto group closure on event completion (read-only history preservation).
- **Two-Way Feedback**: Star ratings & text feedback between Clients and Promoters.

## Setup & Running

1. Install dependencies:
```bash
npm install
```

2. Database Migration & Seed:
```bash
npm run prisma:db:push
npm run seed
```

3. Start Development Server:
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

## Demo Test Credentials
- **ADMIN**: `admin@medialinks.com` / `password123`
- **CLIENT**: `client@abc.com` / `password123`
- **PROMOTER**: `muhammad@promoter.com` / `password123`
- **PROMOTER**: `ahmed@promoter.com` / `password123`
