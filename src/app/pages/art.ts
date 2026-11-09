import { Component, input } from '@angular/core';

/**
 * Landing-page artwork, drawn as inline SVG so it stays sharp at any size and needs no image files.
 * Iggy is rendered like a real, rusty robot (metal gradients, specular highlights, glass, rivets, brass).
 * The enemies are drawn as cartoons (bold outlines, flat colour, one simple highlight).
 * All of it is decorative: the page carries the same information as text.
 */

@Component({
  selector: 'app-iggy-art',
  template: `
    <svg viewBox="0 0 320 440" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-label="Illustration of Iggy: a rusty robot with a glass dome head, one glowing eye, twin antennas, red shoulder caps and brass-banded joints.">
      <defs>
        <linearGradient id="ig-rust" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5b2a14"/><stop offset=".28" stop-color="#c9602f"/><stop offset=".5" stop-color="#e27a3c"/><stop offset=".78" stop-color="#a8472a"/><stop offset="1" stop-color="#4a2010"/>
        </linearGradient>
        <linearGradient id="ig-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#4a525c"/><stop offset=".35" stop-color="#c3ccd6"/><stop offset=".55" stop-color="#8f9aa6"/><stop offset="1" stop-color="#363d46"/>
        </linearGradient>
        <linearGradient id="ig-dark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#1c1410"/><stop offset=".4" stop-color="#4a3a30"/><stop offset="1" stop-color="#150e0a"/>
        </linearGradient>
        <linearGradient id="ig-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff1b0"/><stop offset=".3" stop-color="#e0b04a"/><stop offset=".7" stop-color="#a87a22"/><stop offset="1" stop-color="#6b4a10"/>
        </linearGradient>
        <radialGradient id="ig-red" cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#ff8a7a"/><stop offset=".35" stop-color="#d23a2e"/><stop offset="1" stop-color="#6e1410"/>
        </radialGradient>
        <radialGradient id="ig-glass" cx=".35" cy=".3" r=".85">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".5" stop-color="#bfe3f0" stop-opacity=".2"/><stop offset="1" stop-color="#2a5a70" stop-opacity=".35"/>
        </radialGradient>
        <radialGradient id="ig-eye" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#d9fbff"/><stop offset=".4" stop-color="#37b8d6"/><stop offset="1" stop-color="#0b4a60"/>
        </radialGradient>
        <radialGradient id="ig-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#55d4f0" stop-opacity=".55"/><stop offset="1" stop-color="#55d4f0" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="ig-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <filter id="ig-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
        <g id="ig-boot">
          <path d="M-34 36 L-24 -2 L24 -2 L34 36 Q36 44 26 44 L-26 44 Q-36 44 -34 36Z" fill="url(#ig-dark)" stroke="#120a06" stroke-width="3"/>
          <path d="M-30 34 L-22 2 L22 2 L30 34Z" fill="url(#ig-rust)" opacity=".85"/>
          <path d="M-30 36 Q0 28 30 36 L30 42 L-30 42Z" fill="url(#ig-steel)" opacity=".9"/>
          <rect x="-26" y="-6" width="52" height="9" rx="3" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2"/>
          <circle cx="-18" cy="20" r="2.4" fill="#f4e8c8"/><circle cx="18" cy="20" r="2.4" fill="#f4e8c8"/>
          <path d="M-26 10 Q-14 4 0 8" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
        <g id="ig-leg">
          <rect x="-13" y="0" width="7" height="64" rx="3.5" fill="url(#ig-steel)" stroke="#120a06" stroke-width="2"/>
          <rect x="6" y="0" width="7" height="64" rx="3.5" fill="url(#ig-steel)" stroke="#120a06" stroke-width="2"/>
          <rect x="-20" y="-4" width="40" height="30" rx="9" fill="url(#ig-rust)" stroke="#120a06" stroke-width="3"/>
          <rect x="-20" y="26" width="40" height="7" rx="3" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2"/>
          <rect x="-17" y="38" width="34" height="9" rx="3" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2"/>
          <rect x="-15" y="2" width="9" height="20" rx="4" fill="url(#ig-sheen)"/>
        </g>
        <g id="ig-arm">
          <path d="M-14 0 Q-18 44 -12 76 L12 76 Q18 44 14 0Z" fill="url(#ig-rust)" stroke="#120a06" stroke-width="3"/>
          <rect x="-15" y="30" width="30" height="8" rx="3" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2"/>
          <circle cx="0" cy="78" r="13" fill="url(#ig-brass)" stroke="#120a06" stroke-width="3"/><circle cx="0" cy="78" r="5" fill="#2a1a10"/>
          <path d="M-12 84 Q-14 118 -8 130 L8 130 Q14 118 12 84Z" fill="url(#ig-steel)" stroke="#120a06" stroke-width="3"/>
          <rect x="-13" y="104" width="26" height="7" rx="3" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2"/>
          <circle cx="0" cy="136" r="13" fill="url(#ig-dark)" stroke="#120a06" stroke-width="3"/>
          <path d="M-11 142 L-14 160 M0 144 L0 164 M11 142 L14 160" stroke="#120a06" stroke-width="9" stroke-linecap="round"/>
          <path d="M-11 142 L-14 160 M0 144 L0 164 M11 142 L14 160" stroke="url(#ig-steel)" stroke-width="5" stroke-linecap="round"/>
          <path d="M-9 -2 Q-12 40 -8 70" stroke="#fff" stroke-opacity=".3" stroke-width="4" fill="none" stroke-linecap="round"/>
        </g>
      </defs>

      <ellipse cx="160" cy="426" rx="116" ry="12" fill="#000" opacity=".5" filter="url(#ig-blur)"/>

      <!-- legs and boots -->
      <use href="#ig-leg" x="122" y="324"/><use href="#ig-leg" x="198" y="324"/>
      <use href="#ig-boot" x="122" y="382"/><use href="#ig-boot" x="198" y="382"/>

      <!-- back arm -->
      <use href="#ig-arm" x="62" y="196"/>

      <!-- pelvis and waist band -->
      <rect x="104" y="292" width="112" height="40" rx="14" fill="url(#ig-rust)" stroke="#120a06" stroke-width="3.5"/>
      <rect x="100" y="286" width="120" height="12" rx="5" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2.5"/>
      <circle cx="124" cy="316" r="2.6" fill="#f4e8c8"/><circle cx="196" cy="316" r="2.6" fill="#f4e8c8"/><circle cx="160" cy="320" r="3" fill="#f4e8c8"/>

      <!-- torso -->
      <path d="M96 172 Q82 232 100 292 L220 292 Q238 232 224 172Z" fill="url(#ig-rust)" stroke="#120a06" stroke-width="4"/>
      <path d="M104 178 Q94 232 108 288 L134 288 Q122 232 128 178Z" fill="url(#ig-sheen)" opacity=".8"/>
      <path d="M112 196 L208 196 M108 252 L212 252" stroke="#120a06" stroke-opacity=".5" stroke-width="2"/>
      <!-- vents and dials -->
      <g stroke="#150d08" stroke-width="3" stroke-linecap="round" opacity=".85">
        <path d="M110 214 L140 214 M110 224 L140 224 M110 234 L140 234"/><path d="M180 214 L210 214 M180 224 L210 224 M180 234 L210 234"/>
      </g>
      <circle cx="122" cy="268" r="12" fill="#f1e6c8" stroke="#120a06" stroke-width="3"/><path d="M122 268 L130 261" stroke="#b02a22" stroke-width="3" stroke-linecap="round"/><circle cx="122" cy="268" r="2" fill="#120a06"/>
      <circle cx="198" cy="268" r="12" fill="#f1e6c8" stroke="#120a06" stroke-width="3"/><path d="M198 268 L192 274" stroke="#b02a22" stroke-width="3" stroke-linecap="round"/><circle cx="198" cy="268" r="2" fill="#120a06"/>
      <!-- V chest plate -->
      <path d="M134 198 L186 198 L160 250Z" fill="url(#ig-steel)" stroke="#120a06" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M140 203 L180 203 L160 242" fill="none" stroke="url(#ig-brass)" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="160" cy="214" r="6" fill="url(#ig-eye)" stroke="#120a06" stroke-width="2.5"/>
      <!-- rust patches, streaks and rivets -->
      <path d="M100 258 Q112 250 120 266 Q112 284 102 278Z" fill="#4e2410" opacity=".55"/>
      <path d="M212 232 Q222 226 226 240 Q220 254 210 248Z" fill="#4e2410" opacity=".5"/>
      <path d="M104 290 L106 308 M214 290 L212 304 M146 292 L148 306" stroke="#5a2a14" stroke-width="3" stroke-linecap="round" opacity=".75"/>
      <path d="M112 244 l8 -6 M196 188 l9 -4 M128 280 l7 -5" stroke="#ffd9a8" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>
      <g fill="#f4e8c8"><circle cx="104" cy="206" r="2.4"/><circle cx="216" cy="206" r="2.4"/><circle cx="104" cy="278" r="2.4"/><circle cx="216" cy="278" r="2.4"/></g>

      <!-- front arm -->
      <use href="#ig-arm" x="258" y="196"/>

      <!-- shoulders -->
      <ellipse cx="160" cy="176" rx="82" ry="22" fill="url(#ig-rust)" stroke="#120a06" stroke-width="4"/>
      <ellipse cx="160" cy="171" rx="70" ry="14" fill="url(#ig-sheen)"/>
      <g>
        <circle cx="86" cy="178" r="26" fill="url(#ig-red)" stroke="#120a06" stroke-width="4"/>
        <ellipse cx="86" cy="196" rx="24" ry="5" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2.5"/>
        <ellipse cx="76" cy="168" rx="8" ry="5" fill="#fff" opacity=".6" transform="rotate(-30 76 168)"/>
        <circle cx="234" cy="178" r="26" fill="url(#ig-red)" stroke="#120a06" stroke-width="4"/>
        <ellipse cx="234" cy="196" rx="24" ry="5" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2.5"/>
        <ellipse cx="224" cy="168" rx="8" ry="5" fill="#fff" opacity=".6" transform="rotate(-30 224 168)"/>
      </g>

      <!-- neck collar and dome -->
      <ellipse cx="160" cy="156" rx="48" ry="13" fill="url(#ig-brass)" stroke="#120a06" stroke-width="3.5"/>
      <ellipse cx="160" cy="152" rx="40" ry="8" fill="#2a1a10" opacity=".55"/>
      <circle cx="160" cy="100" r="60" fill="#13202a" stroke="#120a06" stroke-width="3"/>
      <!-- inside the dome: gears and the head -->
      <g transform="translate(130 92)"><circle r="14" fill="url(#ig-steel)" stroke="#120a06" stroke-width="2.5"/><circle r="5" fill="#120a06"/><path d="M0 -17 V-12 M0 12 V17 M-17 0 H-12 M12 0 H17 M-12 -12 L-9 -9 M12 12 L9 9 M12 -12 L9 -9 M-12 12 L-9 9" stroke="#8f9aa6" stroke-width="4" stroke-linecap="round"/></g>
      <g transform="translate(196 84)"><circle r="10" fill="url(#ig-dark)" stroke="#120a06" stroke-width="2.5"/><circle r="3.5" fill="#120a06"/><path d="M0 -13 V-9 M0 9 V13 M-13 0 H-9 M9 0 H13" stroke="#5d6670" stroke-width="3.5" stroke-linecap="round"/></g>
      <rect x="128" y="76" width="64" height="66" rx="24" fill="url(#ig-rust)" stroke="#120a06" stroke-width="3.5"/>
      <rect x="134" y="82" width="20" height="50" rx="9" fill="url(#ig-sheen)" opacity=".8"/>
      <circle cx="160" cy="100" r="30" fill="url(#ig-glow)"/>
      <circle cx="160" cy="100" r="19" fill="#f6f0e2" stroke="#120a06" stroke-width="3.5"/>
      <circle cx="164" cy="101" r="12" fill="url(#ig-eye)" stroke="#120a06" stroke-width="2"/><circle cx="165" cy="102" r="5" fill="#06141a"/>
      <circle cx="160" cy="95" r="3.4" fill="#fff"/><circle cx="168" cy="106" r="1.6" fill="#fff" opacity=".8"/>
      <path d="M140 84 Q160 76 180 83" stroke="#120a06" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g stroke="#120a06" stroke-width="3" stroke-linecap="round"><path d="M148 126 V134 M155 126 V134 M162 126 V134 M169 126 V134"/></g>
      <path d="M130 82 Q110 118 130 138" stroke="#4e2410" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>
      <!-- the glass -->
      <circle cx="160" cy="100" r="60" fill="url(#ig-glass)"/>
      <circle cx="160" cy="100" r="60" fill="none" stroke="url(#ig-steel)" stroke-width="7"/>
      <circle cx="160" cy="100" r="60" fill="none" stroke="#120a06" stroke-width="2" opacity=".7"/>
      <path d="M118 70 Q132 48 158 44" stroke="#fff" stroke-opacity=".85" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M112 92 Q113 82 117 76" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M196 62 L184 86 L194 100 L184 118" stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="160" cy="160" rx="44" ry="6" fill="#000" opacity=".25"/>
      <!-- antennas -->
      <g stroke-linecap="round">
        <path d="M138 46 Q132 26 122 12" stroke="#120a06" stroke-width="7" fill="none"/><path d="M138 46 Q132 26 122 12" stroke="url(#ig-steel)" stroke-width="3.5" fill="none"/>
        <circle cx="120" cy="10" r="7" fill="url(#ig-brass)" stroke="#120a06" stroke-width="2.5"/>
        <path d="M178 44 Q190 28 200 6" stroke="#120a06" stroke-width="7" fill="none"/><path d="M178 44 Q190 28 200 6" stroke="url(#ig-steel)" stroke-width="3.5" fill="none"/>
        <circle cx="202" cy="4" r="7" fill="url(#ig-red)" stroke="#120a06" stroke-width="2.5"/>
      </g>
    </svg>
  `,
  styles: `:host { display: block; } svg { display: block; width: 100%; height: auto; overflow: visible; }`,
})
export class IggyArt {}

