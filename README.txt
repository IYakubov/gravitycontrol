NOVA STRIKE — Tilt-Controlled Space Shooter
=============================================

An arcade space shooter with two modes. One screen (PC, TV, laptop) shows
the battle. You connect from your phone(s) and fly by physically tilting
the phone like a real control stick — your plane fires automatically the
whole time, you just fly.

TWO MODES
---------
  SINGLE PILOT  - fly solo against escalating waves of alien ships.
  DOGFIGHT      - two phones, two planes, shooting each other down in a
                  shared arena. Best of 3 rounds wins the match.

FLIGHT MODEL — REAL TURNING, NOT SLIDING
------------------------------------------
Your plane has a facing direction and turns like a real aircraft, not a
"slide in 4 directions" scheme:
  - Tilt forward / back  -> thrust forward / reverse along the direction
                            you're currently facing
  - Tilt left / right    -> turn (rotate) left / right
Your gun always fires in the direction your nose is pointing — so in
Single Pilot mode you'll need to turn toward incoming aliens to hit them,
not just hold forward. Your plane fires automatically at a steady, more
moderate pace than before; there's no fire button.

WALLS HURT
----------
The arena has a glowing boundary around it. Fly (or get knocked) into it
and you take damage, just like getting hit — so don't hug the edges.

REQUIREMENTS
------------
Node.js 16 or newer.

IMPORTANT — HTTPS IS REQUIRED FOR THE PHONE CONTROLLER
--------------------------------------------------------
Phone motion sensors (the "gravity sensor" / tilt input, technically the
DeviceOrientation API) only work in a secure context. That means the page
the CONTROLLER is opened on must be served over HTTPS (or be
"http://localhost", which only works if the phone and the server are the
literal same device — not useful here since you need a separate phone).

