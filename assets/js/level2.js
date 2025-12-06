const c=document.getElementById("game");
const ctx=c.getContext("2d");
c.style.display="block";
c.width=innerWidth;c.height=innerHeight;

let p={x:150,y:c.height-120,s:40,vy:0,j:2};
let g=1,spd=8,obs=[];

function sp(){obs.push({x:c.width,w:40,h:60});}

function go(){
 ctx.clearRect(0,0,c.width,c.height);

 p.vy+=g; p.y+=p.vy;
 if(p.y>=c.height-120){p.y=c.height-120;p.vy=0;p.j=2;}

 ctx.fillStyle="#00ff9c";
 ctx.fillRect(p.x,p.y,p.s,p.s);

 if(Math.random()<0.025) sp();
 obs.forEach(o=>{
  o.x-=spd;
  ctx.fillStyle="#ff4d00";
  ctx.fillRect(o.x,c.height-o.h-80,o.w,o.h);

  if(p.x<o.x+o.w && p.x+p.s>o.x &&
     p.y+p.s>c.height-o.h-80){
       alert("FAIL LEVEL 2");
       location.reload();
  }
 });
 requestAnimationFrame(go);
}

addEventListener("keydown",e=>{
 if(e.code==="Space" && p.j>0){
  p.vy=-15; p.j--;
 }
});
go();
