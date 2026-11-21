/* ---------- POS module ---------- */
const POS=(()=>{
const DK='ncs_dev_v1';let D=null;try{D=JSON.parse(localStorage.getItem(DK))}catch(e){}
D=D||{dev:String.fromCharCode(65+Math.floor(Math.random()*26)),seq:0,held:[]};D.held=D.held||[];
const dsave=()=>{try{localStorage.setItem(DK,JSON.stringify(D))}catch(e){}};
const nowT=()=>{const x=new Date();return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')};
let C={mode:'sale',lines:[],disc:0};
const dlg=(title,body,onOk,okText,hideOk)=>{ask(title,body,onOk,okText);$('ok').style.display=hideOk?'none':''};
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
const prods=()=>S.products.filter(p=>!p.del);
const stockMap=()=>{const vb=new Set(S.bills.filter(b=>b.void).map(b=>b.id)),m={};S.moves.forEach(v=>{if(v.adminRejected||v.adminCheck&&!v.adminChecked||v.ref&&vb.has(v.ref))return;m[v.pid]=(m[v.pid]||0)+v.q});return m};
const imgH=p=>p.img?`<img class="pimg" src="${esc(p.img)}" alt="">`:`<div class="pimg">${esc((p.name||'?').trim().slice(0,1).toUpperCase())}</div>`;
const sub=()=>C.lines.reduce((s,l)=>s+l.price*l.qty,0),total=()=>Math.max(0,Math.round((sub()-(+C.disc||0))*100)/100);
const bizDate=()=>{const x=new Date();let d=iso(x);while(S.days[d]&&S.days[d].closed){x.setDate(x.getDate()+1);d=iso(x)}return d};

const r2=x=>Math.round(x*100)/100;
function discPct(){const s=sub();return s?r2((+C.disc||0)/s*100):0}
function discFix(){const s=sub();if(C.dm==='p'){C.dpct=Math.min(100,Math.max(0,+C.dpct||0));C.disc=Math.min(s,Math.round(s*C.dpct)/100)}else if((+C.disc||0)>s)C.disc=s}
function discNote(){const p=discPct(),el=$('dcn');if(p>5){el.hidden=false;el.textContent=lb('Over 5%: this bill will be flagged for Admin review.','৫% এর বেশি: বিলটি অ্যাডমিন পর্যালোচনার জন্য চিহ্নিত হবে।')}else el.hidden=true}
function discShow(){if(document.activeElement!==$('dc'))$('dc').value=C.disc||'';if(document.activeElement!==$('dp'))$('dp').value=C.dm==='p'?(C.dpct||''):(discPct()||'');discNote()}
function topSellers(){const from=iso(new Date(Date.now()-30*864e5)),c={};S.bills.filter(b=>!b.void&&!b.removed&&!b.test&&b.mode==='sale'&&b.d>=from).forEach(b=>b.lines.forEach(l=>{if(l.pid)c[l.pid]=(c[l.pid]||0)+l.qty}));
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id])=>S.products.find(p=>p.id==id)).filter(p=>p&&!p.del)}
function renderPosPresets(){
  const el=$('posPresets');
  if(!el)return;
  const list=getPresets();
  el.innerHTML=list.map(p=>`<button type="button" class="svc-chip" data-preset="${p.id}"><span>${p.icon||'⚡'}</span> <b>${S.lang==='bn'?(p.bn||p.name):p.name}</b> <small>${tk(p.price)}</small></button>`).join('');
}
function renderGrid(){renderPosPresets();const q=$('q').value.trim().toLowerCase(),sm=stockMap();
  const L=prods().filter(p=>!q||p.name.toLowerCase().includes(q)||String(p.id).toLowerCase().includes(q)||(p.barcode||'').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,80);
  $('grid').innerHTML=L.length?L.map(p=>{const s=sm[p.id]||0;return `<button class="tile" data-p="${p.id}">${imgH(p)}<div class="sb${s<=0?' low':''}">${s}</div><span>${esc(p.name)}</span><small>${tk(p.price)}</small></button>`}).join('')+(canCost()?'<div class="mut" style="grid-column:1/-1">Long-press or right-click a product to edit it.</div>':''):'<div class="empty" style="grid-column:1/-1">No products yet. Use Add Product, scan a barcode, or use Custom item.</div>';
  const T=C.mode==='sale'?topSellers():[];$('top7').style.display=T.length?'flex':'none';$('top7').innerHTML=T.map(p=>`<button data-p="${p.id}">${imgH(p)}${esc(p.name)}</button>`).join('')}
function slideInLast(){if(document.documentElement.dataset.rm)return;var rows=$('lines').children;if(!rows.length)return;var el=rows[rows.length-1];el.classList.add('slidein');setTimeout(function(){el.classList.remove('slidein')},260)}
function removeLineAnimated(i){var rows=$('lines').children,row=rows[i];if(!row||document.documentElement.dataset.rm){C.lines.splice(i,1);renderCart();return}row.classList.add('slideout');setTimeout(function(){C.lines.splice(i,1);renderCart()},200)}
function addLine(p){const pm=C.mode==='purchase',l=p.id&&C.lines.find(x=>x.pid===p.id);if(l){l.qty++;renderCart()}else{C.lines.push({pid:p.id||null,name:p.name,price:pm?(+p.buy||+p.price||0):(+p.price||0),cost:+p.buy||0,qty:1});renderCart();slideInLast()}}
function renderCart(){if(role()==='keeper')C.mode='purchase';const pm=C.mode==='purchase',sm=stockMap();
  $('ct').textContent=pm?'Purchase cart':'Sale cart';$('mS').classList.toggle('on',!pm);$('mP').classList.toggle('on',pm);$('bHeld').textContent='Held'+(D.held.length?' ('+D.held.length+')':'');
  $('lines').innerHTML=C.lines.length?C.lines.map((l,i)=>{const s=l.pid?(sm[l.pid]||0):null;return `<div class="line"><div>${esc(l.name)}${s!==null?`<small class="${!pm&&l.qty>s?'bad':''}">Stock ${s}</small>`:''}</div><input type="number" inputmode="decimal" min="0" data-pr="${i}" value="${l.price}"><div class="qty"><button data-a="m" data-i="${i}">−</button><b>${l.qty}</b><button data-a="p" data-i="${i}">+</button></div><div class="lt">${n(l.price*l.qty)}</div><button class="x" data-a="x" data-i="${i}">×</button></div>`}).join(''):'<div class="empty">Cart is empty</div>';
  discFix();$('st').textContent=n(sub());$('tt').textContent=tk(total());discShow();
  const t=pm?'Pay ':'Charge ',c=C.lines.reduce((s,l)=>s+l.qty,0);$('bPay').textContent=t+tk(total());$('bPay').disabled=!c;$('fab').textContent=c?t+tk(total())+' · '+c+' item'+(c>1?'s':''):'Cart is empty';$('fab').disabled=!c;
  const bClr=$('bClearCart');if(bClr){bClr.style.display=c?'':'none';bClr.onclick=()=>{if(confirm(lb('Clear cart?','কার্ট খালি করবেন?'))){C.lines=[];renderCart();}};}
  const badge=$('cartCountBadge');if(badge){badge.style.display=c?'':'none';badge.textContent=c+(S.lang==='bn'?' টি পণ্য':(' item'+(c>1?'s':'')))}}
const byId=id=>S.products.find(p=>p.id==id);
$('grid').addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b)addLine(byId(b.dataset.p))});
$('top7').addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b)addLine(byId(b.dataset.p))});
if($('posPresets')){$('posPresets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;const p=getPresets().find(x=>x.id===b.dataset.preset);if(p){const title=S.lang==='bn'?(p.bn||p.name):p.name;addLine({name:title,price:p.price,buy:0});toast((S.lang==='bn'?'যোগ হয়েছে: ':'Added ')+title);try{Sound.tick()}catch(x){}}});}
$('grid').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-p]');if(b&&canCost()){e.preventDefault();pForm(byId(b.dataset.p))}});
$('lines').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.dataset.i,l=C.lines[i];
  if(b.dataset.a==='p'){l.qty++;renderCart()}
  else if(b.dataset.a==='m'){if(--l.qty<1)removeLineAnimated(i);else renderCart()}
  else removeLineAnimated(i)});
$('lines').addEventListener('change',e=>{if(e.target.dataset.pr!=null){C.lines[+e.target.dataset.pr].price=+e.target.value||0;renderCart()}});
$('dc').addEventListener('input',()=>{C.dm='a';C.disc=Math.max(0,+$('dc').value||0);renderCart()});
$('dc').addEventListener('change',discShow);
$('dp').addEventListener('input',()=>{C.dm='p';C.dpct=Math.min(100,Math.max(0,+$('dp').value||0));renderCart()});
$('dp').addEventListener('change',discShow);
const bump=d=>{const cu=C.dm==='p'?(+C.dpct||0):discPct();C.dm='p';C.dpct=Math.min(100,Math.max(0,r2(cu+d)));renderCart()};
$('dpm').onclick=()=>bump(-1);$('dpp').onclick=()=>bump(1);
const setMode=m=>{if(role()==='keeper')m='purchase';C.mode=m;renderGrid();renderCart()};
$('mS').onclick=()=>setMode('sale');$('mP').onclick=()=>setMode('purchase');
$('q').addEventListener('input',()=>{renderGrid();if($('q').value.trim())$('productPanel').open=true});
$('q').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const v=$('q').value.trim();if(!v)return;handleCode(v,true);$('q').value='';renderGrid()});
function handleCode(code,typed){const P=prods(),p=P.find(x=>x.barcode&&x.barcode===code)||P.find(x=>String(x.id)===code);
  if(p){addLine(p);toast('Added '+p.name);return}
  if(typed){const m=prods().filter(x=>x.name.toLowerCase().includes(code.toLowerCase()));if(m.length===1){addLine(m[0]);return}if(m.length>1||!/^\d{6,}$/.test(code))return}
  pForm(null,code)}

let pimg='';
function shrink(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,160/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(imgCap(c,.6))};im.src=r.result};r.readAsDataURL(file)}
function pForm(p,code){pimg=p?p.img||'':'';const e=!!p,sm=stockMap();
  dlg(e?'Edit product':'New product',`<div class="pf1"><div id="pfp">${imgH({img:pimg,name:p?p.name:'?'})}</div><button type="button" class="ghost" data-cam="1">Camera</button><button type="button" class="ghost" data-gal="1">Gallery</button><input id="pi1" type="file" accept="image/*" capture="environment" hidden><input id="pi2" type="file" accept="image/*" hidden></div>
  <div class="f"><label>Name</label><input id="np1" value="${esc(p?p.name:'')}"></div><div class="f"><label>Barcode (optional)</label><input id="np2" value="${esc(p?p.barcode||'':code||'')}"></div>
  ${canCost()?`<div class="f"><label>Buying cost</label><input id="np4" type="number" inputmode="decimal" min="0" value="${p?p.buy||'':''}"></div>`:''}
  <div class="f"><label>Selling price</label><input id="np3" type="number" inputmode="decimal" min="0" value="${p?p.price:''}"></div>
  ${e?`<div class="mut">Stock now: ${sm[p.id]||0}</div>`:'<div class="f"><label>Opening stock</label><input id="np5" type="number" inputmode="decimal" min="0"></div>'}
  ${e?'<button type="button" class="ghost" id="npd" style="color:var(--neg);margin-top:8px">Delete product</button>':''}`,()=>{
    const nm=$('np1').value.trim();if(!nm)return false;const o={name:nm,barcode:$('np2').value.trim(),price:+$('np3').value||0,img:pimg};if(canCost())o.buy=+$('np4').value||0;
    if(e){Object.assign(p,o)}else{const q={id:Date.now(),buy:0,...o};S.products.push(q);const st=+($('np5')&&$('np5').value)||0;if(st>0)S.moves.push({id:'o'+q.id,pid:q.id,q:st,ref:'',t:'open',d:iso(new Date())});p=q;lg('Add product',nm)}
    save();renderGrid();if(!e&&CUR==='pos')addLine(p);if(CUR==='prod')prodUI()},e||CUR==='prod'?'Save':'Save and add');
  const show=d=>{pimg=d;$('pfp').innerHTML=imgH({img:d,name:$('np1').value||'?'})};
  $('ob').onclick=ev=>{const t=ev.target.closest('button');if(!t)return;if(t.dataset.cam)$('pi1').click();if(t.dataset.gal)$('pi2').click();
    if(t.id==='npd'){p.del=1;lg('Delete product',p.name);save();renderGrid();$('ov').hidden=true}};
  $('ob').onchange=ev=>{if(ev.target.type==='file'&&ev.target.files[0])shrink(ev.target.files[0],show)}}
$('bNew').onclick=()=>pForm(null,'');
$('bCustom').onclick=()=>dlg('Custom item',`<div class="f"><label>Item name</label><input id="ci1"></div><div class="f"><label>Price</label><input id="ci2" type="number" inputmode="decimal" min="0"></div>`,()=>{const nm=$('ci1').value.trim();if(!nm)return false;addLine({name:nm,price:+$('ci2').value||0})},'Add');
if($('bCustomInvoice'))$('bCustomInvoice').onclick=()=>openCustomInvoice();

let stream=null,scanning=false;
function stopScan(){scanning=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('sc').hidden=true}
$('scx').onclick=stopScan;
$('bScan').onclick=async()=>{
  if(!('BarcodeDetector' in window))return dlg('Scan barcode','<p>Camera scanning needs Chrome on Android. You can also use a USB or Bluetooth barcode scanner, or type the code in the search box.</p>',()=>{},'OK');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){return dlg('Scan barcode','<p>Camera access was blocked. Allow the camera for this site and try again.</p>',()=>{},'OK')}
  var _rd=$('roleDropdown');if(_rd)_rd.setAttribute('hidden','');$('sc').hidden=false;const v=$('vid');v.srcObject=stream;await v.play();scanning=true;const det=new BarcodeDetector();
  const loop=async()=>{if(!scanning)return;try{const r=await det.detect(v);if(r.length){const c=r[0].rawValue;stopScan();handleCode(c);return}}catch(e){}requestAnimationFrame(loop)};loop()};

