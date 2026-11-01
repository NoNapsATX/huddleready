// Shadow puppets made from human-drawn hand art (Microsoft Fluent Emoji, MIT). viewBox 0 0 200 170.
// Each layer: ['img', file, x, y, size, rotate, flipX, cls] or ['arm', x1, y1, x2, y2, width, cls] or ['eye', x, y, r]
window.PUPSPEC = {
  bunny: [['arm', 116, 124, 150, 210, 44], ['img', 'victory', 44, 8, 128, -30, 0, 'whole'], ['eye', 90, 104, 4.6]],
  dog: [['arm', 150, 98, 230, 128, 44], ['img', 'left', 22, 26, 140, 0, 0, 'top'], ['img', 'left', 22, 26, 140, 0, 0, 'jaw'], ['eye', 112, 76, 4], ['mouth', 'M36 101.5 L98 98.5 L100 101 L38 105Z']],
  bird: [['arm', 94, 118, 132, 210, 28], ['arm', 106, 118, 68, 210, 28], ['img', 'splayed', 0, 50, 104, -62, 1, 'wl'], ['img', 'splayed', 96, 50, 104, 62, 0, 'wr'], ['head', 100, 66], ['eye', 103, 60, 2.6]],
  swan: [['img', 'pinched', 58, 30, 96, 180, 0, 'beak'], ['arm', 138, 58, 146, 210, 30], ['blob', 118, 38, 25, 10], ['eye', 110, 64, 3.4]]
};
window.PUPORIGIN = { whole: [116, 124], jaw: [150, 100], wl: [100, 112], wr: [100, 112], beak: [138, 60] };
window.pupSVG = function (k, mode, base) {
  // mode 'shadow' (dark silhouette on the wall) or 'hands' (the real hands, in color)
  const S = (window.PUPSPEC || {})[k] || [], fid = 'sh' + Math.random().toString(36).slice(2, 7), skin = '#EEBFAA', line = '#D6A089';
  const img = ([, f, x, y, s, r, fl, cls]) => {
    const cx = x + s / 2, cy = y + s / 2;
    const tf = `rotate(${r} ${cx} ${cy})` + (fl ? ` translate(${2 * cx} 0) scale(-1 1)` : '');
    const clip = cls === 'top' ? ` clip-path="url(#${fid}t)"` : cls === 'jaw' ? ` clip-path="url(#${fid}j)"` : '';
    const o = (window.PUPORIGIN || {})[cls];
    return `<g class="${cls || ''}"${o ? ` style="transform-origin:${o[0]}px ${o[1]}px;transform-box:view-box"` : ''}><image href="${base}hands/${f}.svg" x="${x}" y="${y}" width="${s}" height="${s}" transform="${tf}"${clip}/></g>`;
  };
  let body = '', eyes = '';
  for (const L of S) {
    if (L[0] === 'arm') body += `<line x1="${L[1]}" y1="${L[2]}" x2="${L[3]}" y2="${L[4]}" stroke="${skin}" stroke-width="${L[5]}" stroke-linecap="round"/>` + (mode === 'hands' ? `<line x1="${L[1]}" y1="${L[2]}" x2="${L[3]}" y2="${L[4]}" stroke="${line}" stroke-width="${L[5] + 3}" stroke-linecap="round" class="armol"/>` : '');
    else if (L[0] === 'img') body += img(L);
    else if (L[0] === 'head') body += `<g class="head"><path d="M${L[1] - 9} ${L[2] + 22} C${L[1] - 12} ${L[2] + 6} ${L[1] - 10} ${L[2] - 8} ${L[1]} ${L[2] - 11} C${L[1] + 9} ${L[2] - 12} ${L[1] + 12} ${L[2] - 2} ${L[1] + 10} ${L[2] + 8} C${L[1] + 9} ${L[2] + 14} ${L[1] + 9} ${L[2] + 18} ${L[1] + 9} ${L[2] + 22}Z" fill="${skin}"/><path d="M${L[1] - 6} ${L[2] - 7} L${L[1] - 21} ${L[2] - 9} L${L[1] - 7} ${L[2] + 1}Z" fill="${skin}"/><path d="M${L[1] - 4} ${L[2] + 4} Q${L[1] + 2} ${L[2] + 8} ${L[1] + 8} ${L[2] + 4}" fill="none" stroke="${line}" stroke-width="1.6" class="crease"/></g>`;
    else if (L[0] === 'mouth' && mode === 'shadow') eyes += `<path class="hole mouth" d="${L[1]}"/>`;
    else if (L[0] === 'blob') body += `<ellipse cx="${L[1]}" cy="${L[2]}" rx="${L[3]}" ry="${L[4]}" fill="${skin}"/>`;
    else if (L[0] === 'eye' && mode === 'shadow') eyes += `<circle class="hole" cx="${L[1]}" cy="${L[2]}" r="${L[3]}"/>`;
  }
  const defs = `<defs><filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="#2a2440"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation=".7"/></filter>
    <clipPath id="${fid}t"><polygon points="0,0 200,0 200,101 0,101"/></clipPath><clipPath id="${fid}j"><polygon points="0,100 200,100 200,200 0,200"/></clipPath></defs>`;
  return `<svg viewBox="0 0 200 170" class="pup-svg ${mode}" overflow="visible">${defs}<g ${mode === 'shadow' ? `filter="url(#${fid})"` : ''}>${body}</g>${eyes}</svg>`;
};
