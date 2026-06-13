import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHome() {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>To Do API</title>
          <style>
            :root {
              color-scheme: light;
              --bg: #f6efe5;
              --panel: rgba(255, 255, 255, 0.82);
              --text: #1f2937;
              --muted: #5b6472;
              --accent: #c65d2e;
              --accent-dark: #9f451d;
              --ring: rgba(198, 93, 46, 0.18);
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              padding: 24px;
              font-family: Georgia, 'Times New Roman', serif;
              color: var(--text);
              background:
                radial-gradient(circle at top left, #ffe8c9 0%, transparent 32%),
                radial-gradient(circle at bottom right, #f8c9b0 0%, transparent 28%),
                linear-gradient(135deg, #f8f1e7 0%, #f2e3d4 100%);
            }

            .card {
              width: min(100%, 720px);
              padding: 40px;
              border-radius: 28px;
              background: var(--panel);
              border: 1px solid rgba(255, 255, 255, 0.65);
              box-shadow: 0 24px 80px rgba(79, 52, 36, 0.16);
              backdrop-filter: blur(10px);
            }

            .eyebrow {
              margin: 0 0 12px;
              font-size: 0.82rem;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: var(--accent-dark);
            }

            h1 {
              margin: 0;
              font-size: clamp(2.4rem, 5vw, 4.4rem);
              line-height: 0.95;
            }

            p {
              margin: 20px 0 0;
              max-width: 46ch;
              font-size: 1.05rem;
              line-height: 1.7;
              color: var(--muted);
            }

            .actions {
              display: flex;
              gap: 14px;
              flex-wrap: wrap;
              margin-top: 28px;
            }

            a {
              text-decoration: none;
            }

            .button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 150px;
              padding: 14px 20px;
              border-radius: 999px;
              font-weight: 700;
              transition:
                transform 160ms ease,
                box-shadow 160ms ease,
                background-color 160ms ease;
            }

            .button-primary {
              color: white;
              background: var(--accent);
              box-shadow: 0 14px 30px var(--ring);
            }

            .button-primary:hover {
              transform: translateY(-1px);
              background: var(--accent-dark);
            }

            .button-secondary {
              color: var(--text);
              background: rgba(255, 255, 255, 0.7);
              border: 1px solid rgba(31, 41, 55, 0.1);
            }

            .button-secondary:hover {
              transform: translateY(-1px);
            }

            .meta {
              margin-top: 28px;
              font-size: 0.95rem;
              color: var(--muted);
            }

            code {
              padding: 2px 8px;
              border-radius: 999px;
              background: rgba(198, 93, 46, 0.08);
              color: var(--accent-dark);
            }
          </style>
        </head>
        <body>
          <main class="card">
            <p class="eyebrow">NestJS Backend</p>
            <h1>To Do API</h1>
            <p>
              Your task manager backend is up and running. Use the interactive
              documentation to test auth, task, and future sync endpoints.
            </p>
            <div class="actions">
              <a class="button button-primary" href="/api">Open Docs</a>
              <a class="button button-secondary" href="/users/me">Try Protected Route</a>
            </div>
            <p class="meta">
              Swagger docs live at <code>/api</code>.
            </p>
          </main>
        </body>
      </html>
    `;
  }
}