const split=x=>{const o={};x=Math.round(x);DEN.forEach(d=>{const c=Math.floor(x/d);if(c){o[d]=c;x-=c*d}});return o};
const sumD=o=>DEN.reduce((s,d)=>s+d*(o[d]||0),0),txtD=o=>DEN.filter(d=>o[d]).map(d=>o[d]+'×'+d).join('  ')||'—';
function checkout(){const T=total();if(!C.lines.length)return;
  const pm=C.mode==='purchase',ck={pay:'Cash',rec:{},party:'',phone:'',cu:''};
  const draw=()=>{const rec=sumD(ck.rec),ch=rec-T,cash=ck.pay==='Cash';
    $('ob').innerHTML=(bizDate()!==iso(new Date())?`<div class="mut" style="margin-bottom:8px">Today is closed. This bill will be saved under ${sd(bizDate())}.</div>`:'')+`<div class="tot big"><span>${pm?'To pay':'Total'}</span><b>${tk(T)}</b></div><div class="chips">${(pm?['Cash','Mobile Banking','Bank']:['Cash','Mobile Banking','Bank','Due']).map(x=>`<button data-pay="${x}" class="${ck.pay===x?'on':''}">${x}</button>`).join('')}</div>`+
    (ck.pay==='Mobile Banking'&&!pm?`<div class="f"><label>${lb('Received into wallet','যে ওয়ালেটে এসেছে')}</label><div class="chips">${WLT_MFS.map(k=>`<button data-w="${k}" class="${(ck.w||'bk')===k?'on':''}">${wN(k)}</button>`).join('')}</div></div>`:'')+(ck.pay==='Due'&&!pm?`<div class="f"><label>${lb('Customer','কাস্টমার')}</label><select id="cpc">${cuOptHtml(ck.cu)}</select></div>`:'')+(ck.pay==='Due'&&(pm||ck.cu==='__new')?`<div class="f"><label>${pm?'Supplier name':'Customer name'}</label><input id="cpn" value="${esc(ck.party)}"></div><div class="f"><label>Phone (optional)</label><input id="cph" value="${esc(ck.phone)}"></div>`:'')+
    (cash?`<label>${pm?'Notes and coins paid out':'Notes and coins received'} <button class="ghost pbtn" data-exact="1">Exact</button></label>`+DEN.map(d=>`<div class="dn"><span>${d}</span><button data-m="${d}">−</button><b>${ck.rec[d]||0}</b><button data-pl="${d}">+</button></div>`).join('')+
      `<div class="prow"><span>${pm?'Paid':'Received'}</span><b>${tk(rec)}</b></div>`+(ch>=0?`<div class="prow"><span>${pm?'Change from supplier':'Change to give'}</span><b class="ok">${tk(ch)}</b></div>${ch?`<div class="mut">${txtD(split(ch))}</div>`:''}`:`<div class="prow bad"><span>Short by</span><b>${tk(-ch)}</b></div>`):'');
    ck.ok=cash?rec>=T:true};
  dlg(pm?'Pay supplier':'Charge',' ',async()=>{if(ck.pay==='Due'&&!pm){if(posCust(ck)===false)return false}else if(ck.pay==='Due'&&!ck.party.trim())return false;if(ck.pay==='Cash'&&!ck.ok)return false;finishBill(ck);toast('Saved')},pm?'Confirm payment':'Confirm sale');
  draw();
  $('ob').onchange=e=>{if(e.target.id==='cpc'){ck.cu=e.target.value;draw()}};
  $('ob').oninput=e=>{if(e.target.id==='cpn')ck.party=e.target.value;if(e.target.id==='cph')ck.phone=e.target.value};
  $('ob').onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
    if(d.pay){ck.pay=d.pay;if(d.pay==='Mobile Banking'&&!ck.w)ck.w='bk'}if(d.w)ck.w=d.w;if(d.pl)ck.rec[d.pl]=(ck.rec[d.pl]||0)+1;if(d.m)ck.rec[d.m]=Math.max(0,(ck.rec[d.m]||0)-1);if(d.exact)ck.rec=split(T);draw()}}
function finishBill(ck){const pm=C.mode==='purchase',T=total(),rec=ck.pay==='Cash'?ck.rec:{},chg=ck.pay==='Cash'?split(sumD(ck.rec)-T):{};
  D.seq++;dsave();const no=D.dev+D.seq,items=C.lines.map(l=>l.qty+'× '+l.name).join(', '),id=uid();
  const party=(ck.party||'').trim(),phone=(ck.phone||'').trim(),addr=(ck.addr||'').trim(),ty=pm?'Purchase':'Sale',gross=sub(),disc=+C.disc||0,discPct=gross?disc/gross*100:0;
  const b={id,no,d:bizDate(),t:nowT(),ts:Date.now(),user:U.name,mode:C.mode,desc:'POS #'+no+': '+items,lines:C.lines,subtotal:gross,disc:disc,discPct:discPct,...(discPct>5?{discountReview:{state:'pending',pct:discPct,by:U.name,at:Date.now(),note:'Discount exceeds 5% of bill subtotal'}}:{}),total:T,pay:ck.pay,party,phone,addr,rec,chg,...(ck.pay==='Mobile Banking'&&!pm?{w:ck.w||'bk'}:{}),...(ck.cuId&&!pm?{cu:ck.cuId}:{})};
  S.bills.unshift(b);S.entries.push({id,d:b.d,t:b.t,type:ty,desc:b.desc.slice(0,200),cat:'POS',pay:ck.pay,amt:T,by:U.name,party,phone,pos:1,act:null,...(b.w?{w:b.w}:{}),...(b.cu?{cu:b.cu}:{})});
  C.lines.forEach((l,i)=>{if(l.pid)S.moves.push({id:id+'-'+i,pid:l.pid,q:(pm?1:-1)*l.qty,ref:id,t:pm?'in':'sale',d:b.d})});
  if(party)(S.parties[ty]=S.parties[ty]||{})[party]=phone;
  lg('POS bill','#'+no+' '+tk(T)+' '+ck.pay);save();Sound.chaChing();saveCheck();C.lines=[];C.disc=0;C.dpct=0;C.dm='a';renderGrid();renderCart()}
$('bPay').onclick=checkout;$('fab').onclick=checkout;

// --- Bengali Amount in Words ---
function bnWords(num){
  num=Math.round(Number(num||0));
  if(num<=0)return 'শূন্য';
  var ones=['','এক','দুই','তিন','চার','পাঁচ','ছয়','সাত','আট','নয়','দশ',
    'এগারো','বারো','তেরো','চৌদ্দ','পনেরো','ষোলো','সতেরো','আঠারো','উনিশ','বিশ',
    'একুশ','বাইশ','তেইশ','চব্বিশ','পঁচিশ','ছাব্বিশ','সাতাশ','আঠাশ','উনত্রিশ','ত্রিশ',
    'একত্রিশ','বত্রিশ','তেত্রিশ','চৌত্রিশ','পঁয়ত্রিশ','ছত্রিশ','সাঁইত্রিশ','আটত্রিশ','উনচল্লিশ','চল্লিশ',
    'একচল্লিশ','বিয়াল্লিশ','তেতাল্লিশ','চুয়াল্লিশ','পঁয়তাল্লিশ','ছেচল্লিশ','সাতচল্লিশ','আটচল্লিশ','উনপঞ্চাশ','পঞ্চাশ',
    'একান্ন','বায়ান্ন','তিপ্পান্ন','চুয়ান্ন','পঞ্চান্ন','ছাপ্পান্ন','সাতান্ন','আটান্ন','উনষাট','ষাট',
    'একষট্টি','বাষট্টি','তেষট্টি','চৌষট্টি','পঁয়ষট্টি','ছেষট্টি','সাতষট্টি','আটষট্টি','উনসত্তর','সত্তর',
    'একাত্তর','বাহাত্তর','তিয়াত্তর','চুয়াত্তর','পঁচাত্তর','ছিয়াত্তর','সাতাত্তর','আটাত্তর','উনআশি','আশি',
    'একাশি','বিরাশি','তিরাশি','চুরাশি','পঁচাশি','ছিয়াশি','সাতাশি','অষ্টআশি','উনানব্বই','নব্বই',
    'একানব্বই','বিরানব্বই','তিরানব্বই','চুরানব্বই','পঁচানব্বই','ছিয়ানব্বই','সাতানব্বই','আটানব্বই','নিরানব্বই'];

  var out='';
  var crore=Math.floor(num/10000000); num%=10000000;
  var lakh=Math.floor(num/100000); num%=100000;
  var thousand=Math.floor(num/1000); num%=1000;
  var hundred=Math.floor(num/100); num%=100;
  var rest=num;

  if(crore>0) out+=bnWords(crore)+' কোটি ';
  if(lakh>0) out+=ones[lakh]+' লাখ ';
  if(thousand>0) out+=ones[thousand]+' হাজার ';
  if(hundred>0) out+=ones[hundred]+' শত ';
  if(rest>0) out+=ones[rest]+' ';

  return out.trim()+' টাকা মাত্র';
}

function invoiceNum(v){
  var value=Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  return S.lang==='bn'?toBnNum(value):value;
}
function invoiceMoney(v){return '৳ '+invoiceNum(v)}
function invoiceDate(d){
  var x=new Date(String(d||iso(new Date()))+'T00:00:00');
  if(!Number.isFinite(x.getTime()))return esc(d||'');
  if(S.lang!=='bn')return x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return toBnNum(x.getDate())+' '+months[x.getMonth()]+' '+toBnNum(x.getFullYear());
}
function invoiceTime(t){
  var parts=String(t||'00:00').split(':'),h=+parts[0]||0,m=parts[1]||'00';
  if(S.lang!=='bn')return t12(String(parts[0]).padStart(2,'0')+':'+String(m).padStart(2,'0'));
  var period=h<6?'রাত':h<12?'সকাল':h<15?'দুপুর':h<18?'বিকাল':'রাত';
  return period+' '+toBnNum((h%12)||12)+':'+toBnNum(m);
}
function invoiceMethod(b){
  var method=b.pay||'Cash';
  if(method==='Cash')return lb('Cash','নগদ');
  if(method==='Mobile Banking')return lb('Mobile Banking','মোবাইল ব্যাংকিং')+(b.w?' · '+wN(b.w):'');
  if(method==='Bank')return lb('Bank','ব্যাংক');
  if(method==='Due')return lb('Due','বাকি');
  return esc(method);
}

