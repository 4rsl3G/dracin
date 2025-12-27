const video = document.getElementById('video');
const progress = document.getElementById('progress-bar');
const playIcon = document.getElementById('playIcon');
const info = document.getElementById('episode-info');
const ads = document.getElementById('ads-slot');

let episodes = [], index = 0;
let preload = document.createElement('video');

fetch(`/api/detail/${ID}`).then(r=>r.json()).then(d=>{
  episodes = d.shortPlayEpisodeInfos.filter(e=>!e.isLock);
  index = +localStorage.getItem(ID)||0;
  load(index);
});

function load(i){
  video.src = episodes[i].playVoucher;
  info.innerText = 'Episode ' + episodes[i].episodeNo;
  video.play();
  preloadNext();
  localStorage.setItem(ID,i);
}

function preloadNext(){
  if(episodes[index+1]){
    preload.src = episodes[index+1].playVoucher;
    preload.preload = 'auto';
  }
}

video.ontimeupdate = ()=>progress.style.width = video.currentTime/video.duration*100+'%';
video.onended = ()=> episodes[index+1] && load(++index);

document.getElementById('center-btn').onclick=()=>{
  video.paused ? video.play() : video.pause();
  playIcon.className = video.paused?'ri-play-fill':'ri-pause-fill';
};

setTimeout(()=>ads.style.display='block',5000);

/* ANTI RECORD */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    video.pause();
    video.style.filter='blur(15px)';
  }else video.style.filter='none';
});

document.addEventListener('contextmenu',e=>e.preventDefault());
