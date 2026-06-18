This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Audio explanations (Male/Female TTS)

This project can generate and store male and female audio explanations for each question. Audio is generated on-demand via OpenAI TTS and stored in a Supabase Storage bucket, then the question row is updated with the audio URL.

Requirements:
- Environment: set `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
- Supabase storage bucket (public): `question-explanations`.
- Database columns:

```sql
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS male_explanation_audio_url text,
ADD COLUMN IF NOT EXISTS female_explanation_audio_url text;
```

Admin endpoint:
- `POST /api/admin/questions/:id/voice` with JSON body `{ "voice": "male" | "female" }`
  - Returns `{ success: true, url, voice }`
  - Generates missing explanation text if needed, synthesizes TTS, uploads to storage, and updates the question row.

UI:
- In admin question list, use the “Play Female” and “Play Male” buttons to generate (if needed) and play the audio.

Provider:
- OpenAI is used for both explanation text and TTS (voices).

OpenAI TTS voice customization (optional):
- `OPENAI_TTS_VOICE_FEMALE` (default: `coral`)
- `OPENAI_TTS_VOICE_MALE` (default: `onyx`)