Plain "http://192.168.x.x:3000" on your home WiFi will NOT unlock the
tilt sensor on modern iOS/Android browsers. Two easy options:

  OPTION A — Deploy it (recommended):
    1. Push this project to a GitHub repository.
    2. Connect that repo to a free Node.js host that gives you HTTPS
       automatically, e.g. Render.com, Railway.app, Fly.io, or Glitch.
       Build command "npm install", start command "npm start".
    3. Open the resulting https://your-app... URL on the PC for the
       display, and the same URL + /controller.html on your phone(s).

  OPTION B — Play locally over an HTTPS tunnel (fastest for testing):
    1. Run the server locally: npm install && npm start
    2. In another terminal: ngrok http 3000 (or localtunnel / Cloudflare
       Tunnel — anything that gives you an https:// URL for port 3000).
    3. Open the PC display locally or via the tunnel URL, and open
       https://<your-tunnel-domain>/controller.html on your phone(s).

SETUP
-----
1. Open a terminal in this folder.
2. Install dependencies:   npm install
3. Start the server:       npm start
   You should see: NOVA STRIKE server running on http://localhost:3000

HOW TO PLAY — SINGLE PILOT
----------------------------
1. On the display screen, click "Single Pilot". A 6-digit room code and
   QR code appear.
2. On your phone, scan the QR code (or open <url>/controller.html and
   type the code).
3. iOS will ask for motion permission — tap "Enable Motion Controls".
   Then calibrate: hold the phone comfortably upright and tap
   "Calibrate & Continue" — that position becomes neutral.
4. Tap "Ready for Launch" — the game starts immediately.
5. Fly: tilt forward/back to thrust, left/right to turn. Your gun fires
   automatically in whatever direction you're facing, so turn toward
   aliens to hit them.

HOW TO PLAY — DOGFIGHT (2 PLAYER)
------------------------------------
1. On the display screen, click "Dogfight". Share the same room code /
   QR with a second phone — whoever scans first becomes Pilot A (cyan),
   the second becomes Pilot B (magenta). A third phone will be told the
   room is full.
2. Both phones go through the same motion-permission + calibration flow,
   then both tap "Ready for Launch". The match starts once BOTH pilots
   are ready.
3. Fly around the shared arena and shoot each other down. Getting hit,
   ramming the other plane, or hitting the arena wall all cost a heart.
   First pilot to lose all hearts loses the round; first to 3 round wins
   takes the match. Powerups are scattered around the arena for both
   pilots to grab.
4. After the match, "Rematch" resets rounds to 0-0 and starts again with
   the same two phones still connected; "New Game" reloads to pick a
   fresh mode/room.

CONTROLLER SETTINGS
---------------------
On the calibration screen: "Invert fwd/back" and "Invert turn" flip the
tilt direction if it ever feels backwards for how you hold the phone,
and Gentle / Normal / Sharp change how far you need to tilt for full
deflection. You can tap "Recalibrate" any time, even mid-flight, if your
resting position drifts. Pilot A's UI is cyan, Pilot B's is magenta, so
it's easy to tell which phone is which mid-dogfight.

TESTING WITHOUT A PHONE
-------------------------
On the display's home screen, you can fly with WASD (Pilot A) or the
arrow keys (Pilot B) — handy to sanity-check both modes, including a
full 2-player dogfight, entirely from the keyboard before you deal with
the HTTPS/tunnel setup for real phones.

SOLO GAMEPLAY DETAILS
------------------------
- Waves of alien ships fly in from the top and drift toward you. Every
  ~24 seconds the wave advances: more aliens, faster aliens, tougher
  types.
    Drone   - basic, 1 hit to destroy
    Striker - fires a laser back at you, 2 hits to destroy
    Brute   - big and slow, 4 hits to destroy (shows up from wave 3)
- You have 5 HP (hearts, top-left). Colliding with an alien, an alien
  laser, or the arena wall costs 1 HP, with a brief invulnerability
  flash afterward. Reach 0 HP and the run ends — score, wave reached,
  and high score (saved on this browser) are shown, with "Fly Again" to
  jump straight back in.
- Destroyed aliens have a chance to drop a powerup that floats down.

DOGFIGHT GAMEPLAY DETAILS
----------------------------
- No aliens — just the two of you. Each round, ~7 powerups are scattered
  around the arena for both pilots to grab.
- Each pilot has 5 HP. Taking an enemy bullet, ramming the other plane,
  or hitting the wall all cost 1 HP (with a brief invulnerability window
  after each hit).
- First to 0 HP loses the round; the other pilot's round-win pip lights
  up and a short "Pilot X wins the round!" banner shows before both
  planes respawn for the next round.
- First to 3 round wins takes the match.

POWERUPS (both modes)
------------------------
    SPEED   (⚡) - move faster for a while
    RAPID   (🔥) - fire much faster for a while
    DOUBLE  (💥) - fire two extra bullets alongside your main shot
    PIERCE  (🎯) - bullets pass through multiple targets
    SHIELD  (🛡) - absorbs the next hit you take
    REPAIR  (❤) - instantly restores 1 HP

WATCHING ALONG
---------------
The lobby screen also shows a "Watch live" QR code / link — anyone who
opens it gets a read-only view of the battle (works for both modes).
No controls, just spectating.

SOUND
-----
All sound effects are real recorded samples embedded directly in the
host page (no external audio files needed).

PROJECT STRUCTURE
------------------
server.js              - Express + Socket.io server (solo/duel rooms, lobby, tilt-input relay)
public/index.html       - Host display (the actual game / battle screen, both modes)
public/controller.html  - Phone controller (tilt joystick + calibration)
public/watch.html       - Read-only spectator view
package.json            - Node dependencies

NOTES
-----
- Solo mode accepts one phone (slot A). Dogfight accepts two (slots A
  and B); a third scan is told the room is full.
- If a phone disconnects mid-game (lock screen, browser backgrounded),
  it automatically tries to rejoin the same room/slot when it reconnects.
- If the host page is closed or refreshed, the room is torn down and
  connected phones/spectators are notified.
