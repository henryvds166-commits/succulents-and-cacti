const C=window.COLLECTION;
const DB_NAME=C.dbName, DB_VERSION=2, STORE='plants', TSTORE='treatments';
const $=id=>document.getElementById(id); let db, plants=[], treatments=[], favouritesOnly=false;
const demo=C.demo;
const FAMILY_BY_GENUS=C.familyByGenus;
function suggestFamily(g){return FAMILY_BY_GENUS[(g||'').trim().toLowerCase()]||'';}
const closedFamilies=new Set(),openGenera=new Set(),closedGenera=new Set();let viewMode='cards';try{viewMode=localStorage.getItem('viewMode')||'cards';}catch{}
const OLD_DEMO_IDS=['demo-echinocactus-grusonii','demo-echeveria-elegans','demo-aloe-arborescens','demo-stapelia-gigantea','demo-huernia-zebrina','demo-orbea-variegata','demo-protea-cynaroides','demo-leucospermum-cordifolium','demo-erica-cerinthoides'];
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});if(!d.objectStoreNames.contains(TSTORE))d.createObjectStore(TSTORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function allRecords(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function saveRecord(record){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function deleteRecord(id){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function init(){db=await openDB();plants=await allRecords();treatments=await allTreatments();for(const p of plants){if(OLD_DEMO_IDS.includes(p.id)&&p.demo&&!p.favourite)await deleteRecord(p.id);}plants=await allRecords();if(!plants.length){for(const p of demo)await saveRecord(p);plants=await allRecords();}for(const p of plants){if(!p.family){const s=suggestFamily(p.genus);if(s){p.family=s;await saveRecord(p);}}}plants=await allRecords();await seedStarters();render();updateConnection();storageInfo();window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').then(reg=>{const show=w=>{$('updateBar').classList.remove('hidden');$('updateNow').onclick=()=>w.postMessage('SKIP_WAITING');};if(reg.waiting&&navigator.serviceWorker.controller)show(reg.waiting);reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)show(w);});});}).catch(()=>{});const hadCtl=!!navigator.serviceWorker.controller;let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||!hadCtl)return;reloaded=true;location.reload();});}
function updateConnection(){$('connection').textContent=navigator.onLine?'Online · local library ready':'Offline · local library ready';$('connection').previousElementSibling.style.background=navigator.onLine?'#8ac69b':'#e2b65f';}
function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cardHTML(p){return `<article class="plant-card"><div class="plant-image">${p.photo?`<img src="${p.photo}" alt="${escapeHTML(p.scientificName)}">`:'<svg class="ico" viewBox="0 0 512 512" aria-hidden="true"><use href="#i-succulent"/></svg>'}</div><div class="plant-body"><h3>${escapeHTML(p.scientificName)}</h3><div class="plant-meta">${escapeHTML(p.genus||'Genus not specified')}${p.author?' · '+escapeHTML(p.author):''}</div>${p.siNumber?`<span class="si-tag">SI ${escapeHTML(p.siNumber)}</span>`:''}<div class="tags">${p.tagNumber?`<span class="si-tag">Tag ${escapeHTML(p.tagNumber)}</span>`:''}${p.floweringSeason?`<span class="si-tag flower-tag">✿ ${escapeHTML(p.floweringSeason)}</span>`:''}</div><p class="plant-note">${escapeHTML(p.notes||p.locality||'No notes added yet.')}</p><div class="card-actions"><button class="smallbtn" data-edit="${escapeHTML(p.id)}">View / edit</button><button class="smallbtn star" data-fav="${escapeHTML(p.id)}">${p.favourite?'★':'☆'}</button></div></div></article>`;}
function rowHTML(p){return `<div class="plant-row"><div class="row-main"><strong>${escapeHTML(p.scientificName)}</strong>${p.tagNumber?`<span class="si-tag">Tag ${escapeHTML(p.tagNumber)}</span>`:''}${p.floweringSeason?`<span class="si-tag flower-tag">✿ ${escapeHTML(p.floweringSeason)}</span>`:''}${p.photo?'<span class="si-tag">Photo</span>':''}</div><div class="card-actions"><button class="smallbtn" data-edit="${escapeHTML(p.id)}">View / edit</button><button class="smallbtn star" data-fav="${escapeHTML(p.id)}">${p.favourite?'★':'☆'}</button></div></div>`;}
function genusHTML(f,g,list,filtering){const key=f+'|'+g,open=filtering||openGenera.has(key)||(!closedGenera.has(key)&&list.length<=12),n=list.length;list=[...list].sort(byName);
 return `<details class="genus-group" data-gkey="${escapeHTML(key)}"${open?' open':''}><summary class="genus-title"><span>${g?escapeHTML(g):'Genus not specified'}</span><span class="fam-count">${n} ${n===1?'plant':'plants'}</span></summary><div class="${viewMode==='list'?'plant-list':'plant-grid'}">${list.map(viewMode==='list'?rowHTML:cardHTML).join('')}</div></details>`;}
const allKeys=()=>[...new Set(plants.map(p=>(p.family||'')+'|'+(p.genus||'')))];
$('plantGrid').addEventListener('click',e=>{const s=e.target.closest('summary.genus-title');if(!s)return;const d=s.parentElement,k=d.dataset.gkey;if(!d.open){openGenera.add(k);closedGenera.delete(k);}else{closedGenera.add(k);openGenera.delete(k);}});
$('expandAll').onclick=()=>{closedFamilies.clear();closedGenera.clear();allKeys().forEach(k=>openGenera.add(k));render();};
$('collapseAll').onclick=()=>{openGenera.clear();allKeys().forEach(k=>closedGenera.add(k));render();};
$('viewCards').onclick=()=>{viewMode='cards';try{localStorage.setItem('viewMode','cards');}catch{}render();};
$('viewList').onclick=()=>{viewMode='list';try{localStorage.setItem('viewMode','list');}catch{}render();};
function byName(a,b){return(a.scientificName||'').localeCompare(b.scientificName||'');}
function emptyLast(a,b){return !a?1:!b?-1:a.localeCompare(b);}
function render(){renderBackupBanner();$('viewCards').classList.toggle('active',viewMode==='cards');$('viewList').classList.toggle('active',viewMode==='list');
 const q=$('search').value.trim().toLowerCase();
 const families=[...new Set(plants.map(p=>p.family).filter(Boolean))].sort();
 const oldF=$('familyFilter').value;
 $('familyFilter').innerHTML='<option value="">All families</option>'+families.map(f=>`<option>${escapeHTML(f)}</option>`).join('');
 $('familyFilter').value=families.includes(oldF)?oldF:'';
 const fam=$('familyFilter').value;
 const allGenera=[...new Set(plants.map(p=>p.genus).filter(Boolean))].sort();
 const genera=[...new Set(plants.filter(p=>!fam||p.family===fam).map(p=>p.genus).filter(Boolean))].sort();
 const oldG=$('genusFilter').value;
 $('genusFilter').innerHTML='<option value="">All genera</option>'+genera.map(g=>`<option>${escapeHTML(g)}</option>`).join('');
 $('genusFilter').value=genera.includes(oldG)?oldG:'';
 const gen=$('genusFilter').value;
 const filtered=plants.filter(p=>{const hay=[p.scientificName,p.family,p.genus,p.siNumber,p.author,p.acceptedName,p.locality,p.notes,p.tagNumber,p.floweringSeason,p.acquiredFrom].join(' ').toLowerCase();return(!q||hay.includes(q))&&(!fam||p.family===fam)&&(!gen||p.genus===gen)&&(!favouritesOnly||p.favourite);});
 $('recordCount').textContent=plants.length;$('familyCount').textContent=families.length;$('genusCount').textContent=allGenera.length;$('favouriteCount').textContent=plants.filter(p=>p.favourite).length;$('imageCount').textContent=plants.filter(p=>p.photo).length;
 const filtering=!!(q||fam||gen||favouritesOnly);const byFam=new Map();
 for(const p of filtered){const f=p.family||'',g=p.genus||'';if(!byFam.has(f))byFam.set(f,new Map());const gm=byFam.get(f);if(!gm.has(g))gm.set(g,[]);gm.get(g).push(p);}
 $('plantGrid').innerHTML=filtered.length?[...byFam.keys()].sort(emptyLast).map(f=>{
  const gm=byFam.get(f),gkeys=[...gm.keys()].sort(emptyLast),count=[...gm.values()].reduce((n,a)=>n+a.length,0);
  return `<details class="family-group" data-family="${escapeHTML(f)}"${closedFamilies.has(f)?'':' open'}><summary><span class="fam-name">${f?escapeHTML(f):'Family not specified'}</span><span class="fam-count">${gkeys.length} ${gkeys.length===1?'genus':'genera'} · ${count} ${count===1?'plant':'plants'}</span></summary>${gkeys.map(g=>genusHTML(f,g,gm.get(g),filtering)).join('')}</details>`;
 }).join(''):'<div class="empty">No matching plants found. Try another search or add a record.</div>';
}
$('plantGrid').addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details.family-group')){if(d.open)closedFamilies.delete(d.dataset.family);else closedFamilies.add(d.dataset.family);}},true);
$('familyFilter').onchange=render;
let photoCleared=false,cameraPhoto='';
function setPhotoPreview(src){$('removePhoto').classList.toggle('hidden',!src);const i=$('photoPreview');if(src){i.src=src;i.classList.remove('hidden');}else{i.removeAttribute('src');i.classList.add('hidden');}}
$('photo').onchange=async e=>{const f=e.target.files[0];if(f){photoCleared=false;cameraPhoto='';setPhotoPreview(await fileToDataURL(f));}else setPhotoPreview(photoCleared?'':(cameraPhoto||plants.find(p=>p.id===$('recordId').value)?.photo));};
$('genus').addEventListener('input',()=>{const f=$('family');if(!f.value.trim()||f.dataset.auto==='1'){const s=suggestFamily($('genus').value);if(s){f.value=s;f.dataset.auto='1';}else if(f.dataset.auto==='1'){f.value='';}}});
$('family').addEventListener('input',()=>{$('family').dataset.auto='';});
$('removePhoto').onclick=()=>{photoCleared=true;cameraPhoto='';$('photo').value='';setPhotoPreview('');};
/* ---------- in-app camera (opens the phone or laptop camera directly) ---------- */
let camStream=null,camFacing='environment';
function useCameraPhoto(dataUrl){photoCleared=false;cameraPhoto=dataUrl;$('photo').value='';setPhotoPreview(dataUrl);}
function stopCamera(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}$('camVideo').srcObject=null;$('camShoot').disabled=true;}
function showCamErr(msg){const e=$('camErr');e.textContent=msg;e.classList.remove('hidden');$('camFallback').classList.remove('hidden');$('camShoot').disabled=true;}
async function startCamera(){
  stopCamera();$('camErr').classList.add('hidden');$('camFallback').classList.add('hidden');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showCamErr('The live camera is not available here (it needs a secure https link). Use the button below to open your camera app instead.');return;}
  try{
    camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:camFacing},width:{ideal:1920},height:{ideal:1440}},audio:false});
    const v=$('camVideo');v.srcObject=camStream;await v.play().catch(()=>{});
    const front=(camStream.getVideoTracks()[0].getSettings().facingMode||camFacing)==='user';
    v.classList.toggle('mirror',front);$('camShoot').disabled=false;
    const cams=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
    $('camSwitch').classList.toggle('hidden',cams.length<2);
  }catch(err){
    const n=err&&err.name;
    showCamErr(n==='NotAllowedError'||n==='SecurityError'?'Camera permission was blocked. Tap the lock icon next to the web address, allow Camera for this site, then tap Take photo again. Or use the button below.':n==='NotFoundError'||n==='OverconstrainedError'?'No camera was found on this device. You can choose a photo instead.':'The camera could not be started. Use the button below to open your camera app instead.');
  }
}
$('takePhoto').onclick=()=>{$('cameraDialog').showModal();startCamera();};
$('camShoot').onclick=()=>{
  const v=$('camVideo');if(!v.videoWidth)return;
  const s=Math.min(1,1200/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');
  c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);c.getContext('2d').drawImage(v,0,0,c.width,c.height);
  useCameraPhoto(c.toDataURL('image/jpeg',.82));
  const st=document.querySelector('.camstage');st.classList.add('flash');setTimeout(()=>{st.classList.remove('flash');$('cameraDialog').close();},160);
};
$('camSwitch').onclick=()=>{camFacing=camFacing==='environment'?'user':'environment';startCamera();};
$('camDone').onclick=$('camClose').onclick=()=>$('cameraDialog').close();
$('camNative').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f){useCameraPhoto(await fileToDataURL(f));$('cameraDialog').close();}};
$('cameraDialog').addEventListener('close',stopCamera);
function openForm(p){photoCleared=false;cameraPhoto='';$('recordForm').reset();$('recordId').value=p?.id||'';$('dialogTitle').textContent=p?'Edit plant record':'Add a plant';$('deleteRecord').classList.toggle('hidden',!p);$('scientificName').value=p?.scientificName||'';$('genus').value=p?.genus||'';$('family').value=p?.family||'';$('family').dataset.auto='';$('genusList').innerHTML=[...new Set([...(C.genera||[]),...plants.map(x=>x.genus).filter(Boolean)])].sort().map(g=>`<option value="${escapeHTML(g)}">`).join('');$('familyList').innerHTML=[...new Set([...Object.values(C.familyByGenus||{}),...plants.map(x=>x.family)].filter(Boolean))].sort().map(f=>`<option value="${escapeHTML(f)}">`).join('');$('acceptedName').value=p?.acceptedName||'';$('locality').value=p?.locality||'';$('tagNumber').value=p?.tagNumber||'';$('floweringSeason').value=p?.floweringSeason||'';$('acquiredDate').value=p?.acquiredDate||'';$('acquiredFrom').value=p?.acquiredFrom||'';$('notes').value=p?.notes||'';setPhotoPreview(p?.photo);resetTreatForm();renderDialogTreatments();$('recordDialog').showModal();}
$('addRecord').onclick=()=>openForm();$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('recordDialog').close();$('search').oninput=render;$('genusFilter').onchange=render;$('favouritesOnly').onclick=()=>{favouritesOnly=!favouritesOnly;$('favouritesOnly').classList.toggle('primary',favouritesOnly);$('favouritesOnly').classList.toggle('secondary',!favouritesOnly);render();};
$('plantGrid').onclick=async e=>{const edit=e.target.closest('[data-edit]'),fav=e.target.closest('[data-fav]');if(edit){openForm(plants.find(p=>p.id===edit.dataset.edit));}if(fav){const p=plants.find(x=>x.id===fav.dataset.fav);p.favourite=!p.favourite;await saveRecord(p);plants=await allRecords();render();}};
$('recordForm').onsubmit=async e=>{e.preventDefault();const id=$('recordId').value||crypto.randomUUID();const previous=plants.find(p=>p.id===id)||{};let photo=photoCleared?'':(previous.photo||'');const file=$('photo').files[0];if(file)photo=await fileToDataURL(file);if(cameraPhoto)photo=cameraPhoto;const tag=$('tagNumber').value.trim();const clash=tag&&plants.find(p=>p.id!==id&&(p.tagNumber||'').toLowerCase()===tag.toLowerCase());if(clash&&!confirm(`Tag ${tag} is already used by ${clash.scientificName}. Save anyway?`))return;const record={...previous,id,scientificName:$('scientificName').value.trim(),family:$('family').value.trim()||suggestFamily($('genus').value),genus:$('genus').value.trim(),acceptedName:$('acceptedName').value.trim(),locality:$('locality').value.trim(),tagNumber:tag,floweringSeason:$('floweringSeason').value.trim(),acquiredDate:$('acquiredDate').value,acquiredFrom:$('acquiredFrom').value.trim(),notes:$('notes').value.trim(),photo,demo:false,starter:false};await saveRecord(record);plants=await allRecords();$('recordDialog').close();render();};
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1200/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82));};img.onerror=()=>resolve(r.result);img.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
$('deleteRecord').onclick=async()=>{const id=$('recordId').value;if(id&&confirm('Delete this plant record from this device?')){const old=plants.find(p=>p.id===id);await deleteRecord(id);plants=await allRecords();$('recordDialog').close();render();toast('Plant deleted',async()=>{await saveRecord(old);plants=await allRecords();render();});}};
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify({format:C.exportFormat,version:2,exportedAt:new Date().toISOString(),plants,treatments},null,2)],{type:'application/json'});download(blob,C.backupFile);markBackup();};
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();let rows,importTreat=[];if(file.name.toLowerCase().endsWith('.csv'))rows=parseCSV(text).map(r=>({scientificName:r.scientificName||r.name,family:r.family,genus:r.genus,siNumber:r.siNumber||r.si_number,author:r.author,acceptedName:r.acceptedName||r.accepted_name,locality:r.locality,tagNumber:r.tagNumber||r.tag,floweringSeason:r.floweringSeason,acquiredDate:r.acquiredDate,acquiredFrom:r.acquiredFrom,notes:r.notes}));else{const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:(parsed.plants||parsed.records||[]);importTreat=Array.isArray(parsed.treatments)?parsed.treatments:[];}if(!Array.isArray(rows))rows=[];if(!rows.length&&!importTreat.length)throw new Error('No plant or treatment records found in the file.');let count=0,add=0,upd=0;for(const row of rows){if(!row.scientificName&&!row.name)continue;const si=String(row.siNumber??row.si_number??'').trim();const nm=norm(row.scientificName||row.name);const existing=plants.find(p=>(row.id&&p.id===row.id)||(si&&String(p.siNumber)===si)||(nm&&norm(p.scientificName)===nm));const record={...(existing||{}),...row,id:existing?.id||row.id||crypto.randomUUID(),scientificName:row.scientificName||row.name,family:row.family||existing?.family||suggestFamily(row.genus),genus:row.genus||'',siNumber:si,author:row.author||'',acceptedName:row.acceptedName||row.accepted_name||'',locality:row.locality||'',tagNumber:row.tagNumber||row.tag||existing?.tagNumber||'',floweringSeason:row.floweringSeason||existing?.floweringSeason||'',acquiredDate:row.acquiredDate||existing?.acquiredDate||'',acquiredFrom:row.acquiredFrom||existing?.acquiredFrom||'',notes:row.notes||'',photo:row.photo||existing?.photo||'',demo:false};await saveRecord(record);existing?upd++:add++;count++;}let tcount=0;for(const t of importTreat){if(!t.genus||!t.dateTreated)continue;await saveTreatment({id:t.id||crypto.randomUUID(),genus:String(t.genus).trim(),type:t.type==='Fungus'?'Fungus':'Pest',issue:t.issue||'',product:t.product||'',dateTreated:t.dateTreated,nextDue:t.nextDue||'',notes:t.notes||''});tcount++;}plants=await allRecords();treatments=await allTreatments();render();alert(`Import finished: ${add} new and ${upd} updated plant records; ${tcount} treatments. Plants are matched by scientific name, so re-importing will not create duplicates.`);}catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function parseCSV(s){s=s.replace(/^\uFEFF/,'');const rows=[];let row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);v='';rows.push(row);row=[];}else v+=c;}if(v||row.length){row.push(v);rows.push(row);}const heads=(rows.shift()||[]).map(x=>x.trim());return rows.filter(r=>r.some(x=>x.trim())).map(r=>Object.fromEntries(r.map((x,i)=>[heads[i],x])));}

