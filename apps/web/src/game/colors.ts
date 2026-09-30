/** Seat colours: each player keeps a signature colour across chips, tray labels and effects. */
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#b197fc', '#ff8fd1', '#3bc9db', '#ff922b', '#94d82d', '#748ffc'];
export const colorFor = (index: number) => PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
