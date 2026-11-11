# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## PhishGuard MLX model service

The web application does not contain placeholder predictions. URL and email classification require the separate Python/FastAPI service and trained model artifacts described in [`ml-service/README.md`](ml-service/README.md). Install its dependencies with `pip install -r ml-service/requirements.txt`, train it with reviewed, labeled datasets, then configure `VITE_PHISHGUARD_API_URL` to its HTTPS base URL. Until both models are available, the interface reports the unavailable state and refuses to show a verdict.

The service never opens submitted URLs or email attachments. Scan history is kept in the current browser and can be exported or cleared from the app.
