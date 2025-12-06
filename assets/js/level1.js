const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
canvas.style.display="block";
canvas.width=innerWidth;
canvas.height=innerHeight;

let player={x:150,y:canvas.height-120,s:40,vy:0,ground:true};
let gravity=0.9,speed=6,obs=[],frame=0;

function spawn(){
  obs.push({x:canvas.width,w:40,h:50});
}

function loop(){
 frame++;
 ctx.clearRect(0,0,canvas.width,canvas.height);

 player.vy+=gravity;
 player.y+=player.vy;
 if(player.y>=canvas.height-120){player.y=canvas.height-120;player.vy=0;player.ground=true;}

 ctx.fillStyle="#00ffff";
 ctx.fillRect(player.x,player.y,player.s,player.s);

 if(frame%120===0) spawn();
 obs.forEach(o=>{
  o.x-=speed;
  ctx.fillStyle="#ff0066";
  ctx.fillRect(o.x,canvas.height-o.h-80,o.w,o.h);

  if(player.x<o.x+o.w && player.x+player.s>o.x &&
     player.y+player.s>canvas.height-o.h-80){
       alert("FAIL LEVEL 1");
       location.reload();
  }
 });
 requestAnimationFrame(loop);
}

addEventListener("keydown",e=>{
 if(e.code==="Space" && player.ground){
  player.vy=-16;
  player.ground=false;
 }
});
loop();
