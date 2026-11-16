/* Layered Avatar Studio artwork from the BrainiLab design handoff. */
window.BrainiAvatarStudioArt=(()=>{
  const A=BrainiAvatarDesign;
  const glasses={
    round: `<g fill="#FFFFFF" fill-opacity=".18" stroke="#181729" stroke-width="3"><circle cx="84" cy="96" r="13"></circle><circle cx="116" cy="96" r="13"></circle></g><path d="M97 94 Q100 90 103 94 M71 94 L60 92 M129 94 L140 92" stroke="#181729" stroke-width="3" fill="none" stroke-linecap="round"></path>`,
    square: `<g fill="#FFFFFF" fill-opacity=".18" stroke="#2D296E" stroke-width="3.5"><rect x="69" y="86" width="30" height="21" rx="6"></rect><rect x="101" y="86" width="30" height="21" rx="6"></rect></g><path d="M69 92 L60 90 M131 92 L140 90" stroke="#2D296E" stroke-width="3.5" stroke-linecap="round"></path>`,
    heart: `<g fill="#F0607A" fill-opacity=".42" stroke="#E52720" stroke-width="3" stroke-linejoin="round"><path d="M84 109 C71 101 68 92 73 87 C77 83 83 85 84 90 C85 85 91 83 95 87 C100 92 97 101 84 109 Z"></path><path d="M116 109 C103 101 100 92 105 87 C109 83 115 85 116 90 C117 85 123 83 127 87 C132 92 129 101 116 109 Z"></path></g><path d="M96 91 Q100 88 104 91 M70 91 L60 90 M130 91 L140 90" stroke="#E52720" stroke-width="3" fill="none" stroke-linecap="round"></path>`,
    star: `<g fill="#FFD813" fill-opacity=".5" stroke="#E6680C" stroke-width="2.6" stroke-linejoin="round"><path d="M84 81 L88.1 90.3 L98.3 91.4 L90.7 98.2 L92.8 108.1 L84 103 L75.2 108.1 L77.3 98.2 L69.7 91.4 L79.9 90.3 Z"></path><path d="M116 81 L120.1 90.3 L130.3 91.4 L122.7 98.2 L124.8 108.1 L116 103 L107.2 108.1 L109.3 98.2 L101.7 91.4 L111.9 90.3 Z"></path></g><path d="M98.3 91.4 L101.7 91.4 M69.7 91.4 L60 90 M130.3 91.4 L140 90" stroke="#E6680C" stroke-width="2.6" stroke-linecap="round"></path>`,
    monocle: `<circle cx="116" cy="96" r="14" fill="#FFFFFF" fill-opacity=".2" stroke="#C79A2B" stroke-width="3.5"></circle><path d="M128 104 Q142 130 128 156" stroke="#C79A2B" stroke-width="2" fill="none" stroke-dasharray="2 3" stroke-linecap="round"></path>`,
    doughnut: `<g fill="none"><circle cx="84" cy="96" r="12.5" stroke="#D9A06B" stroke-width="8"></circle><circle cx="116" cy="96" r="12.5" stroke="#D9A06B" stroke-width="8"></circle><circle cx="84" cy="96" r="12.5" stroke="#F08BB0" stroke-width="5.5"></circle><circle cx="116" cy="96" r="12.5" stroke="#F08BB0" stroke-width="5.5"></circle></g><g stroke-width="1.8" stroke-linecap="round"><path d="M76 86 L78.5 84.5 M108 86 L110.5 84.5" stroke="#FFD813"></path><path d="M91 85 L93 87 M123 85 L125 87" stroke="#2F7FE0"></path><path d="M72.5 99 L72.5 102 M104.5 99 L104.5 102" stroke="#40AB34"></path><path d="M94 103 L92 105 M126 103 L124 105" stroke="#FFFFFF"></path></g><path d="M96 94 Q100 90 104 94" stroke="#D9A06B" stroke-width="3" fill="none" stroke-linecap="round"></path>`
  };
  const hats={
    beanie: `<path d="M54 72 C54 38 76 24 100 24 C124 24 146 38 146 72 Z" fill="#E52720"></path><path d="M74 34 Q86 28 98 28" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".3"></path><rect x="50" y="60" width="100" height="20" rx="10" fill="#B31E19"></rect><path d="M62 62 V78 M74 62 V78 M86 62 V78 M98 62 V78 M110 62 V78 M122 62 V78 M134 62 V78" stroke="#000000" stroke-opacity=".15" stroke-width="2"></path><circle cx="100" cy="22" r="11" fill="#FFF8D2"></circle>`,
    corn: `<path d="M86 62 C72 48 72 26 80 12 C84 30 90 42 98 52 Z" fill="#40AB34"></path><path d="M114 62 C128 48 128 26 120 12 C116 30 110 42 102 52 Z" fill="#2E8A26"></path><ellipse cx="100" cy="32" rx="15" ry="27" fill="#FFD813" stroke="#E6A100" stroke-width="2"></ellipse><path d="M87 20 H113 M85 30 H115 M86 40 H114 M90 50 H110 M95 7 V58 M105 7 V58" stroke="#E6A100" stroke-width="1.6" opacity=".75"></path><path d="M82 66 C86 54 94 50 100 57 C106 50 114 54 118 66 Z" fill="#7FCB4F"></path>`,
    cloud: `<path d="M78 46 L75 53 M124 46 L121 53 M88 50 L86 55" stroke="#2F7FE0" stroke-width="2.5" stroke-linecap="round"></path><g fill="#B7B4DE"><circle cx="80" cy="26" r="14"></circle><circle cx="100" cy="18" r="18"></circle><circle cx="122" cy="26" r="14"></circle><rect x="66" y="24" width="70" height="18" rx="9"></rect></g><rect x="66" y="32" width="70" height="10" rx="5" fill="#8C88C9" opacity=".6"></rect><path d="M104 38 L94 56 L102 56 L96 72 L114 50 L105 50 L111 38 Z" fill="#FFD813" stroke="#E6A100" stroke-width="1.5" stroke-linejoin="round"></path>`,
    coffee: `<path d="M90 20 C86 14 94 10 90 4 M110 20 C106 14 114 10 110 4" stroke="#B9BCC8" stroke-width="2.5" fill="none" stroke-linecap="round"></path><path d="M124 38 C140 38 140 58 124 58" stroke="#DCDAEB" stroke-width="9" fill="none"></path><path d="M124 38 C140 38 140 58 124 58" stroke="#FFFFFF" stroke-width="5" fill="none"></path><path d="M72 30 L128 30 L122 68 L78 68 Z" fill="#FFFFFF" stroke="#DCDAEB" stroke-width="2" stroke-linejoin="round"></path><path d="M75 50 L125 50 L124 57 L76 57 Z" fill="#E6680C"></path><ellipse cx="100" cy="30" rx="28" ry="6" fill="#8A5A3B"></ellipse><path d="M100 34 C96 31 95 28 97 27 C98.5 26 100 27 100 28.5 C100 27 101.5 26 103 27 C105 28 104 31 100 34 Z" fill="#FFF1DD"></path>`,
    wizard: `<path d="M110 -18 C104 10 92 30 62 62 L138 62 C126 40 118 16 110 -18 Z" fill="#5B55D6"></path><path d="M64 52 L136 52 L139 60 L61 60 Z" fill="#FFD813"></path><ellipse cx="100" cy="63" rx="58" ry="11" fill="#2D296E"></ellipse><path d="M96 22 L97.8 27.2 L103 29 L97.8 30.8 L96 36 L94.2 30.8 L89 29 L94.2 27.2 Z" fill="#FFD813"></path><path d="M112 4 L113.2 7.8 L117 9 L113.2 10.2 L112 14 L110.8 10.2 L107 9 L110.8 7.8 Z" fill="#FFFFFF"></path><circle cx="84" cy="44" r="2.2" fill="#FFFFFF"></circle>`,
    graduate: `<path d="M62 62 C62 44 138 44 138 62 L138 70 C122 64 78 64 62 70 Z" fill="#181729"></path><path d="M100 20 L164 42 L100 64 L36 42 Z" fill="#2D296E"></path><path d="M100 20 L164 42 L100 52 L36 42 Z" fill="#FFFFFF" opacity=".08"></path><path d="M100 42 L150 48 L150 72" stroke="#FFD813" stroke-width="3" fill="none" stroke-linecap="round"></path><path d="M146 72 L154 72 L156 84 L144 84 Z" fill="#FFD813"></path><circle cx="100" cy="42" r="4.5" fill="#FFD813"></circle>`
  };
  const extras={
    cookie: `<circle cx="170" cy="170" r="14" fill="#D9A06B"></circle><circle cx="170" cy="170" r="14" fill="none" stroke="#A86B45" stroke-width="2"></circle><g fill="#5B3A26"><circle cx="164" cy="164" r="2.6"></circle><circle cx="175" cy="166" r="2.2"></circle><circle cx="167" cy="176" r="2.6"></circle><circle cx="177" cy="176" r="1.8"></circle></g>`,
    peas: `<path d="M153 177 C157 160 178 155 188 161 C184 176 165 185 153 177 Z" fill="#40AB34"></path><g fill="#9BDB5E"><circle cx="162" cy="173" r="4.6"></circle><circle cx="171" cy="168.5" r="4.6"></circle><circle cx="180" cy="164" r="4.6"></circle></g><path d="M188 161 L192 156" stroke="#2E8A26" stroke-width="2.2" stroke-linecap="round"></path>`,
    train: `<circle cx="161" cy="151" r="3" fill="#B9BCC8"></circle><circle cx="156" cy="146" r="2.3" fill="#B9BCC8"></circle><rect x="159" y="157" width="5" height="9" rx="1" fill="#181729"></rect><rect x="156" y="165" width="27" height="14" rx="3" fill="#2D296E"></rect><rect x="171" y="155" width="13" height="13" rx="2" fill="#E52720"></rect><rect x="174" y="158" width="7" height="5" rx="1" fill="#D8EEFF"></rect><path d="M156 172 L151 181 L156 181 Z" fill="#FFD813"></path><circle cx="162" cy="181" r="3.6" fill="#181729"></circle><circle cx="177" cy="181" r="3.6" fill="#181729"></circle>`,
    owl: `<path d="M157 161 L159 152 L165 158 Z M183 161 L181 152 L175 158 Z" fill="#A86B45"></path><ellipse cx="170" cy="172" rx="14" ry="15" fill="#A86B45"></ellipse><ellipse cx="170" cy="178" rx="8.5" ry="8" fill="#F2C29E"></ellipse><circle cx="164" cy="166" r="5.2" fill="#FFFFFF"></circle><circle cx="176" cy="166" r="5.2" fill="#FFFFFF"></circle><circle cx="164.6" cy="166.4" r="2.5" fill="#181729"></circle><circle cx="176.6" cy="166.4" r="2.5" fill="#181729"></circle><path d="M168 171 L172 171 L170 175 Z" fill="#E6680C"></path>`,
    pencil: `<g transform="rotate(40 170 170)"><rect x="163" y="151" width="14" height="6" rx="2" fill="#F08BB0"></rect><rect x="163" y="156" width="14" height="3.5" fill="#B9BCC8"></rect><rect x="163" y="159" width="14" height="21" fill="#FFD813"></rect><path d="M170 159 V180" stroke="#E6A100" stroke-width="1.5"></path><path d="M163 180 L177 180 L170 191 Z" fill="#F2C29E"></path><path d="M168 187 L172 187 L170 191 Z" fill="#181729"></path></g>`,
    nacho: `<path d="M170 153 L187 182 L153 182 Z" fill="#FFC23D" stroke="#E6A100" stroke-width="2" stroke-linejoin="round"></path><path d="M160 171 C164 167 176 167 180 171 C178 175 176 173 174 177 C172 173 168 175 166 173 C164 176 162 175 160 171 Z" fill="#FFE36E"></path><g fill="#E6680C"><circle cx="168" cy="163" r="1.5"></circle><circle cx="176" cy="178" r="1.5"></circle><circle cx="162" cy="178" r="1.3"></circle><circle cx="171" cy="179" r="1.1"></circle></g>`,
    rocket: `<path d="M170 149 C179 155 181 168 176 181 L164 181 C159 168 161 155 170 149 Z" fill="#E52720"></path><circle cx="170" cy="164" r="3.8" fill="#D8EEFF" stroke="#2D296E" stroke-width="1.5"></circle><path d="M164 172 L157 183 L164 181 Z M176 172 L183 183 L176 181 Z" fill="#2D296E"></path><path d="M165 182 Q170 193 175 182 Z" fill="#FFD813"></path>`,
    book: `<path d="M155 160 L170 164 L185 160 L185 180 L170 184 L155 180 Z" fill="#40AB34"></path><path d="M170 164 V184" stroke="#FFFFFF" stroke-width="2"></path><path d="M159 166 L166 168 M159 171 L166 173 M174 168 L181 166 M174 173 L181 171" stroke="#FFFFFF" stroke-width="1.5" opacity=".7"></path><circle cx="181" cy="157" r="3.5" fill="#7FCB4F"></circle><circle cx="186" cy="154" r="3.5" fill="#7FCB4F"></circle><circle cx="187.5" cy="153" r="1" fill="#181729"></circle>`,
    bulb: `<path d="M161 151 L157 147 M179 151 L183 147 M170 147 V142" stroke="#E6680C" stroke-width="2.5" stroke-linecap="round"></path><circle cx="170" cy="164" r="11" fill="#FFD813" stroke="#E6A100" stroke-width="2"></circle><rect x="164.5" y="173" width="11" height="9" rx="2.5" fill="#737286"></rect><path d="M165 177 H175" stroke="#FFFFFF" stroke-width="1.5"></path>`
  };
  function paletteFor(look){
    return Object.fromEntries(['skin','hairColor','shirt','background'].map(kind=>[kind,A.options[kind].find(item=>item.id===look[kind]).color]));
  }
  function markup(look,{instance,level=1,levelPct=0,stickerScale=1}){
    const id='avatar-art-'+instance,palette=paletteFor(look),arc=Math.round(1000*levelPct)+' 1000';
    const backHair={waves:'longBack',bob:'bobBack',braids:'braids',ponytail:'pony',curls:'curlsBack'}[look.hair];
    const frontHair={sweep:'sweep',crop:'crop',curls:'curls',bald:'none',bob:'part',waves:'part',braids:'part',ponytail:'part'}[look.hair];
    const hairArt={
      curlsBack: `<g fill="${palette.hairColor}"><circle cx="56" cy="94" r="14"></circle><circle cx="144" cy="94" r="14"></circle><circle cx="58" cy="72" r="16"></circle><circle cx="142" cy="72" r="16"></circle></g>`,
      longBack: `<path d="M50 92 C46 46 76 30 100 30 C124 30 154 46 150 92 L156 156 C144 166 126 164 118 156 L82 156 C74 164 56 166 44 156 Z" fill="${palette.hairColor}"></path>`,
      bobBack: `<path d="M52 92 C50 48 76 32 100 32 C124 32 150 48 148 92 L150 128 C140 136 126 136 120 128 L80 128 C74 136 60 136 50 128 Z" fill="${palette.hairColor}"></path>`,
      braids: `<g fill="${palette.hairColor}"><path d="M54 92 C52 50 76 34 100 34 C124 34 148 50 146 92 L146 112 L54 112 Z"></path><circle cx="55" cy="114" r="10"></circle><circle cx="55" cy="131" r="9"></circle><circle cx="55" cy="147" r="8"></circle><circle cx="145" cy="114" r="10"></circle><circle cx="145" cy="131" r="9"></circle><circle cx="145" cy="147" r="8"></circle></g><circle cx="55" cy="159" r="4.5" fill="#FFD813"></circle><circle cx="145" cy="159" r="4.5" fill="#FFD813"></circle>`,
      pony: `<path d="M134 52 C170 52 180 100 164 140 C158 118 150 100 138 90 Z" fill="${palette.hairColor}"></path><circle cx="140" cy="58" r="6" fill="#FFD813"></circle>`,
      curls: `<g fill="${palette.hairColor}"><circle cx="64" cy="74" r="15"></circle><circle cx="76" cy="57" r="16"></circle><circle cx="94" cy="48" r="17"></circle><circle cx="112" cy="48" r="17"></circle><circle cx="128" cy="57" r="16"></circle><circle cx="138" cy="74" r="15"></circle><circle cx="84" cy="66" r="10"></circle><circle cx="118" cy="66" r="10"></circle><circle cx="100" cy="62" r="11"></circle></g><g fill="#FFFFFF" opacity=".22"><circle cx="90" cy="42" r="4"></circle><circle cx="110" cy="42" r="4"></circle><circle cx="72" cy="52" r="3.5"></circle></g>`,
      sweep: `<path d="M56 90 C52 50 80 34 106 36 C134 38 150 60 144 92 C140 78 132 70 122 66 C108 74 84 74 66 70 C60 76 57 82 56 90 Z" fill="${palette.hairColor}"></path><path d="M84 47 Q104 40 124 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".25"></path>`,
      crop: `<path d="M58 86 C56 52 80 40 100 40 C122 40 144 52 142 86 C138 74 128 64 100 62 C74 64 62 74 58 86 Z" fill="${palette.hairColor}"></path><path d="M86 48 Q100 44 114 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      part: `<path d="M56 94 C52 52 78 36 100 36 C122 36 148 52 144 94 C140 76 130 64 112 58 C108 66 100 70 100 70 C100 70 92 64 88 58 C70 64 60 76 56 94 Z" fill="${palette.hairColor}"></path><path d="M70 56 Q80 46 92 44" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      none: `<ellipse cx="86" cy="58" rx="14" ry="6" fill="#FFFFFF" opacity=".28" transform="rotate(-18 86 58)"></ellipse>`,
    };
    const hair={
      [backHair]:hairArt[backHair],
      [frontHair]:hairArt[frontHair]
    };
    const sticker='translate(170 170) scale('+stickerScale+') translate(-170 -170)';
    const frame=look.frame==='midnight'?'level':look.frame;
  const frames={
    level: `<circle cx="100" cy="100" r="104" fill="none" stroke="#2D296E" stroke-width="10"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="#FFD813" stroke-width="10" stroke-linecap="round" pathLength="1000" stroke-dasharray="${arc}" transform="rotate(-90 100 100)"></circle><circle cx="100" cy="206" r="15" fill="#FFD813" stroke="#2D296E" stroke-width="3.5"></circle><text x="100" y="211.5" text-anchor="middle" font-size="15" font-weight="700" fill="#2D296E">${level}</text>`,
    blue: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-sky)" stroke-width="10"></circle><circle cx="100" cy="100" r="99" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".8"></circle><g fill="#FFFFFF" stroke="#2F7FE0" stroke-width="2"><path d="M14 52 a9 9 0 0 1 17 -2 a7 7 0 0 1 4 13 h-19 a6 6 0 0 1 -2 -11 z"></path><path d="M172 150 a8 8 0 0 1 15 -2 a6 6 0 0 1 3 11 h-17 a5 5 0 0 1 -1 -9 z"></path></g>`,
    green: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-green)" stroke-width="10"></circle><g fill="#40AB34"><ellipse cx="22" cy="44" rx="11" ry="5.5" transform="rotate(-45 22 44)"></ellipse><ellipse cx="36" cy="28" rx="9" ry="4.5" transform="rotate(-20 36 28)" fill="#7FCB4F"></ellipse><ellipse cx="184" cy="160" rx="11" ry="5.5" transform="rotate(-45 184 160)"></ellipse><ellipse cx="170" cy="178" rx="9" ry="4.5" transform="rotate(-70 170 178)" fill="#7FCB4F"></ellipse></g>`,
    copper: `<circle cx="100" cy="100" r="115" fill="none" stroke="#C8693A" stroke-width="3" stroke-dasharray="1.5 7"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-copper)" stroke-width="11"></circle><circle cx="100" cy="100" r="98.5" fill="none" stroke="#5A260F" stroke-width="1.5" opacity=".5"></circle>`,
    gold: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-gold)" stroke-width="12"></circle><circle cx="100" cy="100" r="98" fill="none" stroke="#FFF6C4" stroke-width="1.5"></circle><g fill="#FFD813" stroke="#D99200" stroke-width="1.5"><path d="M18 40 L21 49 L30 52 L21 55 L18 64 L15 55 L6 52 L15 49 Z"></path><path d="M186 30 L188 36 L194 38 L188 40 L186 46 L184 40 L178 38 L184 36 Z"></path><path d="M190 146 L192.5 153.5 L200 156 L192.5 158.5 L190 166 L187.5 158.5 L180 156 L187.5 153.5 Z"></path></g>`,
    orbit: `<circle cx="100" cy="100" r="104" fill="none" stroke="#2D296E" stroke-width="5"></circle><circle cx="100" cy="100" r="113" fill="none" stroke="#5B55D6" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"></circle><g class="avatar-orbit"><circle cx="100" cy="-13" r="7" fill="#FFD813" stroke="#2D296E" stroke-width="2"></circle><circle cx="2" cy="156" r="5.5" fill="#E6680C" stroke="#2D296E" stroke-width="2"></circle><circle cx="198" cy="156" r="4.5" fill="#40AB34" stroke="#2D296E" stroke-width="2"></circle></g>`
  };
    return `<svg class="avatar-studio-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs>
    <clipPath id="${id}-disc"><circle cx="100" cy="100" r="98"></circle></clipPath>
    <linearGradient id="${id}-g-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F7FE0"></stop><stop offset="1" stop-color="#9AD6FF"></stop></linearGradient>
    <linearGradient id="${id}-g-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E8A26"></stop><stop offset="1" stop-color="#A6E06A"></stop></linearGradient>
    <linearGradient id="${id}-g-copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E3F1D"></stop><stop offset=".5" stop-color="#E08A55"></stop><stop offset="1" stop-color="#9A4521"></stop></linearGradient>
    <linearGradient id="${id}-g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D99200"></stop><stop offset=".45" stop-color="#FFE36E"></stop><stop offset="1" stop-color="#E6A100"></stop></linearGradient>
    </defs>
    <g transform="translate(20 20)">
    <g clip-path="url(#${id}-disc)">
    <circle cx="100" cy="100" r="98" fill="${palette.background}"></circle>
    <circle cx="38" cy="46" r="26" fill="#FFFFFF" opacity=".4"></circle>
    <circle cx="170" cy="58" r="13" fill="#FFFFFF" opacity=".35"></circle>
    <circle cx="168" cy="150" r="44" fill="#181729" opacity=".04"></circle>

    ${hair.longBack||''}
    ${hair.bobBack||''}
    ${hair.braids||''}
    ${hair.pony||''}
    ${hair.curlsBack||''}

    <path d="M28 206 C30 166 60 148 100 148 C140 148 170 166 172 206 Z" fill="${palette.shirt}"></path>
    <path d="M100 148 C88 148 78 150 70 154 L100 182 L130 154 C122 150 112 148 100 148 Z" fill="#000000" opacity=".16"></path>
    <rect x="87" y="118" width="26" height="42" rx="12" fill="${palette.skin}"></rect>
    <path d="M87 128 L113 128 L113 138 Q100 148 87 138 Z" fill="#000000" opacity=".12"></path>
    <path d="M80 152 L100 172 L120 152" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"></path>
    <path d="M44 176 C52 166 60 162 66 162" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".18"></path>

    <circle cx="58" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="142" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="58" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <circle cx="142" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <ellipse cx="100" cy="92" rx="42" ry="46" fill="${palette.skin}"></ellipse>
    <path d="M62 104 C66 126 82 138 100 138 C118 138 134 126 138 104 C132 122 118 132 100 132 C82 132 68 122 62 104 Z" fill="#000000" opacity=".07"></path>
    <path d="M76 84 Q84 79 92 83" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <path d="M108 83 Q116 79 124 84" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <ellipse cx="84" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <ellipse cx="116" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <circle cx="86" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <circle cx="118" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <ellipse cx="73" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <ellipse cx="127" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <path d="M100 100 Q96 108 101 110" stroke="#000000" stroke-opacity=".22" stroke-width="2.5" fill="none" stroke-linecap="round"></path>
    <path d="M89 117 Q100 127 111 117" stroke="#181729" stroke-width="3" fill="none" stroke-linecap="round"></path>

    ${hair.sweep||''}
    ${hair.crop||''}
    ${hair.part||''}
    ${hair.curls||''}
    ${hair.none||''}
    ${glasses[look.glasses]||A.accessory('glasses',look.glasses)}
    </g>
    ${frames[frame]||''}
    ${hats[look.hat]||A.accessory('hat',look.hat)}
    ${look.prop==='none'?'':`<g transform="${sticker}">
      <circle cx="172" cy="174" r="23" fill="#181729" opacity=".18"></circle>
      <circle cx="170" cy="170" r="23" fill="#fff" stroke="#e7e6f0" stroke-width="2"></circle>
      ${extras[look.prop]||`<svg x="153" y="150" width="35" height="37" viewBox="105 56 110 141">${A.accessory('prop',look.prop)}</svg>`}
    </g>`}
    </g>
    </svg>`;
  }
  return Object.freeze({markup});
})();
