# Local development

Default local port: `1059`.

Use `1059` for the browser prototype, first local signaling/backend process, and any desktop-client development server unless a task explicitly documents another port.

Default environment:

```bash
LOCAL_DEV_PORT=1059
SIGNALING_PORT=1059
LOCAL_APP_ORIGIN=http://localhost:1059
PUBLIC_APP_NAME=SynVibe
PUBLIC_APP_DOMAIN=synvibe.app
PUBLIC_APP_ORIGIN=https://synvibe.app
```

Current status: `pnpm dev` starts the browser prototype on `http://127.0.0.1:1059/`.
