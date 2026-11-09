export interface Achievement {
  id: string;
  name: string;
  how: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-boss', name: 'Mech Scrapper', how: 'Beat your first boss.' },
  { id: 'all-bosses', name: 'The Road Home', how: 'Beat the boss of every level.' },
  { id: 'perfect-1', name: 'Pixel Perfect', how: 'Beat a boss after collecting every breadboard on the level.' },
  { id: 'perfect-all', name: 'Flawless', how: 'Get a perfect run on every level.' },
  { id: 'secret-1', name: 'Something Shiny', how: 'Find a golden breadboard.' },
  { id: 'secret-all', name: 'Gold Rush', how: 'Find the golden breadboard on every level.' },
  { id: 'untouched', name: 'Not a Scratch', how: 'Beat a boss without being hit during the fight.' },
  { id: 'stomp-5', name: 'Stomp Combo', how: 'Stomp five enemies in a row without touching the ground.' },
  { id: 'gold-suit', name: 'Gold Standard', how: 'Put on the Gold Circuit suit.' },
  { id: 'daily', name: 'Daily Driver', how: 'Beat the boss of a daily challenge.' },
  { id: 'time', name: 'Against the Clock', how: 'Beat a boss in time attack.' },
  { id: 'marathon', name: 'Long Way Home', how: 'Run 2000 metres in endless mode.' },
];
