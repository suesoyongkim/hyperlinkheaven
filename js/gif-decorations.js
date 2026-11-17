(function(){
 const field=document.querySelector('.gif-wilderness');
 if(!field)return;
 const els=Array.from(field.querySelectorAll('.wild'));
 const original=els.map((el,i)=>({el,index:i,top:parseFloat(getComputedStyle(el).top)||0,left:parseFloat(getComputedStyle(el).left)||0}));
 let frame=0;
 function layout(){
   if(window.matchMedia('(max-width:1060px)').matches){original.forEach(o=>{o.el.style.top='';o.el.style.left='';});field.style.minHeight='';return;}
   const ordered=[...original].sort((a,b)=>a.top-b.top);
   let bottom=0;
   for(const o of ordered){
     const w=o.el.offsetWidth||110;
     const h=o.el.offsetHeight||90;
     const left=Math.max(0,Math.min(172-w,o.left));
     let y=Math.max(o.top,bottom+20);
     o.el.style.top=y+'px';o.el.style.left=left+'px';
     bottom=y+h;
   }
   field.style.minHeight=Math.ceil(bottom+28)+'px';
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);}
 window.addEventListener('resize',schedule,{passive:true});
 field.querySelectorAll('img').forEach(img=>{img.addEventListener('load',schedule);img.addEventListener('error',schedule);});
 if('ResizeObserver' in window){const ro=new ResizeObserver(schedule);els.forEach(el=>ro.observe(el));}
 schedule();
})();