export type EnemyKind = 'skeleton' | 'crawler' | 'glowray' | 'tank';

@Component({
  selector: 'app-enemy-art',
  template: `
    <svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" stroke-linejoin="round" stroke-linecap="round">
      @switch (kind()) {
        @case ('skeleton') {
          <!-- skeleton soldier -->
          <ellipse cx="100" cy="160" rx="54" ry="6" fill="#000" opacity=".25" stroke="none"/>
          <g stroke="#1a1210" stroke-width="5" fill="#f1e8d0">
            <path d="M78 112 L70 146 M122 112 L130 146" fill="none"/>
            <path d="M60 148 Q58 160 72 160 L88 160 L84 146Z" fill="#5d6b3a"/>
            <path d="M140 148 Q142 160 128 160 L112 160 L116 146Z" fill="#5d6b3a"/>
            <path d="M72 70 Q100 62 128 70 L124 112 Q100 120 76 112Z"/>
            <path d="M84 82 Q100 78 116 82 M82 94 Q100 90 118 94 M84 106 Q100 102 116 106" fill="none" stroke-width="3.5"/>
            <path d="M100 66 V114" fill="none" stroke-width="4"/>
            <path d="M72 76 L50 100 L62 124 M128 76 L152 96" fill="none" stroke-width="6"/>
            <path d="M140 92 L186 78 L190 86 L146 104Z" fill="#6b4a2c"/>
            <circle cx="64" cy="124" r="7" fill="#d2a43c"/>
            <path d="M70 34 Q100 6 130 34 L126 58 Q100 70 74 58Z" fill="#6b7a45"/>
            <path d="M76 52 Q100 60 124 52 L124 62 Q100 74 76 62Z" fill="#f1e8d0"/>
            <circle cx="88" cy="48" r="8" fill="#1a1210"/><circle cx="112" cy="48" r="8" fill="#1a1210"/>
          </g>
          <circle cx="88" cy="48" r="3.4" fill="#ff4a3a"/><circle cx="112" cy="48" r="3.4" fill="#ff4a3a"/>
          <path d="M88 64 V72 M96 64 V72 M104 64 V72 M112 64 V72" stroke="#1a1210" stroke-width="3" fill="none"/>
          <path d="M78 26 Q96 16 112 20" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>
        }
        @case ('crawler') {
          <!-- crawler mine-bot -->
          <ellipse cx="100" cy="158" rx="70" ry="7" fill="#000" opacity=".25" stroke="none"/>
          <g stroke="#1a1210" stroke-width="5" fill="none">
            <path d="M52 104 L22 90 L12 130 M60 118 L28 128 L24 156 M72 126 L56 150 L58 160 M148 104 L178 90 L188 130 M140 118 L172 128 L176 156 M128 126 L144 150 L142 160" stroke-width="7"/>
            <path d="M52 104 L22 90 L12 130 M60 118 L28 128 L24 156 M72 126 L56 150 L58 160 M148 104 L178 90 L188 130 M140 118 L172 128 L176 156 M128 126 L144 150 L142 160" stroke="#8a8f7a" stroke-width="3"/>
          </g>
          <path d="M38 118 Q40 62 100 58 Q160 62 162 118 Q162 134 100 136 Q38 134 38 118Z" fill="#6b7a45" stroke="#1a1210" stroke-width="5"/>
          <path d="M52 100 Q60 74 100 72" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none"/>
          <path d="M70 62 L66 42 L84 58 M100 56 L100 34 L112 56 M130 60 L138 40 L142 64" stroke="#1a1210" stroke-width="5" fill="#8a8f7a"/>
          <rect x="62" y="96" width="76" height="26" rx="12" fill="#2a2e20" stroke="#1a1210" stroke-width="4"/>
          <circle cx="86" cy="109" r="8" fill="#ff4a3a" stroke="#1a1210" stroke-width="3"/><circle cx="114" cy="109" r="8" fill="#ff4a3a" stroke="#1a1210" stroke-width="3"/>
          <circle cx="84" cy="106" r="2.6" fill="#fff"/><circle cx="112" cy="106" r="2.6" fill="#fff"/>
          <path d="M80 126 H120" stroke="#1a1210" stroke-width="3" fill="none"/>
        }
        @case ('glowray') {
          <!-- glow-ray flying drone -->
          <ellipse cx="100" cy="160" rx="50" ry="5" fill="#000" opacity=".18" stroke="none"/>
          <g stroke="#1a1210" stroke-width="5">
            <path d="M100 118 Q104 142 98 160 Q92 146 96 124Z" fill="#2f7f6e"/>
            <path d="M100 38 Q150 18 196 56 Q150 52 138 78 Q124 112 100 120 Q76 112 62 78 Q50 52 4 56 Q50 18 100 38Z" fill="#3fb59a"/>
            <path d="M62 78 Q76 100 100 104 Q124 100 138 78 Q124 88 100 88 Q76 88 62 78Z" fill="#9dffd6"/>
          </g>
          <path d="M44 50 Q64 38 84 40 M156 50 Q136 38 116 40" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>
          <circle cx="82" cy="68" r="11" fill="#fff" stroke="#1a1210" stroke-width="4"/><circle cx="118" cy="68" r="11" fill="#fff" stroke="#1a1210" stroke-width="4"/>
          <circle cx="85" cy="70" r="5.5" fill="#1a1210"/><circle cx="121" cy="70" r="5.5" fill="#1a1210"/>
          <circle cx="86" cy="68" r="1.8" fill="#fff"/><circle cx="122" cy="68" r="1.8" fill="#fff"/>
          <path d="M80 54 L92 60 M120 54 L108 60" stroke="#1a1210" stroke-width="4" fill="none"/>
          <circle cx="40" cy="64" r="4" fill="#ffe27a" stroke="#1a1210" stroke-width="3"/><circle cx="160" cy="64" r="4" fill="#ffe27a" stroke="#1a1210" stroke-width="3"/>
        }
        @case ('tank') {
          <!-- the Iron Marshal -->
          <ellipse cx="100" cy="160" rx="82" ry="7" fill="#000" opacity=".25" stroke="none"/>
          <g stroke="#1a1210" stroke-width="5">
            <rect x="16" y="112" width="168" height="42" rx="21" fill="#3a4128"/>
            <circle cx="42" cy="134" r="11" fill="#8a9378"/><circle cx="72" cy="134" r="11" fill="#8a9378"/><circle cx="102" cy="134" r="11" fill="#8a9378"/><circle cx="132" cy="134" r="11" fill="#8a9378"/><circle cx="160" cy="134" r="11" fill="#8a9378"/>
            <path d="M24 112 L46 76 L158 70 L180 112Z" fill="#68763f"/>
            <path d="M74 72 L90 36 L146 34 L162 70Z" fill="#8a9378"/>
            <rect x="106" y="20" width="26" height="16" rx="6" fill="#3a4128"/>
            <rect x="0" y="44" width="92" height="18" rx="4" fill="#2e3520"/><rect x="0" y="40" width="22" height="26" rx="4" fill="#8a9378"/>
            <rect x="82" y="38" width="22" height="34" rx="4" fill="#68763f"/>
            <path d="M156 34 L168 4" stroke-width="4" fill="none"/>
          </g>
          <circle cx="120" cy="52" r="7" fill="#ff4a3a" stroke="#1a1210" stroke-width="3.5"/><circle cx="142" cy="52" r="7" fill="#ff4a3a" stroke="#1a1210" stroke-width="3.5"/>
          <path d="M112 66 Q132 72 150 64" stroke="#1a1210" stroke-width="4" fill="none"/>
          <circle cx="60" cy="96" r="9" fill="#f1ede0" stroke="#1a1210" stroke-width="3"/>
          <path d="M40 94 L50 86 L54 96Z" fill="#95502a" stroke="#1a1210" stroke-width="3"/>
          <path d="M34 108 Q50 82 70 82" stroke="#fff" stroke-opacity=".4" stroke-width="4" fill="none"/>
        }
      }
    </svg>
  `,
  styles: `:host { display: block; } svg { display: block; width: 100%; height: auto; }`,
})
export class EnemyArt {
  readonly kind = input.required<EnemyKind>();
}
