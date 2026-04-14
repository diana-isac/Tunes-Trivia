# Supabase Setup Issues

## Open Inputs

- [ ] Add real Supabase project credentials to `.env`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirm final session rule
  - Recommended: one completed run per device for the event
- [ ] Confirm duration is measured as total elapsed quiz time
- [ ] Create Supabase tables for `game_sessions` and `leaderboard_entries`
- [ ] Enable realtime on `leaderboard_entries`

## Build Tasks

- [ ] Extend `server.js` with API routes for session start, finish, and leaderboard fetch
- [ ] Replace `localStorage` leaderboard persistence in `app.js` with server-backed storage
- [ ] Add a browser `device_id` for one-device session control
- [ ] Add realtime leaderboard subscription in the frontend
- [ ] Add UX states for already-played and active-session cases

