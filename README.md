# Crossword Generate+

## Environment

Local and mobile builds should use:

```env
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

Do not put `OPENAI_API_KEY` in the Vite client `.env`.

## Vercel setup

Add this server-side environment variable in your Vercel project:

```env
OPENAI_API_KEY=your_openai_key
```

This app now expects Vercel to host the `/api/generate` function, which securely calls OpenAI on the server.
