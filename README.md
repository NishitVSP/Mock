# Mock Market Data Stream

A TypeScript application that simulates mock data streams using MQTT protocol. This application generates mock market data for financial instruments and publishes it to an MQTT broker.

## Features

- Multi-threaded data processing using Node.js worker threads
- MQTT-based real-time mock data streaming
- Robust error handling and automatic reconnection
- Type-safe implementation

## Prerequisites

- Node.js (v16 or higher)
- MQTT Broker 
- Yarn or npm package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mock
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

## Usage

1. Build the project:
```bash
yarn build
# or
npm run build
```

2. Start the application:
```bash
yarn start
# or
npm start
```

## Project Structure

```
├── config/             # Configuration files
├── services/          # Service implementations
├── workers/           # Worker thread implementations
├── utils/            # Utility functions
├── test/             # Test files
├── index.ts          # Main application entry
├── package.json      # Project dependencies
└── tsconfig.json     # TypeScript configuration
```

## MQTT Topics

The application publishes market data to the following topic structure:
```
mock/<exchange>/<tokenNumber>
```
