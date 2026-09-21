NOVA STRIKE — Tilt-Controlled Space Shooter
=============================================

A single-player arcade space shooter. One screen (PC, TV, laptop) shows the
battle. You connect from your phone and steer your ship by physically
tilting the phone — your ship fires nonstop, you just fly.

HOW IT PLAYS
------------
Your ship auto-fires straight up at a wave of alien ships pouring in from
the top of the screen. Tilt your phone forward to fly up toward the
enemies, back to retreat, left/right to strafe and dodge. Destroy aliens
for points, grab powerups they drop, and survive as many waves as you can.

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

Plain "http://192.168.x.x:3000" on your home WiFi, like the old LAN-only
setup, will NOT unlock the tilt sensor on modern iOS/Android browsers.
You have two easy options:

  OPTION A — Deploy it (recommended, and what "deploy to GitHub" usually
  means in practice — GitHub itself only hosts the code, you still need a
  place to run a Node.js server):
    1. Push this project to a GitHub repository.
    2. Connect that repo to a free Node.js host that gives you HTTPS
       automatically, e.g. Render.com, Railway.app, Fly.io, or Glitch.
       Typical settings: Build command "npm install", start command
       "npm start" (or "node server.js").
    3. Once deployed you'll get a URL like
       https://your-app.onrender.com — open that on the PC for the
       display, and the same URL + /controller.html on your phone.

  OPTION B — Play locally over an HTTPS tunnel (fastest for testing):
    1. Run the server locally: npm install && npm start
    2. In another terminal, run a tunnel tool such as ngrok:
           ngrok http 3000
       (or use localtunnel / Cloudflare Tunnel — anything that gives you
       an https:// URL pointing at your local port 3000)
    3. Open the PC display either locally (http://localhost:3000) or via
       the same https tunnel URL, and open
       https://<your-tunnel-domain>/controller.html on your phone.

SETUP
-----
1. Open a terminal in this folder.
2. Install dependencies:
       npm install
3. Start the server:
       npm start
   You should see:
       NOVA STRIKE server running on http://localhost:3000

HOW TO PLAY
------------
1. On the PC/TV/laptop that will display the battle, open a browser to
   the server's URL (see the HTTPS note above). Click "Create Game".
   A 6-digit room code appears, along with a QR code.

2. On your phone, scan the QR code (or open
   <your-url>/controller.html and type the room code in).

3. The controller will ask for motion permission on iOS (tap "Enable
   Motion Controls"). Then you'll see a calibration screen: hold the
   phone comfortably upright in front of you and tap "Calibrate &
   Continue" — that position becomes your neutral center.

4. Tap "Ready for Launch". The game starts immediately on the big screen
   (this is single-player, so there's no need to wait for anyone else).

5. Fly! Tilt the phone away from your calibrated center:
     - Tilt forward (top of phone away from you)  → fly up / advance
     - Tilt back (top of phone toward you)         → retreat
     - Tilt left / right                            → strafe left / right
   Your ship shoots automatically the whole time. If tilting ever feels
   reversed for how you like to hold the phone, use the "Invert fwd/back"
   or "Invert left/right" chips on the calibration screen, and the
   Gentle / Normal / Sharp chips to change how far you need to tilt for
   full deflection. You can tap "Recalibrate" any time, even mid-flight,
   if your resting position drifts.

GAMEPLAY
--------
- Waves of alien ships fly in from the top and drift toward you. Every
  ~24 seconds the wave advances: more aliens, faster aliens, tougher
  types.
    Drone   - basic, 1 hit to destroy
    Striker - fires a laser back at you, 2 hits to destroy
    Brute   - big and slow, 4 hits to destroy (shows up from wave 3)
- You have 5 HP (hearts, top-left). Colliding with an alien or getting
  hit by an alien laser costs 1 HP, with a brief invulnerability flash
  afterward. Reach 0 HP and the run ends — you'll see your score, the
  wave you reached, and your high score (saved on this browser), with a
  "Fly Again" button to jump straight back in.
- Destroyed aliens have a chance to drop a powerup that floats down —
  fly into it to collect:
    SPEED   (⚡) - move faster for a while
    RAPID   (🔥) - fire much faster for a while
    DOUBLE  (💥) - fire two extra bullets alongside your main shot
    PIERCE  (🎯) - bullets pass through multiple aliens
    SHIELD  (🛡) - absorbs the next hit you take
    REPAIR  (❤) - instantly restores 1 HP

TESTING WITHOUT A PHONE
-------------------------
On the host screen's home page, you can also fly with WASD or the arrow
keys — handy for a quick check that everything works before you grab a
phone and go through the HTTPS/tunnel setup.

WATCHING ALONG
---------------
The lobby screen also shows a "Watch live" QR code / link — anyone who
opens it (on another phone, tablet, etc.) gets a read-only view of the
battle. No controls, just spectating.

SOUND
-----
All sound effects are real recorded samples embedded directly in the
host page (no external audio files needed): laser fire, alien hit/
explosion, powerup pickup, wave-clear fanfare, and alien laser fire.

PROJECT STRUCTURE
------------------
server.js              - Express + Socket.io server (rooms, lobby, tilt-input relay)
public/index.html       - Host display (the actual game / battle screen)
public/controller.html  - Phone controller (tilt joystick + calibration)
public/watch.html       - Read-only spectator view
package.json            - Node dependencies

NOTES
-----
- This is single-player only: one phone controls one ship. Only the
  first phone to join a room is accepted; a second scan will be told
  the room is full.
- If your phone disconnects mid-game (lock screen, browser backgrounded),
  it will automatically try to rejoin the same room when it reconnects.
- If the host page is closed or refreshed, the room is torn down and the
  controller/spectators are notified.
