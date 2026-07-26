# Local development

Default local port: `1059`.

Use `1059` for the first local signaling/backend process and any desktop-client development server unless a task explicitly documents another port.

Default environment:

```bash
LOCAL_DEV_PORT=1059
SIGNALING_PORT=1059
APP_ORIGIN=http://localhost:1059
```

Current status: runtime servers are not implemented yet. `pnpm dev` prints these values so future app work has a single documented default.
