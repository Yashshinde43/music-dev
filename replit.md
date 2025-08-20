# Overview

QR Jukebox is a real-time collaborative music voting application that allows users to scan QR codes to join music playlists and vote on songs. The system consists of an admin dashboard for playlist management and a public voting interface accessible via QR codes. Built with React, Express, and PostgreSQL, it features live updates through WebSocket connections and integrates with iTunes API for music search.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React-based SPA** with Vite as the build tool and development server
- **shadcn/ui component library** providing a comprehensive set of UI components built on Radix UI primitives
- **TailwindCSS** for styling with a dark theme configuration and CSS custom properties
- **React Router (Wouter)** for client-side routing with separate routes for admin dashboard and user voting
- **TanStack Query** for server state management, caching, and API communication
- **React Hook Form** with Zod validation for form handling and input validation

## Backend Architecture
- **Express.js server** serving both API endpoints and static assets
- **Modular route structure** with separate handlers for admin authentication, playlist management, and public voting endpoints
- **WebSocket server** for real-time updates using the `ws` library, enabling live vote counts and playlist changes
- **Session-based authentication** for admin users with PostgreSQL session storage
- **iTunes Search API integration** for music discovery and metadata retrieval

## Data Storage Solutions
- **PostgreSQL database** with Neon serverless driver for cloud deployment
- **Drizzle ORM** for type-safe database operations and schema management
- **Five main entities**: admins, playlists, songs, votes, and user sessions
- **UUID primary keys** with proper foreign key relationships and cascade deletes
- **Database migrations** managed through Drizzle Kit for schema versioning

## Authentication and Authorization
- **Admin-only authentication** using username/password with bcrypt hashing
- **Unique admin codes** for QR code generation and playlist access
- **Anonymous user sessions** tracked by randomly generated user IDs
- **Session persistence** in PostgreSQL with automatic cleanup of inactive sessions
- **Route protection** ensuring only authenticated admins can access management features

## External Dependencies
- **Neon Database** for serverless PostgreSQL hosting
- **iTunes Search API** for music search and metadata (no API key required)
- **QR Code generation** using the `qrcode` library for creating scannable playlist access codes
- **WebSocket connections** for real-time communication between admin dashboard and voting clients
- **Replit integration** with development banner and runtime error handling for the Replit environment

The architecture supports horizontal scaling through stateless API design and WebSocket connection management, with all persistent state stored in the PostgreSQL database.