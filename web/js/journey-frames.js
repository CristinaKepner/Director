// Deliberately schematic framing, not an AI-generated depiction of the user's scene.
export function drawJourneyFrame(ctx,{framing='wide',description='',title='',brief='',index=0},w,h){
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#171321';ctx.fillRect(0,0,w,h);
  const s=Math.min(w/640,h/360);ctx.save();ctx.translate(w/2,h/2);ctx.scale(s,s);ctx.translate(-320,-180);
  const gradient=ctx.createLinearGradient(0,0,640,360);gradient.addColorStop(0,'#322146');gradient.addColorStop(1,'#151222');ctx.fillStyle=gradient;ctx.fillRect(-640,-640,1920,1640);
  ctx.strokeStyle='#746086';ctx.lineWidth=1;ctx.globalAlpha=.3;
  for(let x=0;x<700;x+=64){ctx.beginPath();ctx.moveTo(320,174);ctx.lineTo(x,360);ctx.stroke();}
  for(let y=194;y<360;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(640,y);ctx.stroke();}ctx.globalAlpha=1;
  const source=`${brief} ${description}`;
  if(/巴黎|铁塔|Paris|Eiffel/i.test(source)){
    ctx.strokeStyle='#b29ac8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(450,48);ctx.lineTo(404,224);ctx.lineTo(496,224);ctx.closePath();ctx.moveTo(428,150);ctx.lineTo(474,150);ctx.moveTo(414,196);ctx.lineTo(486,196);ctx.stroke();
    ctx.strokeStyle='#9c80c2';ctx.lineWidth=2;for(let y=235;y<275;y+=10){ctx.beginPath();ctx.moveTo(360,y);ctx.bezierCurveTo(430,y-10,550,y+10,680,y);ctx.stroke();}
  }else if(/导演台|产品|软件|应用|界面|剪辑|app/i.test(source)){
    ctx.fillStyle='#221b32';ctx.strokeStyle='#9b7db7';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(295,66,267,167,8);ctx.fill();ctx.stroke();ctx.fillStyle='#614a80';ctx.fillRect(312,83,58,94);ctx.fillStyle='#ac89de';ctx.fillRect(382,83,161,94);ctx.fillStyle='#c9b1e8';ctx.fillRect(395,96,135,66);ctx.fillStyle='#795c9e';for(let i=0;i<5;i++)ctx.fillRect(312+i*46,191,41,24);
  }else if(/海|雨|森林|花|山|自然/.test(source)){
    ctx.strokeStyle='#9778b7';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(320+i*58,224);ctx.lineTo(350+i*58,110+(i%2)*40);ctx.lineTo(380+i*58,224);ctx.stroke();}
    ctx.fillStyle='#997cbf';ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(490,82,40,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }else{ctx.strokeStyle='#826599';ctx.lineWidth=2;ctx.strokeRect(340,94,180,132);ctx.strokeRect(373,61,97,165);}
  const count=/五|5|朋友们|伙伴/.test(source)?5:/朋友|两|2|互动|一起/.test(source)?2:1;
  const scale=framing==='close'?2.2:framing==='medium'?1.3:.8;
  const people=framing==='close'?Math.min(count,2):count;
  for(let i=0;i<people;i++){
    ctx.save();ctx.translate(people===1?245:140+i*320/Math.max(1,people-1),framing==='close'?228:232+(i%2)*8);ctx.scale(scale,scale);
    ctx.strokeStyle=['#d3b9f2','#b691e0','#9374b6'][i%3];ctx.lineWidth=3;ctx.fillStyle='#453252';ctx.beginPath();ctx.ellipse(0,-94,15,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-11,-72);ctx.quadraticCurveTo(-25,-52,-19,-25);ctx.lineTo(18,-25);ctx.quadraticCurveTo(24,-53,11,-72);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-10,-25);ctx.lineTo(-17,14);ctx.moveTo(10,-25);ctx.lineTo(17,14);ctx.moveTo(-18,-59);ctx.lineTo(-38,-38-(index%2)*20);ctx.moveTo(18,-59);ctx.lineTo(38,-35-(i%2)*20);ctx.stroke();ctx.restore();
  }
  ctx.strokeStyle='#c7ace6';ctx.globalAlpha=.4;ctx.lineWidth=1;ctx.setLineDash([4,5]);ctx.strokeRect(30,24,580,310);ctx.setLineDash([]);ctx.globalAlpha=1;
  ctx.fillStyle='#c9b6da';ctx.font='13px sans-serif';ctx.fillText(({wide:'全景 · 交代关系',medium:'中景 · 观察互动',close:'近景 · 捕捉细节'})[framing],42,49);ctx.fillStyle='#ab90c8';ctx.fillText('构图草图',518,317);ctx.restore();
}
export function frameUrl(p,aspect='16:9',width=640){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width/(aspect==='9:16'?9/16:aspect==='1:1'?1:16/9));drawJourneyFrame(canvas.getContext('2d'),p,canvas.width,canvas.height);return canvas.toDataURL('image/png');}