function invoiceMarkup(b){
  var bn=S.lang==='bn',purchase=b.mode==='purchase',voided=!!b.void;
  var lines=Array.isArray(b.lines)?b.lines:[];
  var subtotal=b.subtotal!=null?+b.subtotal:lines.reduce(function(sum,l){return sum+(+l.qty||0)*(+l.price||0)},0);
  var discount=+b.disc||0,total=b.total!=null?+b.total:subtotal-discount;
  var no=bn?toBnNum(String(b.no||'')):String(b.no||'');
  var title=purchase?lb('PURCHASE VOUCHER','ক্রয় ভাউচার'):lb('SALES INVOICE / BILL VOUCHER','ইনভয়েস / বিল ভাউচার');
  var status=voided?lb('VOID','বাতিল'):(b.pay==='Due'?lb('PAYMENT DUE','বাকি আছে'):lb('PAID','পরিশোধিত'));
  var method=invoiceMethod(b);

  var cashRec=0;
  if(b.rec&&typeof b.rec==='object'){
    cashRec=sumD(b.rec);
  }else if(typeof b.rec==='number'){
    cashRec=b.rec;
  }
  var cashChg=cashRec>total?cashRec-total:0;
  if(b.chg&&typeof b.chg==='object'){
    var sChg=sumD(b.chg);
    if(sChg>0)cashChg=sChg;
  }else if(typeof b.chg==='number'&&b.chg>0){
    cashChg=b.chg;
  }

  var rowHtml=lines.map(function(l,i){
    var qty=+l.qty||0,price=+l.price||0,amount=r2(qty*price);
    var unit=l.unit?esc(l.unit):(bn?'টি':'pc');
    return '<tr>'+
      '<td class="td-num">'+invoiceNum(i+1)+'</td>'+
      '<td><b>'+esc(l.name||'')+'</b></td>'+
      '<td class="td-qty">'+invoiceNum(qty)+'</td>'+
      '<td class="td-unit">'+unit+'</td>'+
      '<td class="td-price">'+invoiceMoney(price)+'</td>'+
      '<td class="td-amt">'+invoiceMoney(amount)+'</td>'+
    '</tr>';
  }).join('');
  if(!rowHtml)rowHtml='<tr><td colspan="6" style="text-align:center;padding:24px;color:#8793a0">'+lb('No line items','কোনো আইটেম নেই')+'</td></tr>';

  var words=b.words||(total>0?bnWords(total):'');

  return '<article class="invoice-paper" lang="'+(bn?'bn':'en')+'">'+
    (voided?'<div class="invoice-void-watermark">'+lb('VOID','বাতিল')+'</div>':'')+
    '<header class="invoice-header">'+
      '<div class="invoice-header-row">'+
        '<div class="invoice-brand-col">'+
          '<img class="invoice-logo" src="logo-icon-black.png" alt="NCS">'+
          '<div>'+
            '<div class="invoice-shop-name">'+(bn?SHOP_BN:SHOP_EN)+'</div>'+
            '<div class="invoice-shop-tagline">'+(bn?SHOP_TAGLINE_BN:SHOP_TAGLINE_EN)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="invoice-contact-col">'+
          '<div><b>'+lb('Proprietor: ','স্বত্বাধিকারী: ')+'</b>'+(bn?SHOP_PROP_BN:SHOP_PROP_EN)+'</div>'+
          '<div><b>'+lb('Mobile: ','মোবাইল: ')+'</b>'+(bn?toBnNum(SHOP_PHONES):SHOP_PHONES)+'</div>'+
          '<div><b>Email: </b>'+SHOP_EMAIL+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="invoice-address-line">'+(bn?SHOP_ADDR_BN:SHOP_ADDR_EN)+'</div>'+
    '</header>'+
    '<div class="invoice-title-bar">'+
      '<div class="invoice-doc-title">'+title+'</div>'+
      '<span class="invoice-status-badge '+(voided?'is-void':b.pay==='Due'?'is-due':'is-paid')+'">'+status+'</span>'+
    '</div>'+
    '<div class="invoice-info-grid">'+
      '<div class="invoice-info-block">'+
        '<span>'+lb('BILLED TO (CUSTOMER)','গ্রাহক / প্রতিষ্ঠান')+'</span>'+
        '<b>'+(b.party?esc(b.party):lb('Walking Customer','সাধারণ গ্রাহক'))+'</b>'+
        (b.phone?'<div style="font-size:10.5px;color:#475569;margin-top:2px">'+lb('Mobile: ','মোবাইল: ')+esc(bn?toBnNum(b.phone):b.phone)+'</div>':'')+
        (b.addr?'<div style="font-size:10.5px;color:#475569;margin-top:2px">'+lb('Address: ','ঠিকানা: ')+esc(b.addr)+'</div>':'')+
      '</div>'+
      '<div class="invoice-meta-subgrid">'+
        '<div class="invoice-info-block"><span>'+lb('INVOICE NO.','চালান নং')+'</span><b>#'+esc(no)+'</b></div>'+
        '<div class="invoice-info-block"><span>'+lb('DATE','তারিখ')+'</span><b>'+invoiceDate(b.d)+'</b></div>'+
        '<div class="invoice-info-block"><span>'+lb('TIME','সময়')+'</span><b>'+invoiceTime(b.t)+'</b></div>'+
        '<div class="invoice-info-block"><span>'+lb('SERVED BY','বিল প্রস্তুতকারী')+'</span><b>'+esc(b.user||'—')+'</b></div>'+
      '</div>'+
    '</div>'+
    '<table class="invoice-table">'+
      '<thead><tr>'+
        '<th class="th-num">#</th>'+
        '<th>'+lb('ITEM / SERVICE DESCRIPTION','পণ্যের / কাজের বিবরণ')+'</th>'+
        '<th class="th-qty">'+lb('QTY','পরিমাণ')+'</th>'+
        '<th class="th-unit">'+lb('UNIT','একক')+'</th>'+
        '<th class="th-price">'+lb('UNIT PRICE','দর (৳)')+'</th>'+
        '<th class="th-amt">'+lb('TOTAL','মোট (৳)')+'</th>'+
      '</tr></thead>'+
      '<tbody>'+rowHtml+'</tbody>'+
    '</table>'+
    '<div class="invoice-bottom-grid">'+
      '<div class="invoice-bottom-left">'+
        '<div class="invoice-pay-row"><span>'+lb('Payment Method:','পেমেন্ট পদ্ধতি:')+'</span><b>'+method+'</b></div>'+
        '<div class="invoice-pay-row"><span>'+lb('Payment Status:','পেমেন্ট অবস্থা:')+'</span><b>'+status+'</b></div>'+
        (b.pay==='Cash'&&cashRec>0?'<div class="invoice-pay-row"><span>'+lb('Cash Received:','নগদ গ্রহণ:')+'</span><b>'+invoiceMoney(cashRec)+'</b></div>':'')+
        (b.pay==='Cash'&&cashChg>0?'<div class="invoice-pay-row"><span>'+lb('Change Returned:','ফেরত প্রদান:')+'</span><b style="color:#0f766e">'+invoiceMoney(cashChg)+'</b></div>':'')+
        (b.pay==='Due'&&!voided?'<div class="invoice-pay-row" style="color:#b45309"><span>'+lb('Balance Due:','বকেয়া পরিমাণ:')+'</span><b>'+invoiceMoney(total)+'</b></div>':'')+
        (words?'<div class="invoice-words-box"><b>'+lb('In words: ','টাকার পরিমাণ কথায়: ')+'</b>'+esc(words)+'</div>':'')+
      '</div>'+
      '<div class="invoice-bottom-right">'+
        '<div class="invoice-tot-row"><span>'+lb('Subtotal:','উপমোট:')+'</span><b>'+invoiceMoney(subtotal)+'</b></div>'+
        (discount>0?'<div class="invoice-tot-row" style="color:#15803d"><span>'+lb('Discount:','ছাড়:')+'</span><b>− '+invoiceMoney(discount)+'</b></div>':'')+
        '<div class="invoice-grand-row"><span>'+lb('GRAND TOTAL:','সর্বমোট দেয়:')+'</span><b>'+invoiceMoney(total)+'</b></div>'+
        (b.pay==='Due'&&!voided?'<div class="invoice-due-alert"><span>'+lb('TOTAL DUE:','সর্বমোট বকেয়া:')+'</span><b>'+invoiceMoney(total)+'</b></div>':'')+
      '</div>'+
    '</div>'+
    (voided&&b.vr?'<div style="margin:10px 0;padding:8px 12px;background:#fef2f2;border-left:3px solid #ef4444;color:#991b1b;font-size:11px"><b>'+lb('Void Reason: ','বাতিলের কারণ: ')+'</b>'+esc(b.vr)+'</div>':'')+
    '<div class="invoice-signatures">'+
      '<div class="invoice-sign-col"><div class="invoice-sign-line">'+lb('Customer Signature','গ্রাহকের স্বাক্ষর')+'</div></div>'+
      '<div class="invoice-sign-col"><div class="invoice-sign-line">'+lb('Authorized Signatory','স্বত্বাধিকারী / অনুমোদিত স্বাক্ষর')+'</div></div>'+
    '</div>'+
    '<div class="invoice-footer-note">'+lb('Computer-generated bill · Thank you for your business.','কম্পিউটারে তৈরি চালান · আমাদের সেবা নেওয়ার জন্য ধন্যবাদ।')+'</div>'+
  '</article>';
}

function thermalSlipMarkup(b){
  var bn=S.lang==='bn',lines=Array.isArray(b.lines)?b.lines:[];
  var subtotal=b.subtotal!=null?+b.subtotal:lines.reduce(function(s,l){return s+(+l.qty||0)*(+l.price||0)},0);
  var discount=+b.disc||0,total=b.total!=null?+b.total:subtotal-discount;
  var no=bn?toBnNum(String(b.no||'')):String(b.no||'');
  var method=invoiceMethod(b);

  var cashRec=0;
  if(b.rec&&typeof b.rec==='object')cashRec=sumD(b.rec);
  else if(typeof b.rec==='number')cashRec=b.rec;
  var cashChg=cashRec>total?cashRec-total:0;
  if(b.chg&&typeof b.chg==='object')cashChg=sumD(b.chg);
  else if(typeof b.chg==='number'&&b.chg>0)cashChg=b.chg;

  var rows=lines.map(function(l){
    var qty=+l.qty||0,price=+l.price||0,amt=qty*price;
    var unitStr=l.unit?(' '+l.unit):'';
    return '<div class="ts-line"><span class="ts-item-name">'+esc(l.name||'')+'</span></div>'+
      '<div class="ts-line" style="color:#475569;font-size:10px"><span>'+invoiceNum(qty)+unitStr+' × '+invoiceMoney(price)+'</span><b>'+invoiceMoney(amt)+'</b></div>';
  }).join('');

  return '<div class="thermal-slip" lang="'+(bn?'bn':'en')+'">'+
    '<div class="ts-center ts-title">'+(bn?SHOP_BN:SHOP_EN)+'</div>'+
    '<div class="ts-center ts-sub">'+(bn?SHOP_ADDR_BN:SHOP_ADDR_EN)+'</div>'+
    '<div class="ts-center ts-sub">'+lb('Mobile: ','মোবাইল: ')+(bn?toBnNum(SHOP_PHONES):SHOP_PHONES)+'</div>'+
    '<div class="ts-divider"></div>'+
    '<div class="ts-meta ts-line"><span>'+(b.mode==='purchase'?lb('PURCHASE #','ক্রয় #'):lb('BILL #','বিল #'))+esc(no)+'</span><span>'+invoiceDate(b.d)+'</span></div>'+
    '<div class="ts-meta ts-line"><span>'+lb('Time: ','সময়: ')+invoiceTime(b.t)+'</span><span>'+lb('Cashier: ','ক্যাশিয়ার: ')+esc(b.user||'—')+'</span></div>'+
    (b.party?'<div class="ts-meta ts-line"><span>'+lb('Customer: ','গ্রাহক: ')+'<b>'+esc(b.party)+'</b></span>'+(b.phone?'<span>'+esc(bn?toBnNum(b.phone):b.phone)+'</span>':'')+'</div>':'')+
    '<div class="ts-divider"></div>'+
    rows+
    '<div class="ts-divider"></div>'+
    '<div class="ts-line"><span>'+lb('Subtotal:','উপমোট:')+'</span><b>'+invoiceMoney(subtotal)+'</b></div>'+
    (discount>0?'<div class="ts-line"><span>'+lb('Discount:','ছাড়:')+'</span><b>− '+invoiceMoney(discount)+'</b></div>':'')+
    '<div class="ts-line ts-grand"><span>'+lb('TOTAL:','সর্বমোট:')+'</span><b>'+invoiceMoney(total)+'</b></div>'+
    '<div class="ts-line"><span>'+lb('Payment:','পেমেন্ট:')+'</span><b>'+method+'</b></div>'+
    (b.pay==='Cash'&&cashRec>0?'<div class="ts-line"><span>'+lb('Cash Rec:','নগদ গ্রহণ:')+'</span><b>'+invoiceMoney(cashRec)+'</b></div>':'')+
    (b.pay==='Cash'&&cashChg>0?'<div class="ts-line"><span>'+lb('Change:','ফেরত:')+'</span><b>'+invoiceMoney(cashChg)+'</b></div>':'')+
    (b.pay==='Due'?'<div class="ts-line" style="font-weight:bold"><span>'+lb('DUE:','বকেয়া:')+'</span><b>'+invoiceMoney(total)+'</b></div>':'')+
    (b.void?'<div class="ts-center" style="font-weight:bold;margin-top:4px">*** '+lb('VOID','বাতিল')+' ***</div>':'')+
    '<div class="ts-divider"></div>'+
    '<div class="ts-center" style="font-size:10.5px;font-weight:600;margin-top:4px">'+lb('Thank you! Come again.','আমাদের সেবা নেওয়ার জন্য ধন্যবাদ!')+'</div>'+
  '</div>';
}

function rtext(b){
  var W=32,lines=Array.isArray(b.lines)?b.lines:[];
  var subtotal=b.subtotal!=null?+b.subtotal:lines.reduce(function(s,l){return s+(+l.qty||0)*(+l.price||0)},0);
  var discount=+b.disc||0,total=b.total!=null?+b.total:subtotal-discount;
  var center=function(s){s=String(s);return s.length>=W?s.slice(0,W):' '.repeat(Math.floor((W-s.length)/2))+s};
  var pair=function(a,c){a=String(a);c=String(c);return a.slice(0,Math.max(0,W-c.length-1)).padEnd(Math.max(0,W-c.length-1))+' '+c};
  var dt=sd(b.d)+' '+t12(b.t);

  var out=[
    center(SHOP_EN.toUpperCase()),
    center('Choudhury Bazar, Kamalnagar'),
    center('Mob: 01765-420566'),
    '-'.repeat(W),
    pair((b.mode==='purchase'?'PURCHASE #':'BILL #')+b.no, dt),
    pair('Cashier: '+(b.user||'—'), b.pay||'Cash'),
    '-'.repeat(W)
  ];
  if(b.party) out.push('Cust: '+String(b.party).slice(0,25));
  lines.forEach(function(l){
    out.push(String(l.name||'').slice(0,W));
    out.push(pair(String(l.qty)+(l.unit?' '+l.unit:'')+' x '+String(l.price), String(r2((+l.qty||0)*(+l.price||0)))));
  });
  out.push('-'.repeat(W), pair('Subtotal', String(subtotal)));
  if(discount) out.push(pair('Discount', '-'+String(discount)));
  out.push(pair('TOTAL', 'Tk '+String(total)));
  if(b.pay==='Due') out.push(pair('DUE BALANCE', 'Tk '+String(total)));
  if(b.void) out.push(center('*** VOID ***'));
  out.push('-'.repeat(W), center('Thank you for choosing NCS!'), '');
  return out.join('\n');
}

