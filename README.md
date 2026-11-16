# UNO Casino

A two-player, shared-screen card-counter and dice table designed for an iPad in landscape orientation.

## Files
- `index.html` — page structure
- `style.css` — responsive table layout and styling
- `game.js` — game state, betting, dice, loans, jackpot and local saving

## Run it
Open `index.html` in a browser, or upload the three files to a GitHub repository and enable GitHub Pages. No build step or server is required. Google Fonts are optional; the app falls back to system fonts if offline.

## Important implementation assumptions
1. When a player cannot pay the full normal-round bonus, the app transfers only the cards they have available.
2. During a jackpot round, players must bet on opposite options, following the original special-jackpot rule.
3. If the jackpot is triggered while the jackpot is on cooldown, the current version still accumulates cards into the jackpot and immediately starts a jackpot round. If your group instead wants the jackpot unavailable to win for those two rounds, change the relevant logic in `game.js`.
4. A loan's deadline decreases after each settled round. At expiry, 4 cards are removed (3-card repayment plus 1-card fee).
5. Wagers are deducted from a player's balance as they are placed, and are returned if removed or cleared. Matching choices immediately move those cards into the jackpot. The app tracks card counts, not the exact faces/values of the physical UNO cards.

## Customize
Change the colors and layout in `style.css`. Game rules and state transitions are in `game.js`.
