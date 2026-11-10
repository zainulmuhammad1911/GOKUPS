/**
 * Skrip gerak kecil yang dijalankan di <head> (tanpa React), sehingga konten tetap tampil bila
 * hidrasi gagal dan tidak ada komponen klien per kartu.
 *
 * - [data-reveal]: disembunyikan lewat CSS hanya bila html[data-motion] ada, lalu dimunculkan
 *   dengan Web Animations API saat masuk layar atau sudah terlewati (cek posisi saat menggulir,
 *   dibatasi satu kali per frame). Atribut elemen tidak
 *   diubah, jadi tidak bentrok dengan hidrasi React. Elemen baru dari navigasi klien
 *   ditangkap MutationObserver.
 * - [data-spotlight]: posisi kursor ditulis ke --mx/--my untuk lingkaran sorot.
 * Bila pengguna meminta gerak dikurangi, data-motion tidak dipasang dan semuanya langsung tampil.
 */
export const MOTION_SCRIPT = `(function(){
var d=document,h=d.documentElement,w=window;
if(!w.matchMedia||w.matchMedia('(prefers-reduced-motion: reduce)').matches||!Element.prototype.animate)return;
h.setAttribute('data-motion','');
var seen=new WeakSet(),pending=[],queued=false;
function show(el){var i=parseFloat(getComputedStyle(el).getPropertyValue('--i'))||0;
el.animate([{opacity:0,transform:'translateY(18px)',filter:'blur(6px)'},{opacity:1,transform:'none',filter:'none'}],{duration:650,delay:i*80,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});}
function check(){queued=false;var lim=w.innerHeight*0.94;pending=pending.filter(function(el){if(!el.isConnected)return false;if(el.getBoundingClientRect().top<lim){show(el);return false;}return true;});}
function queue(){if(!queued){queued=true;requestAnimationFrame(check);}}
function scan(root){if(!root.querySelectorAll)return;var list=[].slice.call(root.querySelectorAll('[data-reveal]'));if(root.matches&&root.matches('[data-reveal]'))list.push(root);list.forEach(function(el){if(!seen.has(el)){seen.add(el);pending.push(el);}});queue();}
function start(){scan(d);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n);});});}).observe(d.body,{childList:true,subtree:true});}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
w.addEventListener('scroll',queue,{passive:true});w.addEventListener('resize',queue);
d.addEventListener('pointermove',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-spotlight]');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');},{passive:true});
})();`;
