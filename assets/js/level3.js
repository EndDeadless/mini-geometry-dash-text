const c=document.getElementById("game");
const ctx=c.getContext("2d");
c.style.display="block";
c.width=innerWidth;c.height=innerHeight;

let p={x:120,y:c.height-120,s:35,vy:0};
let g=1.2,spd=11,spikes=[],t=0;

function spawn(){spikes.push({x:c.width,h:80});}

function play(){
 t++;
 ctx.clearRect(0,0,c.width,c.height);

 p.vy+=g; p.y+=p.vy;
 if(p.y>=c.height-120){p.y=c.height-120;p.vy=0;}

 ctx.fillStyle="#fff";
 ctx.fillRect(p.x,p.y,p.s,p.s);

 if(t%70===0) spawn();
 spikes.forEach(s=>{
  s.x-=spd;
  ctx.fillStyle="red";
  ctx.beginPath();
  ctx.moveTo(s.x,c.height-80);
  ctx.lineTo(s.x+40,c.height-80);
  ctx.lineTo(s.x+20,c.height-s.h);
  ctx.fill();

  if(p.x+30>s.x && p.x<s.x+40 &&
     p.y+p.s>c.height-s.h){
       alert("GAME OVER");
       location.reload();
  }
 });
 requestAnimationFrame(play);
}

addEventListener("keydown",e=>{
 if(e.code==="Space") p.vy=-18;
});
play();
