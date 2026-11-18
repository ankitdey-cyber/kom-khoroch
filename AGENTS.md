# Agent Guidelines

- `src/routing.js` is the tested routing engine. Change it only when a task says so, and keep all tests passing.
- Follow `DESIGN.md` and the current Stitch-based UI for every UI change.
- Gemini is called only from the server. Never put API keys in client code.
- Run `npm test` and `npm run build` before finishing any task.
- Commit after each completed task with a clear message.