/* ---------- Pest & fungus treatments (shown on the plant edit page, kept per genus) ---------- */
function allTreatments(){return new Promise((resolve,reject)=>{const r=db.transaction(TSTORE,'readonly').objectStore(TSTORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function saveTreatment(t){return new Promise((resolve,reject)=>{const tx=db.transaction(TSTORE,'readwrite');tx.objectStore(TSTORE).put(t);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function deleteTreatment(id){return new Promise((resolve,reject)=>{const tx=db.transaction(TSTORE,'readwrite');tx.objectStore(TSTORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function todayISO(){return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);}
function fmtDate(d){if(!d)return'Not recorded';const dt=new Date(d+'T00:00:00');return isNaN(dt)?escapeHTML(d):dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function resetTreatForm(){$('tEditId').value='';$('tType').value='Pest';$('tIssue').value='';$('tProduct').value='';$('tNotes').value='';$('tNext').value='';$('tDate').value=todayISO();$('saveTreat').textContent='＋ Add treatment';$('cancelTreatEdit').classList.add('hidden');}
function renderDialogTreatments(){
 const g=$('genus').value.trim();
 $('treatGenusLabel').textContent=g?`Genus: ${g} · applies to all plants in this genus`:'Enter a genus above to log treatments.';
 $('treatAddBox').classList.toggle('hidden',!g);
 const list=treatments.filter(t=>g&&(t.genus||'').toLowerCase()===g.toLowerCase()).sort((a,b)=>(b.dateTreated||'').localeCompare(a.dateTreated||''));
 $('treatmentList').innerHTML=list.length?list.map(t=>`<article class="treat-row"><span class="badge ${t.type==='Fungus'?'fungus':'pest'}">${escapeHTML(t.type)}</span><div class="treat-main"><h3>${escapeHTML(t.issue||'Unspecified')}</h3><p>Treated: <strong>${fmtDate(t.dateTreated)}</strong>${t.nextDue?' · Next due: '+fmtDate(t.nextDue):''}</p>${t.product?`<p>Treatment: ${escapeHTML(t.product)}</p>`:''}${t.notes?`<p>${escapeHTML(t.notes)}</p>`:''}</div><div class="treat-actions"><button type="button" class="smallbtn" data-tedit="${escapeHTML(t.id)}">Edit</button><button type="button" class="smallbtn" data-tdel="${escapeHTML(t.id)}">Delete</button></div></article>`).join(''):(g?'<div class="empty small">No treatments logged for this genus yet.</div>':'');
}
async function submitTreatment(){
 const genus=$('genus').value.trim(),issue=$('tIssue').value.trim(),date=$('tDate').value;
 if(!genus){alert('Enter the genus first.');return;}
 if(!issue){alert('Enter the pest or fungus name.');$('tIssue').focus();return;}
 if(!date){alert('Choose the date treated.');$('tDate').focus();return;}
 await saveTreatment({id:$('tEditId').value||crypto.randomUUID(),genus,type:$('tType').value,issue,product:$('tProduct').value.trim(),dateTreated:date,nextDue:$('tNext').value,notes:$('tNotes').value.trim()});
 treatments=await allTreatments();resetTreatForm();renderDialogTreatments();
}
$('saveTreat').onclick=submitTreatment;
$('cancelTreatEdit').onclick=resetTreatForm;
$('genus').addEventListener('input',renderDialogTreatments);
$('treatBox').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();submitTreatment();}});
$('treatmentList').onclick=async e=>{
 const ed=e.target.closest('[data-tedit]'),del=e.target.closest('[data-tdel]');
 if(ed){const t=treatments.find(x=>x.id===ed.dataset.tedit);if(!t)return;$('tEditId').value=t.id;$('tType').value=t.type;$('tIssue').value=t.issue||'';$('tDate').value=t.dateTreated||todayISO();$('tNext').value=t.nextDue||'';$('tProduct').value=t.product||'';$('tNotes').value=t.notes||'';$('saveTreat').textContent='Save changes';$('cancelTreatEdit').classList.remove('hidden');$('tIssue').focus();}
 if(del&&confirm('Delete this treatment entry?')){await deleteTreatment(del.dataset.tdel);treatments=await allTreatments();resetTreatForm();renderDialogTreatments();}
};

/* ---------- branding, backups, storage, CSV, toast ---------- */
document.title=C.name;$('brandName').textContent=C.short;$('brandTag').textContent=C.tagline;$('heroTitle').innerHTML=C.hero;$('footerName').textContent=C.footer;$('footerNote').textContent=C.disclaimer;if(C.copyright)$('copyright').textContent=C.copyright;
function markBackup(){try{localStorage.setItem('lastBackupAt',String(Date.now()));localStorage.removeItem('backupSnooze');}catch{}renderBackupBanner();}
function renderBackupBanner(){let last=0,snooze=0;try{last=+localStorage.getItem('lastBackupAt')||0;snooze=+localStorage.getItem('backupSnooze')||0;}catch{}const days=last?Math.floor((Date.now()-last)/864e5):null;const due=plants.some(p=>!p.demo&&!p.starter)&&Date.now()>snooze&&(days===null||days>=14);$('backupBanner').classList.toggle('hidden',!due);$('backupText').textContent=days===null?'You have not backed up your library yet.':`Your last backup was ${days} days ago.`;}
$('backupNow').onclick=()=>$('exportData').click();
$('backupLater').onclick=()=>{try{localStorage.setItem('backupSnooze',String(Date.now()+3*864e5));}catch{}renderBackupBanner();};
async function storageInfo(){try{const ok=navigator.storage?.persist?await navigator.storage.persist():false;const e=navigator.storage?.estimate?await navigator.storage.estimate():null;$('storageInfo').textContent='Stored on this device'+(e?` · ${(e.usage/1048576).toFixed(1)} MB used`:'')+(ok?' · protected from automatic clean-up':'');}catch{}}
$('exportCsv').onclick=()=>{const cols=['family','scientificName','genus','acceptedName','locality','tagNumber','floweringSeason','acquiredDate','acquiredFrom','notes'],q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download(new Blob(['\uFEFF'+[cols.join(','),...plants.map(p=>cols.map(c=>q(p[c])).join(','))].join('\r\n')],{type:'text/csv'}),C.backupFile.replace('.json','.csv'));};
let toastTimer;function toast(msg,undo){$('toastMsg').textContent=msg;$('toast').classList.remove('hidden');$('toastUndo').classList.toggle('hidden',!undo);$('toastUndo').onclick=async()=>{$('toast').classList.add('hidden');await undo();};clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),8000);}


/* ---------- one starter record per genus (added once; edit each into a real species) ---------- */
async function seedStarters(){
 let ds=[];try{ds=JSON.parse(localStorage.getItem('seededSpecies')||'[]');}catch{}
 for(const [g,list] of Object.entries(C.starterSpecies||{})){for(const s of list){const id='starter-'+g.toLowerCase()+'-'+s.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name=g+' '+s;if(ds.includes(id))continue;if(!plants.some(p=>norm(p.scientificName)===norm(name)))await saveRecord({id,scientificName:name,family:C.familyByGenus[g.toLowerCase()]||'',genus:g,siNumber:'',author:'',acceptedName:'',locality:'',notes:'',demo:false,starter:false});ds.push(id);}
  const ph=plants.find(p=>p.id==='starter-'+g.toLowerCase()&&p.starter);if(ph)await deleteRecord(ph.id);}
 try{localStorage.setItem('seededSpecies',JSON.stringify(ds));}catch{}plants=await allRecords();
 let done=[];try{done=JSON.parse(localStorage.getItem('seededGenera')||'[]');}catch{}
 for(const g of C.starterGenera||[]){if(done.includes(g)||(C.starterSpecies&&C.starterSpecies[g]))continue;if(!plants.some(p=>(p.genus||'').toLowerCase()===g.toLowerCase()))await saveRecord({id:'starter-'+g.toLowerCase(),scientificName:g+' sp.',family:C.familyByGenus[g.toLowerCase()]||'',genus:g,siNumber:'',author:'',acceptedName:'',locality:'',notes:'',demo:false,starter:true});done.push(g);}
 try{localStorage.setItem('seededGenera',JSON.stringify(done));}catch{}plants=await allRecords();}
init().catch(err=>{console.error(err);$('notice').classList.remove('hidden');$('notice').textContent='This browser could not initialise local storage. Please use a current version of Chrome or Edge.';});
