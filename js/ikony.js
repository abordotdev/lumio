// ikony.js - plaskie ikonki stacji (SVG w kodzie, viewBox 48x56, "stopa" ikonki = dol)
// Dodajesz nowe miasto? Dorzuc wpis do ICONS i uzyj jego klucza w polu `icon` stacji.

const STONE='#C3CEDA', STONE2='#B3C0CE', TAN='#DFC894', TAN2='#CBB47C',
      ROOF='#3F7A5E', CREAM='#F6F1E4', WIN='#8FBEDC', BRICK='#C0453F', YELL='#E8C86A';
const ICONS = {
  pkin:`<rect x="8" y="38" width="32" height="16" rx="1.5" fill="${STONE2}"/>
        <rect x="14" y="22" width="20" height="32" rx="1.5" fill="${STONE}"/>
        <rect x="18" y="12" width="12" height="12" rx="1" fill="#D2DBE4"/>
        <polygon points="24,0 28.5,12 19.5,12" fill="${ROOF}"/>
        <rect x="18.5" y="42" width="4" height="7" rx="1" fill="${CREAM}"/>
        <rect x="25.5" y="42" width="4" height="7" rx="1" fill="${CREAM}"/>`,
  bigben:`<rect x="17" y="18" width="14" height="36" rx="1.5" fill="${TAN}"/>
        <rect x="14.5" y="13" width="19" height="6" rx="1.5" fill="${TAN2}"/>
        <polygon points="24,1 33,13 15,13" fill="${ROOF}"/>
        <circle cx="24" cy="26" r="5.2" fill="${CREAM}"/><circle cx="24" cy="26" r="1.5" fill="#3E4A50"/>
        <rect x="21" y="38" width="6" height="10" rx="1.5" fill="${WIN}"/>`,
  brama:`<rect x="5" y="18" width="38" height="7" rx="2" fill="#D2DBE4"/>
        <rect x="8" y="25" width="6" height="29" fill="${STONE}"/>
        <rect x="17" y="25" width="6" height="29" fill="${STONE2}"/>
        <rect x="26" y="25" width="6" height="29" fill="${STONE2}"/>
        <rect x="35" y="25" width="6" height="29" fill="${STONE}"/>
        <rect x="5" y="51" width="38" height="3.5" rx="1" fill="#B3C0CE"/>`,
  eiffel:`<path d="M24 1 L33 54 L27.5 54 L24 24 L20.5 54 L15 54 Z" fill="${TAN}"/>
        <rect x="17.5" y="40" width="13" height="3.5" fill="${TAN2}"/>
        <rect x="20" y="24" width="8" height="3" fill="${TAN2}"/>
        <path d="M17.5 43 Q24 36 30.5 43 Z" fill="${TAN}" opacity=".55"/>`,
  spire:`<rect x="21.5" y="12" width="5" height="42" rx="2" fill="${STONE}"/>
        <polygon points="24,0 27,13 21,13" fill="${ROOF}"/>
        <rect x="17" y="50" width="14" height="4.5" rx="1.5" fill="${STONE2}"/>`,
  wiatrak:`<polygon points="24,22 33,54 15,54" fill="${TAN}"/>
        <rect x="15.5" y="44" width="17" height="3" fill="${TAN2}"/>
        <g stroke="${TAN2}" stroke-width="1">
          <g transform="rotate(25 24 20)"><ellipse cx="24" cy="8" rx="3" ry="11.5" fill="${CREAM}"/><ellipse cx="24" cy="32" rx="3" ry="11.5" fill="${CREAM}"/></g>
          <g transform="rotate(115 24 20)"><ellipse cx="24" cy="8" rx="3" ry="11.5" fill="${CREAM}"/><ellipse cx="24" cy="32" rx="3" ry="11.5" fill="${CREAM}"/></g>
        </g>
        <circle cx="24" cy="20" r="2.6" fill="${TAN2}"/>`,
  sagrada:`<path d="M24 1 C31 18 33.5 38 33 54 L15 54 C14.5 38 17 18 24 1 Z" fill="${TAN}"/>
        <circle cx="24" cy="22" r="2.8" fill="${WIN}"/>
        <path d="M20 54 L20 44 Q24 40 28 44 L28 54 Z" fill="${TAN2}"/>`,
  zamek:`<rect x="12" y="24" width="24" height="30" fill="${STONE}"/>
        <rect x="4" y="16" width="10" height="38" fill="#D2DBE4"/>
        <rect x="34" y="16" width="10" height="38" fill="#D2DBE4"/>
        <polygon points="9,3 13.5,16 4.5,16" fill="${ROOF}"/>
        <polygon points="39,3 43.5,16 34.5,16" fill="${ROOF}"/>
        <path d="M18 54 L18 42 Q24 36 30 42 L30 54 Z" fill="${STONE2}"/>`,
  domek:`<polygon points="24,8 44,29 4,29" fill="${BRICK}"/>
        <circle cx="24" cy="21" r="2.8" fill="${CREAM}"/>
        <rect x="8" y="29" width="32" height="25" fill="${YELL}"/>
        <rect x="19.5" y="36" width="9" height="18" fill="#6E4A2A"/>`
};
/**
 * Zwraca <g> z ikonka wyskalowana do zadanej wysokosci.
 * @param {string} name klucz z ICONS (fallback: 'domek')
 * @param {number} x  srodek w poziomie
 * @param {number} y  DOL ikonki (linia "gruntu")
 * @param {number} size wysokosc w px
 */
export function icon(name, x, y, size){
  const s = size / 56;
  return `<g transform="translate(${x - 24 * s} ${y - 56 * s}) scale(${s})">${ICONS[name] || ICONS.domek}</g>`;
}

export { ICONS };
