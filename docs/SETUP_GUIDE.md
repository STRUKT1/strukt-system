# Setup Guide

## Prerequisites

- Node.js 18 or higher
- npm package manager
- OpenAI API key
- Airtable account and API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/STRUKT1/strukt-system.git
cd strukt-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual API keys and configuration.

## Environment Configuration

Required environment variables:

```env
OPENAI_API_KEY=your-openai-api-key
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-airtable-base-id
PORT=3000
NODE_ENV=development
```

## Airtable Setup

1. Create a new Airtable base
2. Set up the required tables as described in `STRUKT_Airtable_Schema.md`
3. Copy your base ID and API key to the environment variables

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the port specified in your environment variables (default: 3000).

## Testing the Setup

1. Start the server
2. Send a test request to verify the API is working
3. Check that Airtable connections are functional
4. Verify OpenAI integration is responding

## Troubleshooting

### Common Issues

**OpenAI API errors:**
- Verify your API key is correct
- Check your OpenAI account has sufficient credits
- Ensure the model specified exists and is accessible

**Airtable connection issues:**
- Verify base ID and API key are correct
- Check table and field IDs match your Airtable schema
- Ensure API key has proper permissions

**Port conflicts:**
- Change the PORT environment variable if 3000 is in use
- Check for other services running on the same port