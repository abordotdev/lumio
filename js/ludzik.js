// Podpisy imion pod znacznikami na mapie.
//
// W dokumencie mapy ten plik zawierał też domyślnego ludzika. U nas ludzik jest własny
// (js/avatar.js) i podajemy go mapie przez opcję `renderAvatar`, więc domyślny byłby
// martwym kodem. Plik zostaje wyłącznie dla `nameChip`, którego mapa potrzebuje.

export function nameChip(x, y, name, color, size) {
  size = size || 12;
  const w = name.length * (size * 0.62) + 18;
  return `<g transform="translate(${x} ${y})">
    <rect x="${-w / 2}" y="${-size - 5}" width="${w}" height="${size + 10}" rx="${(size + 10) / 2}" fill="${color}"/>
    <text class="lbl-c" x="0" y="${-0.5}" text-anchor="middle" style="font-size:${size}px">${name}</text></g>`;
}