function printA4Invoice(b){
  var markup = typeof b === 'string' ? b : invoiceMarkup(b);
  $('receiptPrint').innerHTML = markup;
  document.body.classList.add('invoice-print');
  var cleaned = false;
  var cleanup = function(){
    if(cleaned) return;
    cleaned = true;
    document.body.classList.remove('invoice-print');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  try { window.print(); } catch(err){ console.warn('Print error:', err); }
  setTimeout(cleanup, 4000);
}

function printThermalSlip(b){
  var markup = typeof b === 'string' ? b : thermalSlipMarkup(b);
  $('receiptPrint').innerHTML = markup;
  document.body.classList.add('thermal-print');
  var cleaned = false;
  var cleanup = function(){
    if(cleaned) return;
    cleaned = true;
    document.body.classList.remove('thermal-print');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  try { window.print(); } catch(err){ console.warn('Print error:', err); }
  setTimeout(cleanup, 4000);
}

function receipt(b){
  var a4Html = invoiceMarkup(b);
  var thermalHtml = thermalSlipMarkup(b);
  var textEsc = rtext(b);

  var actions = '<div class="invoice-actionbar">' +
    '<button type="button" class="go" data-pt-a4="1">' + lb('Print A4 Invoice', 'চালান প্রিন্ট (A4)') + '</button>' +
    '<button type="button" class="go" data-pt-th="1" style="background:#0284c7">' + lb('Thermal Slip', 'রসিদ (স্লিপ)') + '</button>' +
    '<button type="button" class="ghost" data-esc="1">' + lb('⚡ ESC/POS', '⚡ থার্মাল প্রিন্টার') + '</button>' +
    '<button type="button" class="ghost" data-cp="1">' + lb('Copy Text', 'কপি') + '</button>' +
  '</div>';

  var tabs = '<div class="seg" style="margin-bottom:10px">' +
    '<button type="button" id="rcpTabA4" class="on">' + lb('A4 Invoice (চালান)', 'A4 চালান') + '</button>' +
    '<button type="button" id="rcpTabTh">' + lb('Thermal Slip (স্লিপ)', 'রসিদ স্লিপ') + '</button>' +
  '</div>';

  ask(lb('Invoice & Receipt', 'ইনভয়েস ও রসিদ'), tabs + '<div class="invoice-preview-wrap" id="rcpPreviewBox">' + a4Html + '</div>' + actions, function(){}, lb('Close', 'বন্ধ'), true);
  $('ok').style.display = 'none';

  $('rcpTabA4').onclick = function(){
    $('rcpTabA4').classList.add('on');
    $('rcpTabTh').classList.remove('on');
    $('rcpPreviewBox').innerHTML = a4Html;
  };
  $('rcpTabTh').onclick = function(){
    $('rcpTabTh').classList.add('on');
    $('rcpTabA4').classList.remove('on');
    $('rcpPreviewBox').innerHTML = thermalHtml;
  };

  $('ob').onclick = async function(e){
    var x = e.target.closest('button');
    if(!x) return;
    if(x.dataset.ptA4) printA4Invoice(b);
    if(x.dataset.ptTh) printThermalSlip(b);
    if(x.dataset.cp){
      try {
        await navigator.clipboard.writeText(textEsc);
        toast(lb('Receipt text copied', 'রসিদ টেক্সট কপি হয়েছে'));
      } catch(err){
        toast(lb('Copy failed', 'কপি করা যায়নি'));
      }
    }
    if(x.dataset.esc){
      var ok = await printThermalEscPos(textEsc);
      if(!ok) printThermalSlip(b);
    }
  };
}

// --- Custom Invoice Studio Controller ---
var _ciState = null;

function openCustomInvoice(initData){
  var isBn = S.lang === 'bn';
  var defItems = (initData && Array.isArray(initData.items) && initData.items.length)
    ? initData.items
    : [{ name: '', qty: 1, unit: isBn ? 'কপি' : 'pc', price: 0 }];

  _ciState = {
    cuId: (initData && initData.cuId) || '',
    party: (initData && initData.party) || '',
    phone: (initData && initData.phone) || '',
    addr: (initData && initData.addr) || '',
    date: (initData && initData.date) || bizDate(),
    disc: (initData && initData.disc) || 0,
    discType: (initData && initData.discType) || 'taka',
    pay: (initData && initData.pay) || 'Cash',
    w: (initData && initData.w) || 'bk',
    cashRec: 0,
    cashRecEdited: false,
    items: defItems
  };

  var modal = $('customInvoiceModal');
  if(!modal) return;
  modal.hidden = false;
  $('ciClose').onclick = function(){ modal.hidden = true; };

  renderCustomInvoiceStudio();
}
window.openCustomInvoice = openCustomInvoice;

function renderCustomInvoiceStudio(){
  var st = _ciState;
  if(!st) return;
  var isBn = S.lang === 'bn';

  var subtotal = st.items.reduce(function(sum, it){
    return sum + ((+it.qty || 0) * (+it.price || 0));
  }, 0);
  subtotal = r2(subtotal);

  var discAmt = 0;
  if(st.discType === 'percent'){
    discAmt = r2(subtotal * ((+st.disc || 0) / 100));
  } else {
    discAmt = r2(+st.disc || 0);
  }
  var grandTotal = Math.max(0, r2(subtotal - discAmt));

  if(!st.cashRecEdited){
    st.cashRec = grandTotal;
  }
  var change = Math.max(0, r2(st.cashRec - grandTotal));
  var dueAmt = st.pay === 'Due' ? grandTotal : 0;

  var custOptions = '<option value="">' + lb('-- Select saved customer / Walk-in --', '-- সংরক্ষিত কাস্টমার নির্বাচন / টাইপ করুন --') + '</option>' +
    (S.cust || []).filter(function(c){ return !c.del; }).map(function(c){
      return '<option value="' + c.id + '" ' + (String(st.cuId) === String(c.id) ? 'selected' : '') + '>' +
        esc(c.name) + (c.phone ? ' (' + esc(c.phone) + ')' : '') +
      '</option>';
    }).join('') +
    '<option value="__new">' + lb('+ Add new party', '+ নতুন কাস্টমার / পক্ষ') + '</option>';

  var shortcuts = [
    { name: isBn ? 'রুটিন / শিট ফটোকপি' : 'Photocopy', unit: isBn ? 'কপি' : 'copy', price: 2 },
    { name: isBn ? 'প্রশ্ন / ডকুমেন্ট কম্পোজ' : 'Composing', unit: isBn ? 'পাতা' : 'page', price: 30 },
    { name: isBn ? 'কম্পিউটার টাইপিং' : 'Typing', unit: isBn ? 'পাতা' : 'page', price: 25 },
    { name: isBn ? 'পিডিএফ প্রিন্ট' : 'PDF Print', unit: isBn ? 'পাতা' : 'page', price: 2 },
    { name: isBn ? 'রঙিন ছবি প্রিন্ট' : 'Color Photo Print', unit: isBn ? 'কপি' : 'copy', price: 30 },
    { name: isBn ? 'অনলাইন আবেদন / ফরম' : 'Online Form Fillup', unit: isBn ? 'টি' : 'app', price: 50 },
    { name: isBn ? 'লেমিনেটিং' : 'Lamination', unit: isBn ? 'টি' : 'pc', price: 20 },
    { name: isBn ? 'স্টেশনারী মালামাল' : 'Stationery Supply', unit: isBn ? 'টি' : 'pc', price: 10 }
  ];

  var rowsHtml = st.items.map(function(it, idx){
    var lineTot = r2((+it.qty || 0) * (+it.price || 0));
    return '<tr data-row="' + idx + '">' +
      '<td class="ci-r-num">' + (idx + 1) + '</td>' +
      '<td class="ci-r-name"><input type="text" class="ci-in-name" placeholder="' + lb('Item or service name...', 'কাজের বিবরণ (যেমন: প্রশ্ন ফটোকপি, টাইপিং)...') + '" value="' + esc(it.name) + '"></td>' +
      '<td class="ci-r-qty"><input type="number" step="any" min="0" class="ci-in-qty" value="' + (+it.qty || '') + '" placeholder="1"></td>' +
      '<td class="ci-r-unit"><input type="text" class="ci-in-unit" list="ciUnitList" placeholder="' + (isBn ? 'কপি/টি' : 'unit') + '" value="' + esc(it.unit || '') + '"></td>' +
      '<td class="ci-r-price"><input type="number" step="any" min="0" class="ci-in-price" value="' + (it.price !== undefined ? it.price : '') + '" placeholder="0"></td>' +
      '<td class="ci-r-tot">' + tk(lineTot) + '</td>' +
      '<td class="ci-r-del"><button type="button" class="ci-row-del-btn" data-del="' + idx + '" title="' + lb('Remove', 'মুছুন') + '">×</button></td>' +
    '</tr>';
  }).join('');

  var wordsBn = grandTotal > 0 ? bnWords(grandTotal) : '';

  var html = '<datalist id="ciUnitList"><option value="কপি"><option value="পাতা"><option value="টি"><option value="পিছ"><option value="সেট"><option value="বই"><option value="প্যাকেট"></datalist>' +
    '<div class="ci-grid-top">' +
      '<div class="ci-field">' +
        '<label>' + lb('Select Customer / Party', 'গ্রাহক / প্রতিষ্ঠান নির্বাচন') + '</label>' +
        '<select id="ciSelectCust">' + custOptions + '</select>' +
      '</div>' +
      '<div class="ci-field">' +
        '<label>' + lb('Customer Name', 'গ্রাহকের নাম') + '</label>' +
        '<input type="text" id="ciPartyName" placeholder="' + lb('e.g. Nurah Ali Madrasa', 'যেমন: নূরাহ আলী মাদুল্যাহ মাদ্রাসা') + '" value="' + esc(st.party) + '">' +
      '</div>' +
      '<div class="ci-field">' +
        '<label>' + lb('Mobile (optional)', 'মোবাইল (ঐচ্ছিক)') + '</label>' +
        '<input type="tel" id="ciPartyPhone" placeholder="017xxxxxxxx" value="' + esc(st.phone) + '">' +
      '</div>' +
    '</div>' +
    '<div class="ci-field" style="margin-bottom:14px">' +
      '<label>' + lb('Customer Address / Memo Note (optional)', 'গ্রাহকের ঠিকানা / নোট (ঐচ্ছিক)') + '</label>' +
      '<input type="text" id="ciPartyAddr" placeholder="' + lb('e.g. Choudhury Bazar, Kamalnagar', 'যেমন: চৌধুরী বাজার, কমলনগর, লক্ষ্মীপুর') + '" value="' + esc(st.addr) + '">' +
    '</div>' +

    '<div class="ci-shortcuts">' +
      '<div class="ci-shortcuts-label">' + lb('Quick Service Shortcuts (এক ক্লিকে যোগ করুন)', 'কুইক সার্ভিস শর্টকাট (এক ক্লিকে যোগ করুন)') + '</div>' +
      '<div class="ci-chips">' +
        shortcuts.map(function(sc, i){
          return '<button type="button" class="ci-chip" data-sc="' + i + '">' + esc(sc.name) + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div class="ci-table-wrap">' +
      '<table class="ci-table">' +
        '<thead><tr>' +
          '<th style="width:34px;text-align:center">#</th>' +
          '<th>' + lb('Item / Service Description', 'কাজের / পণ্যের বিবরণ') + '</th>' +
          '<th style="width:75px;text-align:right">' + lb('Qty', 'পরিমাণ') + '</th>' +
          '<th style="width:75px">' + lb('Unit', 'একক') + '</th>' +
          '<th style="width:90px;text-align:right">' + lb('Unit Price', 'দর (৳)') + '</th>' +
          '<th style="width:95px;text-align:right">' + lb('Total', 'মোট (৳)') + '</th>' +
          '<th style="width:34px"></th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
    '</div>' +

    '<div class="ci-add-row-bar">' +
      '<button type="button" class="ci-add-btn" id="ciAddRow">' + lb('+ Add Another Item', '+ আরেকটি আইটেম যোগ করুন') + '</button>' +
      '<span class="mut" style="font-size:12px">' + st.items.length + ' ' + lb('items added', 'টি আইটেম যুক্ত') + '</span>' +
    '</div>' +

    '<div class="ci-summary-grid">' +
      '<div class="ci-pay-box">' +
        '<label style="font-size:12px;font-weight:700;color:var(--ink)">' + lb('Payment Method', 'পরিশোধ পদ্ধতি') + '</label>' +
        '<div class="ci-pay-methods">' +
          ['Cash', 'Due', 'Mobile Banking', 'Bank'].map(function(m){
            return '<button type="button" class="ci-pay-btn ' + (st.pay === m ? 'on' : '') + '" data-pay="' + m + '">' +
              (m === 'Cash' ? lb('Cash', 'নগদ') : m === 'Due' ? lb('Due', 'বাকি') : m === 'Mobile Banking' ? lb('MFS', 'মোবাইল ব্যাংকিং') : lb('Bank', 'ব্যাংক')) +
            '</button>';
          }).join('') +
        '</div>' +
        (st.pay === 'Mobile Banking' ?
          '<div style="display:flex;gap:6px;align-items:center;margin-top:4px">' +
            '<label style="font-size:11px;color:var(--mut)">' + lb('Wallet:', 'ওয়ালেট:') + '</label>' +
            WLT_MFS.map(function(k){
              return '<button type="button" class="ci-pay-btn ' + (st.w === k ? 'on' : '') + '" data-w="' + k + '" style="font-size:11px;padding:3px 8px">' + wN(k) + '</button>';
            }).join('') +
          '</div>' : '') +
        (st.pay === 'Cash' ?
          '<div style="display:flex;gap:12px;align-items:center;margin-top:6px">' +
            '<div style="display:flex;align-items:center;gap:6px"><label style="font-size:11.5px;color:var(--mut)">' + lb('Cash Rec:', 'নগদ গ্রহণ:') + '</label><input type="number" id="ciCashRec" value="' + st.cashRec + '" style="width:90px;height:30px;padding:2px 6px;text-align:right"></div>' +
            '<div style="font-size:12px;color:#0f766e"><b>' + lb('Change:', 'ফেরত:') + ' ' + tk(change) + '</b></div>' +
          '</div>' : '') +
        (st.pay === 'Due' ?
          '<div style="font-size:12px;color:#b45309;margin-top:4px;padding:4px 8px;background:rgba(245,158,11,.1);border-radius:6px">' +
            '<b>' + lb('Due Amount:', 'বকেয়া পরিমাণ:') + ' ' + tk(dueAmt) + '</b> (' + lb('Will post to customer ledger', 'কাস্টমার খতিয়ানে জমা হবে') + ')' +
          '</div>' : '') +
        (wordsBn ? '<div class="ci-words-badge"><b>' + lb('In words: ', 'কথায়: ') + '</b>' + esc(wordsBn) + '</div>' : '') +
      '</div>' +

      '<div class="ci-totals-box">' +
        '<div class="ci-calc-line"><span>' + lb('Subtotal:', 'উপমোট:') + '</span><b>' + tk(subtotal) + '</b></div>' +
        '<div class="ci-calc-line">' +
          '<span>' + lb('Discount:', 'ছাড়:') + '</span>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<input type="number" id="ciDiscVal" min="0" step="any" value="' + (st.disc || '') + '" placeholder="0" style="width:70px;height:26px;text-align:right;font-size:12px">' +
            '<button type="button" class="ghost" id="ciDiscType" style="height:26px;padding:0 6px;font-size:11px">' + (st.discType === 'percent' ? '%' : '৳') + '</button>' +
          '</div>' +
        '</div>' +
        (discAmt > 0 ? '<div class="ci-calc-line" style="color:#15803d"><span>' + lb('Net Discount:', 'মোট ছাড়:') + '</span><b>− ' + tk(discAmt) + '</b></div>' : '') +
        '<div class="ci-grand-line"><span>' + lb('GRAND TOTAL:', 'সর্বমোট দেয়:') + '</span><b>' + tk(grandTotal) + '</b></div>' +
      '</div>' +
    '</div>' +

    '<div class="ci-actions">' +
      '<button type="button" class="ghost" id="ciCancelBtn">' + lb('Cancel', 'বাতিল') + '</button>' +
      '<button type="button" class="ghost" id="ciSaveOnlyBtn">' + lb('Save Only', 'শুধু সেভ') + '</button>' +
      '<button type="button" class="go" id="ciPrintThBtn" style="background:#0284c7">' + lb('Thermal Slip', 'রসিদ (স্লিপ)') + '</button>' +
      '<button type="button" class="go" id="ciPrintA4Btn">' + lb('Save & Print A4 Invoice', 'চালান প্রিন্ট (A4)') + '</button>' +
    '</div>';

  $('ciBody').innerHTML = html;

  // Event Listeners for inputs
  $('ciSelectCust').onchange = function(e){
    var v = e.target.value;
    st.cuId = v;
    if(v && v !== '__new'){
      var found = (S.cust || []).find(function(c){ return String(c.id) === String(v); });
      if(found){
        st.party = found.name;
        st.phone = found.phone || '';
        st.addr = found.addr || found.note || '';
        $('ciPartyName').value = st.party;
        $('ciPartyPhone').value = st.phone;
        $('ciPartyAddr').value = st.addr;
      }
    } else if(v === '__new'){
      $('ciPartyName').focus();
    }
  };

  $('ciPartyName').oninput = function(e){ st.party = e.target.value; };
  $('ciPartyPhone').oninput = function(e){ st.phone = e.target.value; };
  $('ciPartyAddr').oninput = function(e){ st.addr = e.target.value; };

  // Service Shortcut buttons
  $('ciBody').querySelectorAll('.ci-chip').forEach(function(btn){
    btn.onclick = function(){
      var sc = shortcuts[+btn.dataset.sc];
      if(!sc) return;
      var last = st.items[st.items.length - 1];
      if(last && !last.name.trim() && !last.price){
        last.name = sc.name;
        last.unit = sc.unit;
        last.price = sc.price;
      } else {
        st.items.push({ name: sc.name, qty: 1, unit: sc.unit, price: sc.price });
      }
      renderCustomInvoiceStudio();
    };
  });

  // Items table row events
  $('ciBody').querySelectorAll('tr[data-row]').forEach(function(tr){
    var idx = +tr.dataset.row;
    var row = st.items[idx];
    if(!row) return;

    tr.querySelector('.ci-in-name').oninput = function(e){ row.name = e.target.value; };
    tr.querySelector('.ci-in-qty').oninput = function(e){
      row.qty = +e.target.value || 0;
      updateStudioLiveTotals();
    };
    tr.querySelector('.ci-in-unit').oninput = function(e){ row.unit = e.target.value; };
    tr.querySelector('.ci-in-price').oninput = function(e){
      row.price = +e.target.value || 0;
      updateStudioLiveTotals();
    };
  });

  // Row deletion
  $('ciBody').querySelectorAll('.ci-row-del-btn').forEach(function(btn){
    btn.onclick = function(){
      var idx = +btn.dataset.del;
      if(st.items.length > 1){
        st.items.splice(idx, 1);
      } else {
        st.items[0] = { name: '', qty: 1, unit: isBn ? 'কপি' : 'pc', price: 0 };
      }
      renderCustomInvoiceStudio();
    };
  });

  // Add Row
  $('ciAddRow').onclick = function(){
    st.items.push({ name: '', qty: 1, unit: isBn ? 'কপি' : 'pc', price: 0 });
    renderCustomInvoiceStudio();
    var rows = $('ciBody').querySelectorAll('tr[data-row]');
    if(rows.length){
      var lastIn = rows[rows.length - 1].querySelector('.ci-in-name');
      if(lastIn) lastIn.focus();
    }
  };

  // Payment method buttons
  $('ciBody').querySelectorAll('.ci-pay-btn[data-pay]').forEach(function(btn){
    btn.onclick = function(){
      st.pay = btn.dataset.pay;
      renderCustomInvoiceStudio();
    };
  });
  $('ciBody').querySelectorAll('.ci-pay-btn[data-w]').forEach(function(btn){
    btn.onclick = function(){
      st.w = btn.dataset.w;
      renderCustomInvoiceStudio();
    };
  });

  // Cash received
  var cashRecInput = $('ciCashRec');
  if(cashRecInput){
    cashRecInput.oninput = function(e){
      st.cashRec = +e.target.value || 0;
      st.cashRecEdited = true;
      updateStudioLiveTotals();
    };
  }

  // Discount
  $('ciDiscVal').oninput = function(e){
    st.disc = +e.target.value || 0;
    updateStudioLiveTotals();
  };
  $('ciDiscType').onclick = function(){
    st.discType = st.discType === 'percent' ? 'taka' : 'percent';
    renderCustomInvoiceStudio();
  };

  // Studio Save & Print Actions
  $('ciCancelBtn').onclick = function(){ $('customInvoiceModal').hidden = true; };
  $('ciSaveOnlyBtn').onclick = function(){ commitCustomInvoice('save'); };
  $('ciPrintThBtn').onclick = function(){ commitCustomInvoice('print_th'); };
  $('ciPrintA4Btn').onclick = function(){ commitCustomInvoice('print_a4'); };
}

function updateStudioLiveTotals(){
  var st = _ciState;
  if(!st) return;
  var subtotal = st.items.reduce(function(sum, it){
    return sum + ((+it.qty || 0) * (+it.price || 0));
  }, 0);
  subtotal = r2(subtotal);

  var discAmt = 0;
  if(st.discType === 'percent'){
    discAmt = r2(subtotal * ((+st.disc || 0) / 100));
  } else {
    discAmt = r2(+st.disc || 0);
  }
  var grandTotal = Math.max(0, r2(subtotal - discAmt));

  if(!st.cashRecEdited){
    st.cashRec = grandTotal;
    if($('ciCashRec')) $('ciCashRec').value = grandTotal;
  }

  renderCustomInvoiceStudio();
}

function commitCustomInvoice(action){
  var st = _ciState;
  if(!st) return;

  var validItems = st.items.filter(function(it){
    return it.name.trim().length > 0 || (+it.price || 0) > 0;
  });

  if(!validItems.length){
    toast(lb('Please add at least one line item', 'কমপক্ষে একটি কাজের বিবরণ দিন'));
    return;
  }

  if(st.pay === 'Due' && !st.party.trim()){
    toast(lb('Customer name is required for Due bills', 'বাকি চালানের জন্য গ্রাহকের নাম আবশ্যক'));
    $('ciPartyName').focus();
    return;
  }

  var subtotal = validItems.reduce(function(sum, it){
    return sum + ((+it.qty || 0) * (+it.price || 0));
  }, 0);
  subtotal = r2(subtotal);

  var discAmt = 0;
  if(st.discType === 'percent'){
    discAmt = r2(subtotal * ((+st.disc || 0) / 100));
  } else {
    discAmt = r2(+st.disc || 0);
  }
  var grandTotal = Math.max(0, r2(subtotal - discAmt));
  var discPct = subtotal > 0 ? (discAmt / subtotal) * 100 : 0;

  D.seq++;
  dsave();
  var no = D.dev + D.seq;
  var id = uid();
  var desc = 'POS #' + no + ': ' + validItems.map(function(l){ return l.qty + '× ' + l.name; }).join(', ');

  var cuId = st.cuId;
  if(st.pay === 'Due' || st.party.trim()){
    if(cuId === '__new' || (!cuId && st.party.trim())){
      var newCust = custNew(st.party.trim(), st.phone.trim(), 'custom invoice');
      if(newCust) cuId = newCust.id;
    }
  }

  var b = {
    id: id,
    no: no,
    d: st.date || bizDate(),
    t: nowT(),
    ts: Date.now(),
    user: U.name,
    mode: 'sale',
    desc: desc,
    lines: validItems,
    subtotal: subtotal,
    disc: discAmt,
    discPct: discPct,
    total: grandTotal,
    pay: st.pay,
    party: st.party.trim(),
    phone: st.phone.trim(),
    addr: st.addr.trim(),
    words: grandTotal > 0 ? bnWords(grandTotal) : '',
    rec: st.pay === 'Cash' ? (st.cashRec || grandTotal) : {},
    chg: st.pay === 'Cash' ? Math.max(0, (st.cashRec || grandTotal) - grandTotal) : {},
    ...(st.pay === 'Mobile Banking' ? { w: st.w || 'bk' } : {}),
    ...(cuId ? { cu: cuId } : {})
  };

  S.bills.unshift(b);
  S.entries.push({
    id: id,
    d: b.d,
    t: b.t,
    type: 'Sale',
    desc: b.desc.slice(0, 200),
    cat: 'POS',
    pay: b.pay,
    amt: b.total,
    by: U.name,
    party: b.party,
    phone: b.phone,
    pos: 1,
    act: null,
    ...(b.w ? { w: b.w } : {}),
    ...(b.cu ? { cu: b.cu } : {})
  });

  if(b.party){
    (S.parties['Sale'] = S.parties['Sale'] || {})[b.party] = b.phone;
  }

  lg('Custom Invoice', '#' + no + ' ' + tk(grandTotal) + ' ' + b.pay);
  save();
  Sound.chaChing();
  saveCheck();

  $('customInvoiceModal').hidden = true;
  _ciState = null;

  if(action === 'print_a4'){
    printA4Invoice(b);
  } else if(action === 'print_th'){
    printThermalSlip(b);
  } else {
    toast(lb('Invoice saved successfully', 'চালান সফলভাবে সংরক্ষিত হয়েছে'));
    receipt(b);
  }
}
function voidBill(b){
  if(S.days[b.d]&&S.days[b.d].closed)return dlg('Day closed','<p>That day is closed. Reopen it in Accounts before voiding the bill.</p>',()=>{},'OK');
  dlg('Void bill #'+b.no,'<div class="f"><label>Reason (required)</label><input id="vr"></div><p class="mut">The matching accounts entry is voided and stock is restored. If the reason is exactly "test", the bill goes to the Test section (admin only) and is excluded from all totals.</p>',()=>{const r=$('vr').value.trim();if(!r)return false;{const e0=S.entries.find(x=>x.id===b.id);if(e0&&wltVoidBlocked(e0))return false}b.void=1;b.vr=r;const e=S.entries.find(x=>x.id===b.id);if(e){e.void=1;e.vr='POS void: '+r}if(/^test$/i.test(r)){b.test=1;if(e)e.test=1}lg('POS void','#'+b.no+' — '+r);save();toast('Voided');renderGrid();setTimeout(billsUI,0)},'Void bill')}
function removeBillPermanently(b){
  if(!isA())return;
  if(!b.void)return dlg('Not voided','<p>Void the bill first, then remove it permanently.</p>',()=>{},'OK');
  dlg('Remove permanently · #'+b.no,'<p class="mut">This hides the bill and its accounts entry everywhere, including Test. It cannot be undone from the app. Existing totals already excluded it (it is voided).</p><div class="f"><label>Reason (required)</label><input id="rrr" maxlength="160"></div>',()=>{const r=$('rrr').value.trim();if(!r)return false;b.removed=1;b.removedReason=r;b.removedBy=U.name;b.removedAt=Date.now();const e=S.entries.find(x=>x.id===b.id);if(e){e.removed=1;e.removedReason=r;e.removedBy=U.name;e.removedAt=Date.now()}lg('POS remove','#'+b.no+' — '+r);save();toast('Removed');setTimeout(billsUI,0)},'Remove permanently')}
function billsUI(){const L=S.bills.filter(b=>!b.removed&&(isA()||role()==='accountant'||b.user===U.name));
  const normal=L.filter(b=>!b.test), test=L.filter(b=>b.test);
  const A=normal.filter(b=>!b.void), sum=m=>A.filter(b=>b.mode===m).reduce((s,b)=>s+b.total,0);
  const row=b=>`<div class="prow"><span>#${esc(b.no)} · ${t12(b.t)} · ${esc(b.pay)}${b.void?' · <b class="bad">VOID</b>':''}${b.discountReview&&b.discountReview.state==='pending'?' · <b class="warn">HIGH DISCOUNT · '+n(b.discountReview.pct)+'%</b>':''}${!b.void&&S.bills.some(function(x){return x.id!==b.id&&!x.void&&!x.removed&&!x.test&&x.mode===b.mode&&x.total===b.total&&x.party===b.party&&Math.abs((x.ts||0)-(b.ts||0))<86400000})?' · <b class="warn">POSSIBLE DUPLICATE</b>':''}<br><small class="mut">${esc(b.user)}${b.mode==='purchase'?' · Purchase':''}${b.test?' · Test':''}</small><br><button class="ghost pbtn" data-rc="${b.id}">Receipt</button> <button class="ghost pbtn" data-ph="${b.id}">${lb('Photo','ছবি')} (${attN('e'+b.id)})</button>${b.discountReview&&b.discountReview.state==='pending'&&(isA()||role()==='accountant')?'<button class="ghost pbtn" data-dr="'+b.id+'">Review discount</button>':''}${isA()&&!b.void?` <button class="ghost pbtn" data-vd="${b.id}">Void</button>`:''}${isA()&&b.void?` <button class="ghost pbtn" data-rm="${b.id}">Remove</button>`:''}</span><b>${tk(b.total)}</b></div>`;
  const testHTML=(isA()&&test.length)?'<div class="testGroup"><h4>Test ('+test.length+')</h4>'+test.map(row).join('')+'</div>':'';
  dlg("Bills and review flags",`<div class="prow"><span>Sales</span><b>${tk(sum('sale'))}</b></div><div class="prow"><span>Purchases</span><b>${tk(sum('purchase'))}</b></div>`+(normal.length?normal.map(row).join(''):'<div class="empty">No bills found</div>')+testHTML,()=>{},'Close',true);
  $('ob').onclick=e=>{const r=e.target.closest('[data-rc]'),v=e.target.closest('[data-vd]'),d=e.target.closest('[data-dr]'),m=e.target.closest('[data-rm]');var ph=e.target.closest('[data-ph]');if(ph)return attUI('e'+ph.dataset.ph);if(r)receipt(S.bills.find(b=>b.id==r.dataset.rc));if(v)voidBill(S.bills.find(b=>b.id==v.dataset.vd));if(m)removeBillPermanently(S.bills.find(b=>b.id==m.dataset.rm));if(d){var bill=S.bills.find(b=>b.id==d.dataset.dr);dlg('High discount review · #'+bill.no,'<p>'+n(bill.discountReview.pct)+'% · '+tk(bill.disc)+' discount on '+tk(bill.subtotal)+'</p>',()=>{bill.discountReview.state='reviewed';bill.discountReview.reviewedBy=U.name;bill.discountReview.reviewedAt=Date.now();lg('Discount reviewed','#'+bill.no+' by '+U.name);save();setTimeout(billsUI,0)},'Mark reviewed')}}}
$('bBills').onclick=billsUI;

$('bHold').onclick=()=>{if(!C.lines.length)return;D.held.unshift({id:Date.now(),mode:C.mode,lines:C.lines,disc:C.disc,t:nowT()});C.lines=[];C.disc=0;C.dpct=0;C.dm='a';dsave();renderCart();toast('Bill held')};
function heldUI(){dlg('Held bills',D.held.length?D.held.map(h=>`<div class="prow"><span>${t12(h.t)} · ${h.lines.reduce((s,l)=>s+l.qty,0)} items · ${tk(h.lines.reduce((s,l)=>s+l.price*l.qty,0))}${h.mode==='purchase'?' · Purchase':''}</span><span><button class="ghost pbtn" data-rs="${h.id}">Resume</button> <button class="ghost pbtn" data-dh="${h.id}">Delete</button></span></div>`).join(''):'<div class="empty">No held bills</div>',()=>{},'Close',true);
  $('ob').onclick=e=>{const r=e.target.closest('[data-rs]'),d=e.target.closest('[data-dh]');
    if(r){const h=D.held.find(x=>x.id==r.dataset.rs);if(C.lines.length)D.held.unshift({id:Date.now(),mode:C.mode,lines:C.lines,disc:C.disc,t:nowT()});D.held=D.held.filter(x=>x.id!==h.id);C={mode:h.mode,lines:h.lines,disc:h.disc};dsave();renderGrid();renderCart();$('ov').hidden=true}
    if(d){D.held=D.held.filter(x=>x.id!=d.dataset.dh);dsave();heldUI()}}}
$('bHeld').onclick=heldUI;

function drawerCounts(){const base=S.drawerBase||{c:{},ts:0},o={...base.c};S.bills.forEach(b=>{if(b.void||b.removed||(b.ts||0)<=base.ts)return;const s=b.mode==='purchase'?-1:1;DEN.forEach(d=>{o[d]=(o[d]||0)+s*((b.rec[d]||0)-(b.chg[d]||0))})});DEN.forEach(d=>{o[d]=Math.max(0,o[d]||0)});return o}
$('bDrawer').onclick=()=>{const o=drawerCounts();
  dlg('Drawer notes and coins',DEN.map(d=>`<div class="prow"><span>${d}</span><b>${o[d]}</b><span class="mut">${tk(d*o[d])}</span></div>`).join('')+`<div class="prow"><b>Total</b><b>${tk(sumD(o))}</b></div>`+(isA()?'<p class="mut">Set the counts to your real notes to start or correct.</p>':''),()=>{
    if(!isA())return;dlg('Set drawer counts',DEN.map(d=>`<div class="dn"><span>${d}</span><span></span><input type="number" min="0" inputmode="numeric" data-dd="${d}" value="${o[d]}"><span></span></div>`).join(''),()=>{const c={};DEN.forEach(d=>{c[d]=Math.max(0,+$('ob').querySelector('[data-dd="'+d+'"]').value||0)});S.drawerBase={c,ts:Date.now()};lg('Drawer set','');save()},'Save');return false},isA()?'Set counts':'Close')};
let PF='all',PLN=60;const LOW=5;
function prodUI(){const sm=stockMap(),q=($('pdq').value||'').trim().toLowerCase(),A=prods(),cost=canCost(),st=A.map(p=>({p,s:sm[p.id]||0}));
  const units=st.reduce((a,x)=>a+Math.max(0,x.s),0),vc=st.reduce((a,x)=>a+Math.max(0,x.s)*(+x.p.buy||0),0),vs=st.reduce((a,x)=>a+Math.max(0,x.s)*(+x.p.price||0),0);
  const C=(l,v)=>`<div class="stat"><small>${l}</small><b>${v}</b></div>`;
  $('pdS').innerHTML=synNote()+C('Products',A.length)+C('Units in stock',n(units))+C('Low or out of stock',st.filter(x=>x.s<=LOW).length)+(cost?C('Stock value (cost)',tk(vc))+C('Stock value (selling)',tk(vs))+C('Expected profit',tk(vs-vc)):'');
  $('pdF').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.f===PF));
  const L=st.filter(x=>(!q||x.p.name.toLowerCase().includes(q)||(x.p.barcode||'').includes(q))&&(PF==='all'||(PF==='out'?x.s<=0:x.s<=LOW))).sort((a,b)=>a.p.name.localeCompare(b.p.name));
  $('pdL').innerHTML=L.length?L.slice(0,PLN).map(({p,s})=>`<div class="prd"><div>${imgH(p)}</div><div><b>${esc(p.name)}</b><div class="mut">${p.barcode?esc(p.barcode)+' · ':''}Stock <b class="${s<=0?'bad':''}">${s}</b></div><div class="mut">${cost?(p.buy?'Buy '+tk(p.buy):'<b style="color:var(--warn)">Cost not set</b>')+' · ':''}Sell ${tk(p.price)}</div></div><div class="pa"><button class="ghost pbtn" data-ad="${p.id}">Add stock</button>${(isA()||role()==='keeper')?'<button class="ghost pbtn" data-fq="'+p.id+'">Set stock</button>':''}<button class="ghost pbtn" data-ed="${p.id}">Edit</button></div></div>`).join('')+(L.length>PLN?'<div class="pgmore" data-pmore="1" role="button" tabindex="0">'+lb('Show more','আরও দেখুন')+' ('+(L.length-PLN)+')</div>':''):'<div class="empty">No products found</div>'}
function addStock(p){dlg('Add stock · '+p.name,`<div class="f"><label>Quantity</label><input id="as1" type="number" inputmode="decimal" min="0"></div>${canCost()?`<div class="f"><label>Buying cost</label><input id="as2" type="number" inputmode="decimal" min="0" value="${p.buy||''}"></div>`:''}<div class="f"><label>Selling price</label><input id="as3" type="number" inputmode="decimal" min="0" value="${p.price}"></div><div class="f"><label>How did it come?</label><select id="as4"><option value="bought">Bought</option><option value="brought">Brought in</option></select></div><div class="f"><label>Date</label><input id="as5" type="date" min="${NCS_MIN_DATE}" max="${todayIso()}" value="${todayIso()}"></div><p class="mut">This records stock only. To record paying a supplier, use POS and Purchase, which adds stock too.</p>`,()=>{
  const q=+$('as1').value;if(!(q>0))return false;if(canCost()&&$('as2').value!=='')p.buy=+$('as2').value||0;p.price=+$('as3').value||p.price;
  const sDate=$('as5').value||todayIso();
  if(sDate>todayIso()){ltoast(lb('Cannot add stock for a future date','ভবিষ্যতের তারিখে স্টক যোগ করা যাবে না'));return false}
  if(sDate<NCS_MIN_DATE){ltoast(lb('Cannot add stock before November 2020','নভেম্বর ২০২০ এর পূর্বে স্টক যোগ করা যাবে না'));return false}
  S.moves.push({id:'s'+Date.now()+'-'+p.id,pid:p.id,q,ref:'',t:'in',how:$('as4').value,d:sDate});lg('Add stock',p.name+' +'+q+' ('+$('as4').value+')');save();toast('Stock added');prodUI()},'Add stock')}
function forceStock(p){if(!(isA()||role()==='keeper')||!p)return;if(S.moves.some(v=>v.pid===p.id&&v.adminCheck&&!v.adminChecked&&!v.adminRejected)){toast('This product already has a stock change awaiting review');return}var old=stockMap()[p.id]||0;dlg('Set stock quantity · '+p.name,'<div class="f"><label>New quantity</label><input id="fq" type="number" min="0" step="any" value="'+old+'"></div><div class="f"><label>Reason (required)</label><input id="fqr" maxlength="160"></div><p class="mut">This is recorded and sent to Admin for review.</p>',()=>{var q=+$('fq').value,why=$('fqr').value.trim();if(!isFinite(q)||q<0||!why)return false;if(q===old)return false;S.moves.push({id:'force-'+Date.now()+'-'+p.id,pid:p.id,q:q-old,old:old,target:q,ref:'',t:'force',d:iso(new Date()),reason:why,by:U.name,adminCheck:1});lg('Force stock quantity',p.name+' '+old+' → '+q+' — '+why);save();prodUI();toast('Submitted for Admin review')},'Set quantity')}
$('pdL').addEventListener('click',e=>{const a=e.target.closest('[data-ad]'),b=e.target.closest('[data-ed]'),f=e.target.closest('[data-fq]');if(a)addStock(byId(a.dataset.ad));if(b)pForm(byId(b.dataset.ed));if(f)forceStock(byId(f.dataset.fq))});
$('pdNew').onclick=()=>pForm(null,'');$('pdq').addEventListener('input',()=>{PLN=60;prodUI()});$('pdL').addEventListener('click',e=>{if(e.target.closest('[data-pmore]')){PLN+=60;prodUI()}});
$('pdF').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(b){PF=b.dataset.f;PLN=60;prodUI()}});
return{refresh(){try{$('q').value=''}catch(e){}renderGrid();renderCart();if(CUR==='prod')prodUI()},setMode,bills:billsUI,prodUI,stock:pid=>stockMap()[pid]||0,stockMap:stockMap}
})();
$('q').addEventListener('focus',()=>{});
/* ---------- customer ledger + version history (v8) ---------- */
var APP_VERSION='9.7',LC=null,LT='led',LQ='',LF='',LE='',LK='';
var VERS=[
 {v:'9.5',d:'2026-10-16',t:'Party, balance carry-forward and review controls',by:'Other Claude profile (model not recorded)',n:['Party details and kinds','Start fresh carries cash and wallets','POS discounts over 5% flagged','Exact stock overrides','Energetic sync status']},
 {v:'9.4',d:'2026-10-16',t:'Sync status dot',n:['Sync dot']},
 {v:'9.3',d:'2026-10-16',t:'No due purchases',n:['Purchases cannot be saved as Due']},
 {v:'9.2',d:'2026-10-16',t:'Bkash Personal or Agent in the ledger',n:['Ledger method Bkash is Personal or Agent']},
 {v:'9.1',d:'2026-10-16',t:'Today on Accounts, Bug Fixing and Upcoming cards',n:['Accounts opens on Today']},
 {v:'9.0',d:'2026-10-16',t:'Ledger linked to cash flow',n:['Ledger entries move cash and wallets','Due sales post to customer ledger automatically']},
 {v:'8.9.1',d:'2026-10-16',t:'Fixes',by:'Claude Sonnet 5.5 · owner\'s Claude account',n:['Fixed refresh logout']},
 {v:'8.9',d:'2026-10-16',t:'Wallets',by:'Claude Sonnet 5.5 · owner\'s Claude account',n:['Wallet cards','No-below-zero','Wallet categories']},
 {v:'8.8.1',d:'2026-10-16',t:'Version history cleanup',n:['Version history rebuilt']},
 {v:'8.8',d:'2026-10-16',t:'Management tab and cash adjustment',n:['Management tab']},
 {v:'8.7',d:'2026-10-16',t:'Merged build: roles, ledger extras, Bengali',n:['Merged two parallel builds']},
 {v:'8.6',d:'2026-10-15',t:'Dabang-style Home',n:['Dabang Home']},
 {v:'8.5',d:'2026-10-15',t:'Customer card and navy dark mode',n:['Customer card']},
 {v:'8.4',d:'2026-10-15',t:'Phone drawer menu',n:['Drawer menu']},
 {v:'8.3',d:'2026-10-15',t:'ItemPOS look',n:['ItemPOS theme']},
 {v:'8.2',d:'2026-10-15',t:'Dashboard theme layer',n:['Theme tokens']},
 {v:'8.1',d:'2026-10-15',t:'Ledger date and time',n:['Ledger auto date/time']},
 {v:'8.0',d:'2026-10-15',t:'Customer Ledger',n:['Customer ledger']},
 {v:'7',d:'2026-10-14',t:'One role-based app',n:['One app']},
 {v:'6',d:'2026-10-09',t:'Separate POS app',n:['POS app']},
 {v:'5',d:'2026-10-09',t:'Backup, install and security',n:['Sync']},
 {v:'4',d:'2026-10-09',t:'Logins, controls and reports',n:['Logins']},
 {v:'3',d:'2026-10-08',t:'Accounts app: new interface',n:['Interface']},
 {v:'2',d:'2026-10-08',t:'First web tracker',n:['Web tracker']},
 {v:'1',d:'2026-10-08',t:'Excel daily accounts sheet',n:['Excel sheet']}
];
function ldlg(t,b,f,o,h){ask(t,b,f,o);$('ok').style.display=h?'none':''}
function ltoast(t){var d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},1800)}
function nowT(){var x=new Date();return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')}
function lb(a,b){return S.lang==='bn'?b:a}
function bd(s){return String(s).replace(/[০-৯]/g,function(c){return '০১২৩৪৫৬৭৮৯'.indexOf(c)})}
function parseAmt(v){var p=bd(v).replace(/[,\s]/g,'').split('+').filter(function(x){return x!==''}).map(Number);return(!p.length||p.some(function(x){return!(x>0)}))?null:p}
function lEd(){return isA()||role()==='accountant'}
function cname(){var c=S.cust.find(function(x){return x.id===LC});return c?c.name:''}
function lSort(a){return[...a].sort(function(p,q){return(p.d||'9999').localeCompare(q.d||'9999')||p.id-q.id})}
function lSubAccounts(cId){
  return S.cust.filter(function(x){return !x.del && x.parentId===cId});
}
function lCombinedBal(cId){
  var direct = lBal(cId);
  var subs = lSubAccounts(cId);
  return r2(direct + subs.reduce(function(sum, sub){return sum + lBal(sub.id)}, 0));
}
function lBal(c){return r2(S.ltx.filter(function(x){return x.c===c&&!x.void}).reduce(function(s,x){return s+(x.dir==='in'?x.amt:-x.amt)},0))}
function dr(x){return x.d?sd(x.d)+(x.d2?' – '+sd(x.d2):''):lb('Date unknown','তারিখ নেই')}
function kindLabel(k){if(k==='Borrower'||k==='Lender'||k==='Borrower/Lender')return 'Borrower/Lender';return k||'Customer'}
function kindMatch(c,kind){if(!kind)return true;return kindLabel(c.kind)===kind}
function ledRows(all,a,b){var bal=0,r=[];all.forEach(function(x){if(!x.void)bal=r2(bal+(x.dir==='in'?x.amt:-x.amt));var k=x.d||'9999';if((!a||k>=a)&&(!b||k<=b))r.push([x,bal])});return r}
function ledTable(rows,ob){
  if(LPGC!==LC){LPGC=LC;LPGN=80}
  var a=rows.filter(function(r){return!r[0].void}),ti=a.filter(function(r){return r[0].dir==='in'}).reduce(function(s,r){return s+r[0].amt},0),to=a.filter(function(r){return r[0].dir==='out'}).reduce(function(s,r){return s+r[0].amt},0);
  return '<div class="card scroll"><table class="ltb"><thead><tr><th>'+lb('Date','তারিখ')+'</th><th>'+lb('Details','বিবরণ')+'</th><th>পেলাম</th><th>দিলাম</th><th>'+lb('Balance','ব্যালেন্স')+'</th></tr></thead><tbody>'+
  (ob!=null?'<tr><td colspan="4">'+lb('Opening balance','শুরুর ব্যালেন্স')+'</td><td class="cb">'+n(ob)+'</td></tr>':'')+
  (rows.length?(rows.length>LPGN?'<tr class="lmr"><td colspan="5" data-lm="1" role="button" tabindex="0" class="pgmore">'+lb('Show earlier entries','আগের এন্ট্রি দেখুন')+' ('+(rows.length-LPGN)+')</td></tr>':'')+rows.slice(-LPGN).map(function(r){var x=r[0];return '<tr class="'+(x.void?'void':'')+'" data-a="tx" data-id="'+x.id+'"><td>'+dr(x)+(x.t?'<small style="display:block;color:var(--mut);font-size:12px">'+t12(x.t)+'</small>':'')+'</td><td class="d">'+(x.void?'<span class="b v">VOID</span>':'')+(possibleDupLedger(x)?'<span class="b ctag">Possible duplicate</span>':'')+(ledChk(x)&&lEd()?'<span class="b ctag">'+lb('Check','যাচাই')+'</span>':'')+(x.flag&&x.flag.state==='pending'?'<span class="b ctag">'+lb('Flagged','চিহ্নিত')+'</span>':'')+(x.prop&&x.prop.state==='pending'?'<span class="b ctag">'+lb('Edit pending','সম্পাদনা অপেক্ষমাণ')+'</span>':'')+(x.voidReq&&x.voidReq.state==='pending'?'<span class="b ctag">'+lb('Void pending','বাতিল অপেক্ষমাণ')+'</span>':'')+esc(x.who||'')+(x.m?' <small>'+esc(mL(x.m))+'</small>':'')+(x.parts?'<small>'+x.parts.map(n).join(' + ')+'</small>':'')+(x.note?'<small>'+esc(x.note)+'</small>':'')+'</td><td class="pos">'+(x.dir==='in'?n(x.amt):'')+'</td><td class="neg">'+(x.dir==='out'?n(x.amt):'')+'</td><td class="cb">'+n(r[1])+'</td></tr>'}).join(''):'<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--mut)">'+lb('No entries','কোনো এন্ট্রি নেই')+'</td></tr>')+
  '</tbody><tfoot><tr><td colspan="2">'+lb('Total','মোট')+'</td><td class="pos">'+n(ti)+'</td><td class="neg">'+n(to)+'</td><td class="cb">'+n((ob||0)+ti-to)+'</td></tr></tfoot></table></div>'}
function ledProfile(){
  var c=S.cust.find(function(x){return x.id===LC}),b=lBal(c.id);
  var subs=lSubAccounts(c.id),isParent=subs.length>0,combinedBal=isParent?lCombinedBal(c.id):b;
  var allTxCustIds=(window._incSubsStatement&&isParent)?[c.id].concat(subs.map(function(s){return s.id})):[c.id];
  var all=lSort(S.ltx.filter(function(x){return allTxCustIds.includes(x.c)})),act=all.filter(function(x){return!x.void}),
  ti=act.filter(function(x){return x.dir==='in'}).reduce(function(s,x){return s+x.amt},0),to=act.filter(function(x){return x.dir==='out'}).reduce(function(s,x){return s+x.amt},0),
  T=[['led',lb('Ledger','খাতা')],['stm',lb('Statement','স্টেটমেন্ট')],['note',lb('Notes','নোট')],['act',lb('Activity','লগ')]].concat(isA()||role()==='accountant'?[['void',lb('Void data','বাতিল তথ্য')+' ('+all.filter(function(x){return x.void}).length+')']]:[]),body='';
  var subAccsCard = isParent ? ('<div class="card" style="padding:12px;margin:10px 0;border-left:3px solid var(--acc)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>'+lb('Group Sub-accounts','গ্রুপ সাব-অ্যাকাউন্ট')+' ('+subs.length+')</b><span class="mut" style="font-size:12.5px">'+lb('Combined Group Due: ','গ্রুপের মোট বকেয়া: ')+'<b class="'+(combinedBal>0?'warn':combinedBal<0?'pos':'zero')+'">'+tk(Math.abs(combinedBal))+'</b></span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">'+subs.map(function(s){var sb=lBal(s.id);return '<div class="card" style="padding:8px 10px;background:var(--bg);display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:13.5px">'+esc(s.name)+'</b><small style="display:block;color:var(--mut);font-size:11px">'+(s.phone?esc(s.phone):kindLabel(s.kind))+'</small></div><div style="text-align:right"><b class="'+(sb>0?'warn':sb<0?'pos':'zero')+'">'+tk(Math.abs(sb))+'</b><button type="button" class="ghost" data-a="opensub" data-id="'+s.id+'" style="margin-left:6px;padding:2px 8px;font-size:11.5px">'+lb('View','দেখুন')+'</button></div></div>'}).join('')+'</div></div>') : '';
  if(LT==='led')body=subAccsCard+ledFilt()+ledTable(ledFlt(ledRows(act,'','')),null);
  else if(LT==='stm'){
    var ob=LF?all.filter(function(x){return!x.void&&(x.d||'9999')<LF}).reduce(function(s,x){return s+(x.dir==='in'?x.amt:-x.amt)},0):null;
    var incSubsToggle=isParent?'<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" data-a="incsubs" style="width:auto;height:auto" '+(window._incSubsStatement?'checked':'')+'> '+lb('Combined Group Statement (All sub-accounts)','গ্রুপ স্টেটমেন্ট (সব সাব-অ্যাকাউন্টসহ)')+'</label>':'';
    body='<div class="card noprint" style="padding:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:end"><div><label>'+lb('From','থেকে')+'</label><input id="lsa" type="date" value="'+LF+'"></div><div><label>'+lb('To','পর্যন্ত')+'</label><input id="lse" type="date" value="'+LE+'"></div><button class="ghost" data-a="print">'+lb('Print / Save PDF','প্রিন্ট / পিডিএফ')+'</button><button class="ghost" data-a="img">'+lb('Share image','ছবি শেয়ার')+'</button><button class="ghost" data-a="csv">CSV</button>'+incSubsToggle+'</div><div class="lph"><h2>'+esc(shopN())+'</h2><div>'+esc(c.name)+' · '+esc(c.phone||'')+(window._incSubsStatement&&isParent?' · ['+lb('Combined Group Statement','সম্মিলিত গ্রুপ স্টেটমেন্ট')+']':'')+' · '+(LF?sd(LF):'…')+' – '+(LE?sd(LE):sd(iso(new Date())))+'</div></div>'+ledTable(ledRows(act,LF,LE),ob)}
  else if(LT==='void')body=ledVoidTab(all);else if(LT==='note')body='<div class="card" style="padding:14px"><textarea id="lnt" rows="6" style="width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;color:inherit">'+esc(c.note||'')+'</textarea><div style="margin-top:10px"><button class="go" data-a="savenote">'+lb('Save','সংরক্ষণ')+'</button></div></div>';
  else{var L=S.log.filter(function(l){return String(l.a).indexOf('Ledger')===0&&String(l.d).indexOf(c.name+' ·')===0});body='<div class="card lg" style="padding:6px 14px">'+(L.length?L.map(function(l){return '<div><b>'+esc(l.a)+'</b> <small>'+esc(l.ts)+' · '+esc(l.u)+'</small><br>'+esc(l.d)+'</div>'}).join(''):'<div class="mut">'+lb('No activity yet','কোনো কার্যক্রম নেই')+'</div>')+'</div>'}
  var moreMenuHtml='<div class="led-more-wrap" style="position:relative;display:inline-block">'
    +'<button type="button" class="ghost" data-a="ledmore" aria-label="'+lb('More actions','আরও অপশন')+'" style="font-weight:700;padding:0 12px">⋯ '+lb('More','আরও')+'</button>'
    +'<div id="ledMoreMenu" class="sg" style="right:0;left:auto;min-width:180px;display:none;position:absolute;z-index:20">'
    +'<div class="si" data-a="borrow"><span>+ '+lb('Borrow','হাওলাত আনলাম')+'</span></div>'
    +'<div class="si" data-a="lend"><span>+ '+lb('Lend','হাওলাত দিলাম')+'</span></div>'
    +(lEd()?'<div class="si" data-a="due"><span>'+lb('Due date','নির্ধারিত তারিখ')+'</span></div>':'')
    +(isA()?'<div class="si" data-a="editc"><span>'+lb('Edit party','সম্পাদনা')+'</span></div>':'')
    +'</div></div>';
  return '<header class="noprint"><div><button class="ghost" data-a="back">‹ '+lb('All customers','সব কাস্টমার')+'</button></div><div class="nav" style="display:flex;gap:6px;align-items:center"><button class="go" data-a="in">+ পেলাম</button><button class="go" data-a="out" style="background:var(--neg)">+ দিলাম</button>'+moreMenuHtml+'</div></header>'+ledPC(c,b,act)+ledChkBar(c)+ledDueBar(c)+
  '<div class="lst noprint"><div class="stat main"><small>'+lb('Balance','ব্যালেন্স')+'</small><b class="'+(b>0?'warn':b<0?'pos':'zero')+'">'+tk(Math.abs(b))+'</b><i>'+(b===0?lb('Settled','মিটে গেছে'):b>0?esc(c.name)+' '+lb('gets (we owe)','পাবে (আমরা দেব)'):esc(c.name)+' '+lb('owes us','দেবে (আমরা পাব)'))+'</i></div>'
  +(isParent?'<div class="stat main" style="border-left:2px solid var(--acc)"><small>'+lb('Combined Group Due','গ্রুপের মোট বকেয়া')+'</small><b class="'+(combinedBal>0?'warn':combinedBal<0?'pos':'zero')+'">'+tk(Math.abs(combinedBal))+'</b><i>'+subs.length+' '+lb('sub-accounts linked','টি সাব-অ্যাকাউন্ট যুক্ত')+'</i></div>':'')
  +'<div class="stat"><small>পেলাম</small><b class="pos">'+tk(ti)+'</b></div><div class="stat"><small>দিলাম</small><b class="neg">'+tk(to)+'</b></div></div>'+
  '<div class="ptabs noprint">'+T.map(function(t){return '<button data-a="tab" data-t="'+t[0]+'" class="'+(LT===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div>'+body}
var LS='all',LI=null,LP=0,LPAL=['#DCD8F0','#D4F8FC','#FFE9BC','#B1F1CC','#F8D4C8'];
function lAv(c,k){return c.img?'<img class="'+k+'" src="'+esc(c.img)+'" alt="">':'<div class="'+k+'" style="background:'+LPAL[c.id%5]+'">'+esc((c.name||'?').trim().slice(0,1).toUpperCase())+'</div>'}
function lShrink(f,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,200/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(imgCap(c,.7))};im.src=r.result};r.readAsDataURL(f)}
function lNum(p){var d=bd(p||'').replace(/\D/g,'');if(!d)return'';if(d.indexOf('880')===0)return d;if(d[0]==='0')return'88'+d;return'880'+d}
function dueNoticeText(c,amt){
  var s=shopN(),a=Math.abs(amt);
  return 'নমস্কার/সালাম '+c.name+', '+s+'-এ আপনার বকেয়া হিসাবের পরিমাণ ৳'+n(a)+'। অনুগ্রহ করে দ্রুত পরিশোধের অনুরোধ করা হলো। ধন্যবাদ।';
}
function lLinks(c){
  var n=lNum(c.phone),f=(c.fb||'').trim(),h=f?(/^https?:\/\//i.test(f)?f:'https://facebook.com/'+encodeURIComponent(f.replace(/^@/,''))):'';
  var b=lBal(c.id);
  var dueMsg=(b<0)?encodeURIComponent(dueNoticeText(c,b)):'';
  var waHref=n?('https://wa.me/'+n+(dueMsg?'?text='+dueMsg:'')):'';
  var smsHref=n?('sms:+'+n+(dueMsg?(navigator.userAgent&&/iPhone|iPad|iPod/i.test(navigator.userAgent)?'&body=':'?body=')+dueMsg:'')):'';
  var hasDue=(b<0&&n);
  if(!n&&!h)return'';
  return'<div class="lcl">'+(n?'<a class="lk" href="tel:+'+n+'">'+lb('Call','কল')+'</a>'+
    (hasDue?'<a class="lk" href="'+smsHref+'" title="'+lb('Send SMS due reminder','বকেয়া তাগাদা SMS')+'">'+lb('SMS due','বকেয়া SMS')+'</a>':'<a class="lk" href="sms:+'+n+'">SMS</a>')+
    (hasDue?'<a class="lk" target="_blank" rel="noopener" href="'+waHref+'" title="'+lb('Send WhatsApp due reminder','বকেয়া তাগাদা WhatsApp')+'">'+lb('WhatsApp due','বকেয়া WhatsApp')+'</a>':'<a class="lk" target="_blank" rel="noopener" href="https://wa.me/'+n+'">WhatsApp</a>'):'')+
    (h?'<a class="lk" target="_blank" rel="noopener" href="'+esc(h)+'">Facebook</a>':'')+'</div>'
}
function possibleDupLedger(x){if(x.dupDismissed||x.void)return false;return S.ltx.some(function(y){return y.id!==x.id&&!y.void&&!y.dupDismissed&&y.c===x.c&&y.dir===x.dir&&y.amt===x.amt&&Math.abs((y.id||0)-(x.id||0))<86400000})}
function lStat(c){var a=S.ltx.filter(function(x){return x.c===c.id&&!x.void}),ti=0,to=0;a.forEach(function(x){if(x.dir==='in')ti+=x.amt;else to+=x.amt});return{ti:ti,to:to,b:ti-to,n:a.length,l:a.slice().sort(function(p,q){return q.id-p.id})[0]||null}}
function ledSum(c){var s=lStat(c),b=s.b;return'<div class="lsh">'+lAv(c,'lav')+'<div><b>'+esc(c.name)+'</b><small>'+esc(c.phone||'–')+'</small></div></div><div class="lss"><div><small>পেলাম</small><b class="pos">'+tk(s.ti)+'</b></div><div><small>দিলাম</small><b class="neg">'+tk(s.to)+'</b></div><div><small>'+lb('Balance','ব্যালেন্স')+'</small><b>'+(b===0?lb('Settled','মিটেছে'):tk(Math.abs(b))+' '+(b>0?lb('we owe','আমরা দেব'):lb('they owe','আমরা পাব')))+'</b></div></div><small class="mut">'+s.n+' '+lb('entries','এন্ট্রি')+(s.l?' · '+lb('last','শেষ')+': '+(s.l.d?sd(s.l.d):'?')+(s.l.t?' '+t12(s.l.t):''):'')+'</small><div class="lsb"><button class="ghost" data-k="o" data-id="'+c.id+'">'+lb('Open','খুলুন')+'</button>'+(isA()?'<button class="ghost" data-k="e" data-id="'+c.id+'">'+lb('Edit','সম্পাদনা')+'</button>':'')+'</div>'+lLinks(c)}
function lAct(e,close){var b=e.target.closest('[data-k]');if(!b)return;var id=+b.dataset.id;close();if(b.dataset.k==='o'){LC=id;LT='led';LF=LE='';ledUI();scrollTo(0,0)}else if(b.dataset.k==='e')ledCust(id)}
function ledList(){
  var q=LQ.toLowerCase(),all=S.cust.filter(function(c){return!c.del&&kindMatch(c,LK)}),rec=0,pay=0,ti=0,to=0,nd=0,np=0,rows=all.map(function(c){var s=lStat(c);ti+=s.ti;to+=s.to;if(s.b<0){rec-=s.b;nd++}else if(s.b>0){pay+=s.b;np++}return{c:c,s:s}}),
  cs=rows.filter(function(r){return(r.c.name+' '+(r.c.phone||'')).toLowerCase().includes(q)&&(LS==='all'||(LS==='they'&&r.s.b<0)||(LS==='we'&&r.s.b>0)||(LS==='ok'&&r.s.b===0)||(LS==='chk'&&lChkN(r.c)>0)||(LS==='flag'&&ledFlagN(r.c)>0)||(LS==='due'&&!!dueState(r.c)))}).sort(function(a,b){return LS==='all'?a.c.name.localeCompare(b.c.name):Math.abs(b.s.b)-Math.abs(a.s.b)}),
  F=[['all',lb('All','সব')],['they',lb('They owe','পাবো')],['we',lb('We owe','দেবো')],['ok',lb('Settled','মিটেছে')]].concat(lEd()?[['chk',lb('Check','যাচাই')+' ('+all.filter(function(c){return lChkN(c)>0}).length+')']]:[]).concat(lEd()?[['flag',lb('Flagged','চিহ্নিত')+' ('+all.filter(function(c){return ledFlagN(c)>0}).length+')'],['due',lb('Due','তারিখ')+' ('+all.filter(function(c){return dueState(c)}).length+')']]:[]).concat(isA()?[['arc',lb('Archive','আর্কাইভ')+' ('+S.cust.filter(function(c){return c.del}).length+')']]:[]),
  KT=[['','All kinds'],['Customer','Customer'],['Investor','Investor'],['Supplier','Supplier'],['Borrower/Lender','Borrower/Lender']],
  T=function(k,h,v,m){return'<div class="stat '+k+'"><small>'+h+'</small><b>'+v+'</b><i>'+m+'</i></div>'};
  return'<header><div><div class="shop">'+lb('Customer ledger','কাস্টমার খাতা')+'</div><h1>'+lb('Customers','কাস্টমার')+'</h1></div><button class="go" data-a="newc">+ '+lb('Customer','কাস্টমার')+'</button></header>'+
  '<div class="lsm">'+T('d1',lb('Total dues (they owe us)','মোট পাওনা'),tk(rec),nd+' '+lb('parties','পক্ষ'))+T('d2',lb('Total payable (we owe)','মোট দেনা'),tk(pay),np+' '+lb('parties','পক্ষ'))+T('d3',lb('Net position','নিট অবস্থা'),tk(Math.abs(rec-pay)),rec>=pay?lb('Net receivable','নিট পাওনা'):lb('Net payable','নিট দেনা'))+T('d4',lb('Borrow / Lend net','Borrow / Lend'),tk(Math.abs(S.ltx.filter(function(x){return!x.void&&x.btype}).reduce(function(a,x){return a+(x.dir==='in'?x.amt:-x.amt)},0))),S.ltx.filter(function(x){return!x.void&&x.btype==='Borrow'}).length+' Borrow · '+S.ltx.filter(function(x){return!x.void&&x.btype==='Lend'}).length+' Lend')+'</div>'+ledTopBar()+ledDueTop()+
  '<div class="ptabs kindTabs">'+KT.map(function(f){return'<button data-a="kind" data-f="'+f[0]+'" class="'+(LK===f[0]?'on':'')+'">'+f[1]+'</button>'}).join('')+'</div>'+
  '<input id="lq" value="'+esc(LQ)+'" placeholder="'+lb('Search name or phone','নাম বা ফোন খুঁজুন')+'" style="margin-bottom:10px"><div class="ptabs">'+F.map(function(f){return'<button data-a="flt" data-f="'+f[0]+'" class="'+(LS===f[0]?'on':'')+'">'+f[1]+'</button>'}).join('')+'</div>'+
  (LS==='arc'&&isA()?ledArch():cs.length?'<div class="lcg">'+cs.map(function(r){var c=r.c,s=r.s,b=s.b;var subCnt=lSubAccounts(c.id).length,pCust=c.parentId?S.cust.find(function(x){return !x.del&&x.id===c.parentId}):null;var parentLabel=pCust?'<small class="mut" style="display:block;font-size:11px">↳ '+lb('Parent: ','অভিভাবক: ')+esc(pCust.name)+'</small>':'';var groupBadge=subCnt>0?'<span class="b o" style="font-size:10.5px;margin-left:4px">'+subCnt+' '+lb('sub-accounts','সাব-অ্যাকাউন্ট')+'</span>':'';return'<div class="card lcc" data-a="open" data-id="'+c.id+'">'+lAv(c,'lav')+'<div class="lci"><b>'+esc(c.name)+'</b>'+groupBadge+parentLabel+'<small>'+esc(c.phone||'')+(c.kind?' · '+esc(kindLabel(c.kind)):'')+(dueState(c)?' · '+lb('Due ','তারিখ ')+sd(c.due):'')+'</small></div><div class="lcb '+(b>0?'warn':b<0?'pos':'zero')+'">'+(b===0?'–':tk(Math.abs(b)))+'<small>'+(b>0?lb('We owe','আমরা দেব'):b<0?lb('They owe','আমরা পাব'):lb('Settled','মিটেছে'))+'</small></div></div>'}).join('')+'</div>':'<div class="card"><div class="empty">'+lb('No parties found','কোনো পক্ষ পাওয়া যায়নি')+'</div></div>')}
function ledPC(c,b,act){
  var l=act.slice().sort(function(p,q){return q.id-p.id})[0]||null,sn=new Date(c.id),
  pCust=c.parentId?S.cust.find(function(x){return !x.del&&x.id===c.parentId}):null,
  parentBadge=pCust?'<div style="margin-top:4px"><span class="b o" role="button" tabindex="0" data-a="openparent" data-id="'+pCust.id+'" style="cursor:pointer;font-size:12px">↳ '+lb('Parent: ','অভিভাবক: ')+esc(pCust.name)+' ('+tk(Math.abs(lBal(pCust.id)))+')</span></div>':'',
  tl=function(k,p,h,v){return'<div class="pt2 '+k+'"><span class="pti"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg></span><div><b>'+h+'</b><small>'+v+'</small></div></div>'};
  return'<div class="card pc noprint"><div class="pci">'+lAv(c,'pav')+'<div class="pn">'+esc(c.name)+'</div>'+parentBadge+'<div class="pph">'+esc(c.phone||lb('No phone','ফোন নেই'))+'</div>'+lLinks(c)+(c.kind||c.addr||c.rel?'<div class="mut" style="margin-top:8px;font-size:12px">'+[kindLabel(c.kind),c.addr,c.rel].filter(Boolean).map(esc).join(' · ')+'</div>':'')+'</div><div class="pct">'+
  tl('a','<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',lb('Phone','ফোন'),esc(c.phone||'–'))+
  tl('b','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',lb('Last entry','শেষ এন্ট্রি'),l?tk(l.amt)+' · '+(l.d?sd(l.d):'?')+(l.t?' '+t12(l.t):''):'–')+
  tl('c','<path d="M4 7h16M4 12h16M4 17h10"/>',lb('Balance','ব্যালেন্স'),b===0?lb('Settled','মিটে গেছে'):tk(Math.abs(b))+' '+(b>0?lb('we owe','আমরা দেব'):lb('they owe','আমরা পাব')))+
  tl('d','<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',lb('Since','থেকে'),isNaN(sn)?'–':sd(iso(sn)))+'</div></div>'}
function ledCust(id){
  var c=id?S.cust.find(function(x){return x.id===id}):null;LI=c&&c.img?c.img:null;
  var curKind=kindLabel(c&&c.kind);
  var pv=function(){var nm=($('lcn')&&$('lcn').value)||(c&&c.name)||'?';$('lcpv').innerHTML=LI?'<img class="lav" src="'+esc(LI)+'" alt="">':'<div class="lav" style="background:'+LPAL[(c?c.id:0)%5]+'">'+esc(nm.trim().slice(0,1).toUpperCase())+'</div>'};
  var parents = S.cust.filter(function(x){ return !x.del && (!c || (x.id !== c.id && x.parentId !== c.id)); });
  var parentOpts = '<option value="">-- '+lb('None (Standalone Account)','কোনোটি নয় (স্বতন্ত্র অ্যাকাউন্ট)')+' --</option>' +
    parents.map(function(p){ return '<option value="'+p.id+'"'+(c&&c.parentId===p.id?' selected':'')+'>'+esc(p.name)+' ('+esc(kindLabel(p.kind))+')</option>'; }).join('');
  ask(c?lb('Edit party','পক্ষ সম্পাদনা'):lb('New party','নতুন পক্ষ'),'<div class="pf1"><span id="lcpv"></span><button type="button" class="ghost" data-lc="cam">'+lb('Camera','ক্যামেরা')+'</button><button type="button" class="ghost" data-lc="gal">'+lb('Gallery','গ্যালারি')+'</button><button type="button" class="ghost" data-lc="rm">'+lb('Remove','সরান')+'</button><input id="lci1" type="file" accept="image/*" capture="environment" hidden><input id="lci2" type="file" accept="image/*" hidden></div><div class="f"><label>'+lb('Name','নাম')+'</label><input id="lcn" maxlength="60" value="'+esc(c?c.name:'')+'"></div><div class="f"><label>'+lb('Kind','ধরন')+'</label><select id="lck">'+['Customer','Investor','Supplier','Borrower/Lender'].map(function(k){return'<option'+(curKind===k?' selected':'')+'>'+k+'</option>'}).join('')+'</select></div><div class="f"><label>'+lb('Parent account (Optional for group / family / branches)','মূল অভিভাবক অ্যাকাউন্ট (গ্রুপ / পরিবার / ব্রাঞ্চের জন্য ঐচ্ছিক)')+'</label><select id="lcParent">'+parentOpts+'</select></div><div class="f"><label>'+lb('Phone (optional)','ফোন (ঐচ্ছিক)')+'</label><input id="lcp" type="tel" maxlength="20" value="'+esc(c?c.phone||'':'')+'"></div><div class="f"><label>'+lb('Address','ঠিকানা')+'</label><input id="lca" maxlength="180" value="'+esc(c?c.addr||'':'')+'"></div><div class="f"><label>'+lb('Relationship','সম্পর্ক')+'</label><input id="lcr" maxlength="80" value="'+esc(c?c.rel||'':'')+'"></div><div class="f"><label>'+lb('Facebook link or username (optional)','ফেসবুক লিংক বা ইউজারনেম (ঐচ্ছিক)')+'</label><input id="lcf" maxlength="120" value="'+esc(c?c.fb||'':'')+'"></div>'+(c&&isA()?'<div class="f"><button type="button" class="ghost" data-lc="del" style="color:var(--neg)">'+lb('Archive party','পক্ষ আর্কাইভ করুন')+'</button></div>':''),function(){
    var nm=$('lcn').value.trim();if(!nm){$('lcn').style.borderColor='var(--neg)';return false}
    if(S.cust.some(function(x){return!x.del&&(!c||x.id!==c.id)&&x.name.toLowerCase()===nm.toLowerCase()})){ltoast(lb('Name already exists','এই নামে আছে'));return false}
    var pid=$('lcParent')?(+$('lcParent').value||null):null;
    var o={name:nm,kind:$('lck').value,parentId:pid,phone:$('lcp').value.trim(),addr:$('lca').value.trim(),rel:$('lcr').value.trim(),fb:$('lcf').value.trim(),img:LI||''};
    if(c){Object.assign(c,o);lg('Ledger party','Edited '+nm)}else{var k=Object.assign({id:Date.now(),note:''},o);S.cust.push(k);LC=k.id;LT='led';lg('Ledger party','Added '+nm+' ('+o.kind+')')}
    save();ledUI()},lb('Save','সংরক্ষণ'));
  pv();$('lcn').oninput=pv;
  $('ob').onclick=function(e){var b=e.target.closest('[data-lc]');if(!b)return;var k=b.dataset.lc;if(k==='cam')$('lci1').click();else if(k==='gal')$('lci2').click();else if(k==='del'){$('ov').hidden=true;ledDel(c.id)}else{LI=null;pv()}};
  $('ob').onchange=function(e){var f=e.target.files&&e.target.files[0];if(f)lShrink(f,function(d){LI=d;pv()})}}
