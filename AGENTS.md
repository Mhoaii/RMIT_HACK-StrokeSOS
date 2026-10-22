# Project instructions

Không được pip install thư viện tránh gây nặng ổ C. Dùng npm install ngay trong thư mục project. Nếu cần tải Python hoặc phần mềm lõi cần thiết, phải hỏi người dùng trước.

Keep npm cache and dependencies inside this project. Never commit `.env.local`, real Tide adapter files, Docker data, installer downloads, or API keys. Simulation must be clearly labeled; never invent Tide SDK APIs or claim a local gate is enforced by the Tide network.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
