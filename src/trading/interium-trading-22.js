/* Interium exact Trading Interium 1.1.0 runtime.
 * Unofficial community software; not affiliated with Pekora.
 */
/* INTERIUM_MAIN */
console.info('[Interium] Working 1.1.1 runtime started at', document.readyState);

(function () {
	'use strict';
/* ---- resilience: stub endpoints staff disabled (503) so pekora's own UI still renders ---- */
const pcsStubFor = (u) => {
u = String(u || '');
if (u.indexOf('/economy/v1/users/') !== -1 && u.indexOf('/currency') !== -1) return { robux: 0, tickets: 0 };
if (u.indexOf('/trades/v1/trades/') !== -1 && u.indexOf('/count') !== -1) return { count: 0 };
return null;
};
try {
const origFetch = window.fetch;
if (origFetch) {
window.fetch = async function (input, init) {
const args = arguments;
const u = typeof input === 'string' ? input : (input && input.url) || '';
const response = await origFetch.apply(this, args);
const stub = pcsStubFor(u);
if (stub && response && response.status === 503) {
return new Response(JSON.stringify(stub), { status: 200, headers: { 'content-type': 'application/json', 'x-interium-fallback': '503' } });
}
return response;
};
}
} catch (e) {}


/* ---- fixed feature flags: this build is trading-only, everything on ---- */
const cfg = { modernTradeRap:true, tradeValues:true, koroProfileBlock:true, collectiblesSuite:true };
const mtApi = (path, opts) => fetch('https://www.pekora.zip/apisite' + path, Object.assign({ credentials:'include' }, opts || {}));
let _pgMyIdCache = null;
const mtEnsureId = async () => { if (_pgMyIdCache) return _pgMyIdCache; const r = await mtApi('/users/v1/users/authenticated'); if (!r.ok) throw new Error('auth '+r.status); const d = await r.json(); _pgMyIdCache = d.id || d.userId || null; return _pgMyIdCache; };
const fetchCollectibles = async (userId) => {
const items = []; let cursor='';
for (let p=0;p<40;p++){
const r = await mtApi('/inventory/v1/users/'+userId+'/assets/collectibles?limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
if(!r.ok) throw new Error('inventory '+r.status);
const d = await r.json();
(d.data||[]).forEach(e=>items.push({ assetId:e.assetId, name:e.name||('Asset '+e.assetId), rap:(e.recentAveragePrice!=null?e.recentAveragePrice:(e.originalPrice||0)), serial:e.serialNumber }));
if(!d.nextPageCursor) break; cursor=d.nextPageCursor;
}
return items;
};
/* ------------------------------------------------ modern /trades page stats (read-only) */
/* Annotates the new React trades page (/trades) with per-item RAP + Koromon’s Value, side  */
/* RAP totals and a win/loss verdict. Data comes from the same authenticated trade APIs    */
/* the page itself uses; this module only reads and annotates, never clicks or sends.      */
const _pgMt = { listType:'', listAt:0, listRows:[], details:new Map(), inflight:'', lastSig:'' };
const PG_KOROMONS_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1094 1466.2" width="13" height="17" style="flex:none;display:inline-block;vertical-align:-2px;"><path fill="#0084dd" d="M1094 521.6 0 0v469.5l141-67.4 250 119.2L0 707.8v369.7l815.6 388.7L315 893l779-371.4z"/></svg>';
const PG_EXT_ARROW = (c) => '<svg xmlns="http://www.w3.org/2000/svg" height="15" width="15" viewBox="0 -960 960 960" fill="'+c+'" style="flex:none;"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>';
const PG_EXT_ICON = (href, tip, color, cls) => '<a href="'+href+'" target="_blank" rel="noopener noreferrer" title="'+tip+'" class="pg-ext-ic '+cls+'" style="display:inline-flex;align-items:center;margin-left:4px;opacity:.7;text-decoration:none;vertical-align:middle;line-height:0;cursor:pointer;">'+PG_EXT_ARROW(color)+'</a>';
const PG_VBG_KEY='interium_verdict_bg_v1';
const PG_VBG_MODES=['default','transparent','glassify'];
const PG_PILL_BASE='height:30px;padding:5px 12px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;border-radius:0;color:#fff;';
const pgVbgGet=()=>{ try{ const m=localStorage.getItem(PG_VBG_KEY); return PG_VBG_MODES.indexOf(m)>=0?m:'default'; }catch(_){ return 'default'; } };
const pgVbgCss=(m)=> m==='transparent' ? 'background-color:transparent;' : (m==='glassify' ? 'background-color:rgba(255,255,255,0.05);backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);' : 'background-color:rgb(45,47,48);');
const pgVbgToggleHtml=(m)=>'<button class="pg-mt-bgtoggle" title="Pill background: '+m+' (click to cycle: default / transparent / glassify)" style="margin-left:auto;height:26px;padding:0 10px;border:1px solid rgba(255,255,255,0.18);background:transparent;color:#bbb;font-size:11px;font-weight:700;cursor:pointer;border-radius:0;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;line-height:1;">▧ '+m+'</button>';
const pgApplyVerdictBg=(box,m)=>{ box.querySelectorAll('.pg-mt-pill').forEach(el=>{ el.style.cssText=PG_PILL_BASE+pgVbgCss(m); }); const t=box.querySelector('.pg-mt-bgtoggle'); if(t){ t.textContent='▧ '+m; t.title='Pill background: '+m+' (click to cycle: default / transparent / glassify)'; } };
const pgWireVerdictBg=(box)=>{ const t=box.querySelector('.pg-mt-bgtoggle'); if(!t||t._pgWired) return; t._pgWired=true; t.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); const cur=pgVbgGet(); const nm=PG_VBG_MODES[(PG_VBG_MODES.indexOf(cur)+1)%PG_VBG_MODES.length]; try{ localStorage.setItem(PG_VBG_KEY,nm); }catch(_){}; pgApplyVerdictBg(box,nm); }); };
const PG_KORO_ITEM_URL = (aid) => 'https://www.koromons.net/item?id='+encodeURIComponent(String(aid));
const PG_CATALOG_URL = (aid) => '/catalog/'+encodeURIComponent(String(aid))+'/--';
try{ if(!document.getElementById('pg-ext-ic-guard')){ const _g=document.createElement('meta'); _g.id='pg-ext-ic-guard'; (document.head||document.documentElement).appendChild(_g); document.addEventListener('click',(e)=>{ try{ if(e.target&&e.target.closest&&e.target.closest('.pg-ext-ic')) e.stopPropagation(); }catch(_e){} }, true); } }catch(_e){}
const pgMtClear = () => {
	document.querySelectorAll('.pg-mt-rap,.pg-mt-total,.pg-mt-total2,.pg-mt-verdict,.pg-mt-tag').forEach(n=>n.remove());
	document.querySelectorAll('[class*="totalRow-"] > span').forEach(sp=>{ if(/^\s*total rap:?\s*$/i.test(sp.textContent||'')) sp.textContent='Total Value:'; });
};
const pgMtItems = (o) => Array.isArray(o?.userAssets) ? o.userAssets : (Array.isArray(o?.items) ? o.items : []);
const pgMtRapOf = (it) => Number(it?.recentAveragePrice ?? it?.rap ?? it?.averagePrice ?? 0) || 0;
const pgMtAssetIdOf = (it) => it?.assetId ?? it?.assetID ?? it?.asset?.id ?? it?.id ?? null;
const pgMtNameOf = (it) => String(it?.name ?? it?.asset?.name ?? '').trim();
const pgMtPartnerOf = (t) => { const u=(t&&(t.user||t.partner||t.userFacingUser))||{}; return String(u.name||u.displayName||''); };
const pgMtList = async (type) => {
	if(_pgMt.listType===type && Date.now()-_pgMt.listAt<30000) return _pgMt.listRows;
	const r=await mtApi('/trades/v1/trades/'+encodeURIComponent(type)+'?cursor=&limit=100'); if(!r.ok) throw new Error('HTTP '+r.status);
	const d=await r.json(); const rows=(d&&(d.data||d.trades||d.items))||[];
	_pgMt.listType=type; _pgMt.listAt=Date.now(); _pgMt.listRows=rows; return rows;
};
const pgMtDetails = async (id) => {
	if(_pgMt.details.has(String(id))) return _pgMt.details.get(String(id));
	const r=await mtApi('/trades/v1/trades/'+encodeURIComponent(id)); if(!r.ok) throw new Error('HTTP '+r.status);
	const d=await r.json(); _pgMt.details.set(String(id),d); return d;
};
/* ---- left trade list: partner nicknames open their /internal/collectibles ---- */
/* Read-only. A click handler is attached to the EXISTING username node (no DOM   */
/* re-wrapping, so React keeps owning the row); stopPropagation keeps the click   */
/* from also selecting the trade row. DOM rows and the trades list API rows share */
/* the same order (same assumption selIdx relies on), and the name text is        */
/* verified before linking, so an order mismatch just means no link.              */
const pgMtUserIdOf = (t) => { const u=(t&&(t.user||t.partner||t.userFacingUser))||{}; return (u.id!=null?u.id:(u.userId!=null?u.userId:null)); };
const pgMtLinkListNames = (rowsDom, rows) => {
	/* Link affordance lives in CSS (injected once): a SOLID underline, nudged a
	   bit below the text and shown only on :hover - classic link-hover look. */
	if(!document.getElementById('pg-mt-namelink-css')){
		const st=document.createElement('style');
		st.id='pg-mt-namelink-css';
		st.textContent='[class*="tradeRow-"] [data-pg-uid]{cursor:pointer;}[class*="tradeRow-"] [data-pg-uid]:hover{text-decoration:underline;text-underline-offset:3px;}';
		document.head.appendChild(st);
	}
	rowsDom.forEach((rowEl,i)=>{
		const row=rows[i]; if(!row) return;
		const uid=pgMtUserIdOf(row); if(uid==null) return;
		const name=pgMtPartnerOf(row); if(!name) return;
		const nameEl=Array.from(rowEl.querySelectorAll('span,div,p,b,strong')).find(n=>!n.children.length&&String(n.textContent||'').trim().toLowerCase()===name.toLowerCase());
		if(!nameEl) return;
		if(nameEl.getAttribute('data-pg-uid')===String(uid)) return;
		nameEl.setAttribute('data-pg-uid',String(uid));
		nameEl.title='Open collectibles: '+name;
		nameEl.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); window.open('/internal/collectibles?userId='+encodeURIComponent(String(uid)),'_blank'); });
	});
};
const pgMtAnnotateSection = (sec, offer) => {
	const items=pgMtItems(offer);
	const byName=new Map();
	items.forEach(it=>{ const k=pgMtNameOf(it).toLowerCase(); if(!byName.has(k)) byName.set(k,[]); byName.get(k).push(it); });
	const cards=Array.from(sec.querySelectorAll('[class*="itemCard-"]'));
	let rapTotal=0, valTotal=0, valKnown=0, rapOfValued=0;
	cards.forEach((card,i)=>{
		const nameEl=card.querySelector('[class*="itemName-"]');
		const k=String((nameEl&&nameEl.textContent)||'').trim().toLowerCase();
		const q=byName.get(k);
		const it=(q&&q.length?q.shift():items[i])||null;
		const rap=it?pgMtRapOf(it):0;
		const aid=it?pgMtAssetIdOf(it):null;
		const val=aid!=null?Number(koromonsValueCache.get(String(aid))||0):0;
		rapTotal+=rap; if(val>0){ valTotal+=val; valKnown++; rapOfValued+=rap; }
		if(aid!=null && card.getAttribute('data-pg-aid')!==String(aid)){
			card.setAttribute('data-pg-aid',String(aid));
			const rapHost=card.querySelector('[class*="itemValue-"]')||nameEl;
			if(rapHost && rapHost.parentNode && !rapHost.parentNode.querySelector('.pg-ext-cat')){
				rapHost.insertAdjacentHTML('afterend', PG_EXT_ICON(PG_CATALOG_URL(aid),'Open on Pekora catalog','currentColor','pg-ext-cat'));
			}
		}
		let line=card.querySelector('.pg-mt-rap');
		if(val>0){
			if(!line){ line=document.createElement('div'); line.className='pg-mt-rap'; card.appendChild(line); }
			line.style.cssText='margin-top:3px;font-size:14px;line-height:1.3;font-weight:700;display:inline-flex;align-items:center;gap:5px;color:#0084dd !important;';
			line.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+val.toLocaleString()+'</span>'+PG_EXT_ICON(PG_KORO_ITEM_URL(aid),'View on Koromon’s','#0084dd','pg-ext-koro');
		} else if(line){ line.remove(); }
		const tags=aid!=null?koromonsTagsCache.get(String(aid)):null;
		const thumbWrap=card.querySelector('[class*="thumbWrap-"]')||card.querySelector('[class*="thumb-"]')||card;
		let tagEl=card.querySelector('.pg-mt-tag');
		if(tags&&(tags.rare||tags.projected)&&thumbWrap){
			if(!tagEl){ tagEl=document.createElement('div'); tagEl.className='pg-mt-tag'; thumbWrap.appendChild(tagEl); }
			else if(tagEl.parentNode!==thumbWrap){ thumbWrap.appendChild(tagEl); }
			try { if(getComputedStyle(thumbWrap).position==='static') thumbWrap.style.position='relative'; } catch(_e){}
			tagEl.style.cssText='position:absolute;bottom:4px;right:4px;z-index:3;display:flex;flex-direction:column;gap:3px;pointer-events:none;';
			const tagHtml=(tags.projected?PG_TAG_PROJECTED:'')+(tags.rare?PG_TAG_RARE:'');
			if(tagEl.innerHTML!==tagHtml) tagEl.innerHTML=tagHtml;
		} else if(tagEl){ tagEl.remove(); }
	});
	const robux=Math.max(0,Number((offer&&offer.robux)||0)||0);
	const totalRow=sec.querySelector('[class*="totalRow-"]');
	if(totalRow){
		const nativeValEl=totalRow.querySelector('[class*="totalValue-"]');
		if(nativeValEl && robux>0){
			const nSpans=nativeValEl.querySelectorAll('span');
			const numSpan=nSpans.length?nSpans[nSpans.length-1]:null;
			if(numSpan){
				const rapTxt=rapTotal.toLocaleString()+' + '+robux.toLocaleString();
				if(numSpan.textContent!==rapTxt) numSpan.textContent=rapTxt;
			}
		}
		let t=sec.querySelector('.pg-mt-total');
		if(!t){ t=document.createElement('div'); t.className='pg-mt-total'; totalRow.parentNode.insertBefore(t,totalRow.nextSibling); }
		t.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:16px;max-width:565px;margin-top:8px;font-size:18px;font-weight:500;color:var(--text-color-primary,#fff);';
		t.textContent='';
		const rapUnvalued=rapTotal-rapOfValued;
		const mixedTotal=valTotal+rapUnvalued;
		const l=document.createElement('span'); l.textContent='Total Value:';
		const v=document.createElement('span'); v.style.cssText='display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;';
		v.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+(valKnown>0?valTotal.toLocaleString():'\u2014')+'</span>';
		t.appendChild(l); t.appendChild(v);
		let t2=sec.querySelector('.pg-mt-total2');
		if(!t2){ t2=document.createElement('div'); t2.className='pg-mt-total2'; t.parentNode.insertBefore(t2,t.nextSibling); }
		t2.style.cssText=t.style.cssText; t2.style.justifyContent='flex-end'; t2.textContent='';
		const v2=document.createElement('span'); v2.style.cssText='display:inline-flex;flex-direction:column;align-items:flex-end;gap:2px;';
		v2.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+(valKnown>0?mixedTotal.toLocaleString():rapTotal.toLocaleString())+'</span></span><span style="color:#0084dd !important;font-weight:500;font-size:11px;opacity:.85;">(+ unvalued)</span>';
		t2.appendChild(v2);
	}
	return { rapTotal, valTotal, valKnown, rapOfValued, count:cards.length, robux };
};
const applyModernTradeStats = () => {
	const onPage=/^\/trades\/?$/i.test(location.pathname);
	if(!onPage||!cfg.modernTradeRap){ if(document.querySelector('.pg-mt-rap,.pg-mt-total,.pg-mt-verdict,.pg-mt-tag')) pgMtClear(); return; }
	const main=document.querySelector('main[class*="details-"]');
	const titleEl=main&&main.querySelector('[class*="detailTitle-"]');
	if(!main||!titleEl) return;
	main.querySelectorAll('[class*="totalRow-"] > span').forEach(sp=>{ if(/^\s*total value:?\s*$/i.test(sp.textContent||'')) sp.textContent='Total RAP:'; });
	const sel=document.querySelector('select[aria-label="Trade type"]');
	const type=String((sel&&sel.value)||'inbound').toLowerCase();
	const rowsDom=Array.from(document.querySelectorAll('[class*="tradeList-"] [class*="tradeRow-"]'));
	const selIdx=rowsDom.findIndex(b=>/tradeRowSelected/i.test(String(b.className)));
	if(_pgMt.listType===type && _pgMt.listRows.length) pgMtLinkListNames(rowsDom,_pgMt.listRows);
	const partner=String(titleEl.textContent||'').replace(/^Trade with\s*/i,'').trim();
	const sig=type+'|'+selIdx+'|'+partner;
	if(sig===_pgMt.lastSig && main.querySelector('.pg-mt-verdict')) return;
	if(sig!==_pgMt.lastSig){ main.querySelectorAll('.pg-mt-rap,.pg-mt-total,.pg-mt-verdict,.pg-mt-tag').forEach(n=>n.remove()); }
	if(_pgMt.inflight===sig) return;
	_pgMt.inflight=sig;
	(async()=>{
		try{
			const myId=await mtEnsureId();
			try{ await loadKoromonsValues(); }catch(_e){}
			const rows=await pgMtList(type);
			pgMtLinkListNames(rowsDom,rows);
			let row=(selIdx>=0&&rows[selIdx])?rows[selIdx]:null;
			if(!row||(partner&&pgMtPartnerOf(row).toLowerCase()!==partner.toLowerCase())){
				row=rows.find(x=>pgMtPartnerOf(x).toLowerCase()===partner.toLowerCase())||row;
			}
			const tradeId=row&&(row.id??row.tradeId);
			if(tradeId==null) return;
			const det=await pgMtDetails(tradeId);
			const offers=Array.isArray(det&&det.offers)?det.offers:[];
			if(!offers.length) return;
			const mine=offers.find(o=>String((o&&o.user&&o.user.id)??(o&&o.userId))===String(myId))||offers[0];
			const theirs=offers.find(o=>o!==mine)||null;
			const secs=Array.from(main.querySelectorAll('section'));
			const secTitle=(s)=>String((s.querySelector('[class*="sectionTitle-"]')||{}).textContent||'');
			const secGive=secs.find(s=>/you will give/i.test(secTitle(s)));
			const secRecv=secs.find(s=>/you will receive/i.test(secTitle(s)));
			if(!secGive&&!secRecv) return;
			const give=(secGive&&mine)?pgMtAnnotateSection(secGive,mine):null;
			const recv=(secRecv&&theirs)?pgMtAnnotateSection(secRecv,theirs):null;
			let verdict=main.querySelector('.pg-mt-verdict');
			if(give&&recv){
				const giveTotal=give.rapTotal+give.robux;
				const recvTotal=recv.rapTotal+Math.floor(recv.robux*0.7);
				const delta=recvTotal-giveTotal;
				const pct=giveTotal>0?Math.round(delta/giveTotal*100):0;
				const vbgMode=pgVbgGet();
				const mkStat=(d,p,label)=>{
					const even=d===0, up=d>0;
					const c=even?'#9aa0aa':(up?'rgb(43,191,90)':'rgb(215,32,32)');
					const sign=d>0?'+':(d<0?'-':'');
					const path=up?'M9 4h6v8h4.84L12 19.84L4.16 12H9V4Z':'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z';
					const ar=even?'':'<svg xmlns="http://www.w3.org/2000/svg" style="transform:scale(1.2);margin-right:4px;color:'+c+' !important;flex:none;" width="22" height="22" viewBox="0 0 24 24"><g transform="translate(0 24) scale(1 -1)"><path fill="currentColor" d="'+path+'"></path></g></svg>';
					return '<div class="pg-mt-pill" style="'+PG_PILL_BASE+pgVbgCss(vbgMode)+'"><span style="display:flex;align-items:center;color:#fff;">'+ar+'<span style="color:#fff;font-size:15px;font-weight:800;">'+sign+Math.abs(d).toLocaleString()+' '+label+'</span><span style="color:'+c+';font-size:14px;font-weight:800;margin-left:6px;">('+sign+Math.abs(p)+'%)</span></span></div>';
				};
				if(!verdict){ verdict=document.createElement('div'); verdict.className='pg-mt-verdict'; }
				if(secRecv){ if(verdict.parentNode!==main||verdict.nextElementSibling!==secRecv) main.insertBefore(verdict,secRecv); }
				else { const actions=main.querySelector('[class*="actions-"]'); if(actions) main.insertBefore(verdict,actions); else main.appendChild(verdict); }
				verdict.style.cssText='margin:14px 0;max-width:600px;display:flex;align-items:center;justify-content:flex-start;gap:10px;flex-wrap:wrap;';
				let htmlStats=mkStat(delta,pct,'RAP');
				if(give.valKnown===give.count&&recv.valKnown===recv.count&&give.count>0&&recv.count>0){
					const gv=give.valTotal+give.robux, rv=recv.valTotal+Math.floor(recv.robux*0.7);
					const dv=rv-gv, pv=gv>0?Math.round(dv/gv*100):0;
					htmlStats+=mkStat(dv,pv,'Value');
				}
				if(give.count>0&&recv.count>0){
					// Value that also counts unvalued items at their RAP (Value for valued items + RAP
					// for unvalued ones), mirroring the per-side "(+ unvalued)" total. After the pure Value stat.
					const gm=give.valTotal+(give.rapTotal-give.rapOfValued)+give.robux;
					const rm=recv.valTotal+(recv.rapTotal-recv.rapOfValued)+Math.floor(recv.robux*0.7);
					const dm=rm-gm, pm=gm>0?Math.round(dm/gm*100):0;
					htmlStats+=mkStat(dm,pm,'Value (+ unvalued)');
				}
				verdict.innerHTML=htmlStats+pgVbgToggleHtml(vbgMode);
				pgWireVerdictBg(verdict);
			} else if(verdict){ verdict.remove(); }
			_pgMt.lastSig=sig;
		}catch(e){ console.warn('[Interium] modern trades stats:',e); }
		finally{ if(_pgMt.inflight===sig) _pgMt.inflight=''; }
	})();
};
const getProfileFrame = () => {
const h2=document.querySelector('h2[class*="username"],h2[class*="profileName"],[class*="profileName"] h2');
if(!h2) return null;
return h2.closest('[class*="cardBody-0-2-"]') || h2.closest('[class*="card-0-2-"]') || h2.closest('[class*="profileContainer"]') || null;
};
const validBannerColor = (x, fallback) => /^#[0-9a-fA-F]{6}$/.test(String(x||'')) ? x : fallback;
const currentProfileId = () => (location.pathname.match(/\/users\/(\d+)\/profile/i) || [])[1] || null;
const pgTwState = { myItems:null, theirItems:null, partnerId:null, loading:false };
const pgTwIndex = (list) => { const idx=new Map(); (list||[]).forEach(it=>{ const k=String(it.name||'').trim().toLowerCase()+'|'+Math.round(Number(it.rap||0)); if(!idx.has(k)) idx.set(k,[]); idx.get(k).push(it); }); return idx; };
const pgTwMatch = (idx, name, rap) => { const k=String(name||'').trim().toLowerCase()+'|'+Math.round(Number(rap||0)); const arr=idx.get(k); if(arr&&arr.length) return arr.shift(); return null; };
const pgTwDecorate = (thumbEl, anchorEl, it, mode, nameEl) => {
	const aid = it ? it.assetId : null;
	const val = aid!=null ? Number(koromonsValueCache.get(String(aid))||0) : 0;
	const tags = aid!=null ? koromonsTagsCache.get(String(aid)) : null;
	const tagHost = (mode==='child' && nameEl) ? nameEl : thumbEl;
	if(tagHost){
		let tagEl = (nameEl?nameEl.querySelector('.pg-tw-tag'):null) || (thumbEl?thumbEl.querySelector('.pg-tw-tag'):null);
		if(tags && (tags.rare||tags.projected)){
			if(!tagEl){ tagEl=document.createElement('span'); tagEl.className='pg-tw-tag'; }
			if(tagEl.parentNode!==tagHost){
				tagHost.appendChild(tagEl);
				if(tagHost===nameEl){ tagEl.style.cssText='display:inline-flex;align-items:center;gap:3px;margin-left:5px;vertical-align:middle;pointer-events:none;'; }
				else { tagEl.style.cssText='position:absolute;bottom:4px;right:4px;z-index:3;display:flex;flex-direction:column;gap:3px;pointer-events:none;'; try{ if(getComputedStyle(tagHost).position==='static') tagHost.style.position='relative'; }catch(_e){} }
			}
			const html=(tags.projected?PG_TAG_PROJECTED:'')+(tags.rare?PG_TAG_RARE:'');
			if(tagEl.innerHTML!==html) tagEl.innerHTML=html;
		} else if(tagEl){ tagEl.remove(); }
	}
	if(anchorEl && anchorEl.parentNode){
		let line=anchorEl.parentNode.querySelector('.pg-tw-koroval');
		if(val>0){
			const valTxt=val.toLocaleString();
			if(!line){
				line=document.createElement('div'); line.className='pg-tw-koroval';
				line.style.cssText='margin-top:2px;font-size:'+(mode==='child'?'11px':'13px')+';font-weight:700;display:flex;align-items:center;gap:4px;color:#0084dd !important;line-height:1.15;';
				anchorEl.insertAdjacentElement('afterend', line);
			} else if(line.previousElementSibling!==anchorEl){
				anchorEl.insertAdjacentElement('afterend', line);
			}
			if(line.getAttribute('data-pg-val')!==valTxt){
				line.setAttribute('data-pg-val', valTxt);
				line.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+valTxt+'</span>'+PG_EXT_ICON(PG_KORO_ITEM_URL(aid),'View on Koromon’s','#0084dd','pg-ext-koro');
			}
		} else if(line){ line.remove(); }
	}
	if(aid!=null && anchorEl && anchorEl.parentNode && !anchorEl.parentNode.querySelector('.pg-ext-cat')){
		anchorEl.insertAdjacentHTML('afterend', PG_EXT_ICON(PG_CATALOG_URL(aid),'Open on Pekora catalog','currentColor','pg-ext-cat'));
	}
	return { aid, val };
};
const applyTradeWindowStats = () => {
	const onPage = /^\/users\/\d+\/trade\/?$/i.test(location.pathname);
	if(!onPage){
		if(document.querySelector('.pg-tw-koroval,.pg-tw-tag,.pg-tw-total-value,.pg-tw-total-value2')){
			document.querySelectorAll('.pg-tw-koroval,.pg-tw-tag,.pg-tw-total-value,.pg-tw-total-value2').forEach(n=>n.remove());
			document.querySelectorAll('[class*="offerPanel-"] [class*="totalRow-"] > span[data-pg-tw-renamed]').forEach(sp=>{ sp.textContent='Total Value:'; sp.removeAttribute('data-pg-tw-renamed'); });
		}
		pgTwState.myItems=null; pgTwState.theirItems=null; pgTwState.partnerId=null; pgTwState.loading=false;
		return;
	}
	if(!cfg.modernTradeRap) return;
	if(!pgTwState.koroWait){ pgTwState.koroWait=true; loadKoromonsValues().then(()=>{ try{ applyTradeWindowStats(); }catch(_e){} }).catch(()=>{}); } else { loadKoromonsValues().catch(()=>{}); }
	const partnerId=(location.pathname.match(/\/users\/(\d+)\/trade/i)||[])[1];
	if(!partnerId) return;
	if(pgTwState.partnerId!==partnerId){
		pgTwState.partnerId=partnerId; pgTwState.myItems=null; pgTwState.theirItems=null; pgTwState.loading=false;
	}
	if(!pgTwState.myItems){
		if(!pgTwState.loading){
			pgTwState.loading=true;
			(async () => {
				try{
					const me=await (await mtApi('/users/v1/users/authenticated')).json().catch(()=>null);
					const myId=me&&me.id!=null?me.id:null;
					const [mine, theirs]=await Promise.all([
						myId?fetchCollectibles(myId).catch(()=>[]):Promise.resolve([]),
						fetchCollectibles(partnerId).catch(()=>[]),
					]);
					pgTwState.myItems=mine; pgTwState.theirItems=theirs;
				}catch(e){ pgTwState.myItems=[]; pgTwState.theirItems=[]; }
				finally{ pgTwState.loading=false; try{ applyTradeWindowStats(); }catch(_e){} }
			})();
		}
		return;
	}
	const sections=Array.from(document.querySelectorAll('section[class*="inventorySection-"]'));
	sections.forEach((sec,i)=>{
		const secTitle=((sec.querySelector('[class*="sectionTitle-"]')||{}).textContent||'').trim().toLowerCase();
		const secIsMine=secTitle?secTitle.indexOf('your')===0:i===0;
		const idx=pgTwIndex(secIsMine?pgTwState.myItems:pgTwState.theirItems);
		sec.querySelectorAll('[class*="itemButton-"]').forEach(btn=>{
			const nameEl=btn.querySelector('[class*="itemName-"]'); if(!nameEl) return;
			const name=nameEl.textContent.trim();
			const valEl=btn.querySelector('[class*="itemValue-"]');
			const rap=valEl?Number((valEl.textContent||'').replace(/[^0-9]/g,''))||0:0;
			const it=pgTwMatch(idx,name,rap);
			const thumb=btn.querySelector('[class*="itemThumb-"]');
			pgTwDecorate(thumb,valEl||nameEl,it,'sibling',nameEl);
		});
	});
	const panels=Array.from(document.querySelectorAll('section[class*="offerPanel-"]'));
	panels.forEach((panel,i)=>{
		const panelTitle=((panel.querySelector('[class*="sectionTitle-"]')||{}).textContent||'').trim().toLowerCase();
		const panelIsMine=panelTitle?panelTitle.indexOf('offer')>=0:i===0;
		const idx=pgTwIndex(panelIsMine?pgTwState.myItems:pgTwState.theirItems);
		const slots=panel.querySelectorAll('[class*="slotFilled-"]');
		let rapSum=0, valSum=0, valKnown=0, total=0, rapOfValued2=0;
		slots.forEach(slot=>{
			const nameEl=slot.querySelector('[class*="slotName-"]'); if(!nameEl) return;
			const name=nameEl.textContent.trim();
			const valEl=slot.querySelector('[class*="slotValue-"]');
			const rap=valEl?Number((valEl.textContent||'').replace(/[^0-9]/g,''))||0:0;
			const it=pgTwMatch(idx,name,rap);
			const thumbWrap=slot.querySelector('[class*="slotImageWrap-"]');
			const res=pgTwDecorate(thumbWrap,valEl||nameEl,it,'child',nameEl);
			total++; rapSum+=rap;
			if(res.val>0){ valSum+=res.val; valKnown++; rapOfValued2+=rap; }
		});
		const totalRow=panel.querySelector('[class*="totalRow-"]');
		if(totalRow){
			const label=totalRow.querySelector('span:first-child');
			if(label && !label.hasAttribute('data-pg-tw-renamed')){ label.textContent='Total RAP:'; label.setAttribute('data-pg-tw-renamed','1'); }
			const robuxInput=panel.querySelector('[class*="robuxInput-"]');
			const robux=robuxInput?Math.max(0,Number(String(robuxInput.value||'').replace(/[^0-9]/g,''))||0):0;
			const nativeValEl=totalRow.querySelector('[class*="totalValue-"]');
			if(nativeValEl){
				const nSpans=nativeValEl.querySelectorAll('span');
				const numSpan=nSpans.length?nSpans[nSpans.length-1]:null;
				if(numSpan){
					const rapTxt=robux>0?(rapSum.toLocaleString()+' + '+robux.toLocaleString()):rapSum.toLocaleString();
					if(numSpan.textContent!==rapTxt) numSpan.textContent=rapTxt;
				}
			}
			let vt=panel.querySelector('.pg-tw-total-value');
			if(!vt){
				vt=document.createElement('div'); vt.className='pg-tw-total-value';
				vt.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:6px;font-size:16px;font-weight:500;color:var(--text-color-primary,inherit);';
				totalRow.parentNode.insertBefore(vt, totalRow.nextSibling);
			}
			const rapUnvalued2=rapSum-rapOfValued2;
			const mixedTotal2=valSum+rapUnvalued2;
			const valTxt=valKnown>0?valSum.toLocaleString():(total>0?'\u2014':'0');
			const mixTxt=valKnown>0?mixedTotal2.toLocaleString():rapSum.toLocaleString();
			if(vt.getAttribute('data-pg-val')!==valTxt){
				vt.setAttribute('data-pg-val', valTxt);
				vt.innerHTML='<span>Total Value:</span><span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+valTxt+'</span></span>';
			}
			let vt2=panel.querySelector('.pg-tw-total-value2');
			if(!vt2){
				vt2=document.createElement('div'); vt2.className='pg-tw-total-value2';
				vt2.style.cssText='display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:4px;font-size:16px;font-weight:500;';
				vt.parentNode.insertBefore(vt2, vt.nextSibling);
			}
			if(vt2.getAttribute('data-pg-mix')!==mixTxt){
				vt2.setAttribute('data-pg-mix', mixTxt);
				vt2.innerHTML='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;"><span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+mixTxt+'</span></span><span style="color:#0084dd !important;font-weight:500;font-size:11px;opacity:.85;">(+ unvalued)</span></div>';
			}
		}
	});
};
	/* ---------------------------------------------- Koromon’s Value badges */
	/* Public read-only item values. No RAP fallback: large limiteds are judged */
	/* by Value, and missing Koromon’s entries simply receive no badge.          */
	const KOROMONS_VALUES_URL = 'https://www.koromons.net/api/items';
	const KOROMONS_VALUES_CACHE_KEY = 'pcs_koromons_values_v1';
	const KOROMONS_VALUES_TTL = 1000 * 60 * 60 * 6;
	const koromonsValueCache = new Map();
	const koromonsTagsCache = new Map();
	const PG_TAG_RARE_SRC = 'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMjggMTI4Jz48cGF0aCBkPSdNNjMuODUgMTIzLjg0bDYwLjEtODcuOC4wNS0uMDJ2LS4wM0w5Ni4wNCA0SDMyLjAxTDQgMzUuOTN2LjAzbC4wMy4wNyA1OS40MiA4Ny40NS4zMi40NC4wNy0uMDktLjIyLS44My4yMy44NHonIGZpbGw9JyM4MUQ0RkEnLz48bGluZWFyR3JhZGllbnQgaWQ9J2ludC1yYXJlLWEnIHgxPSc0LjExMScgeDI9JzEyMy44OScgeTE9JzY0JyB5Mj0nNjQnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjODFENEZBJyBvZmZzZXQ9Jy4wMDEnLz48c3RvcCBzdG9wLWNvbG9yPScjMjlCNkY2JyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjaW50LXJhcmUtYSknIGQ9J002My43OSAxMjMuOTNMNC4xMSAzNi4wM2wyNy45LTMxLjk2aDY0LjAzbDI3Ljg1IDMxLjk2eicvPjxwYXRoIGZpbGw9J25vbmUnIGQ9J002NCA0bC0uMDUuMDdoLjF6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdpbnQtcmFyZS1iJyB4MT0nNjMuNTk5JyB4Mj0nNjMuNTk5JyB5MT0nMTIzLjg5JyB5Mj0nMzYuMDAzJyBncmFkaWVudFVuaXRzPSd1c2VyU3BhY2VPblVzZSc+PHN0b3Agc3RvcC1jb2xvcj0nIzgxRDRGQScgb2Zmc2V0PScwJy8+PHN0b3Agc3RvcC1jb2xvcj0nIzdERDNGQScgb2Zmc2V0PScuMjIxJy8+PHN0b3Agc3RvcC1jb2xvcj0nIzcyQ0ZGOScgb2Zmc2V0PScuNDMxJy8+PHN0b3Agc3RvcC1jb2xvcj0nIzVFQzhGOCcgb2Zmc2V0PScuNjM4Jy8+PHN0b3Agc3RvcC1jb2xvcj0nIzQ0QkZGNycgb2Zmc2V0PScuODQxJy8+PHN0b3Agc3RvcC1jb2xvcj0nIzI5QjZGNicgb2Zmc2V0PScxJy8+PC9saW5lYXJHcmFkaWVudD48cGF0aCBmaWxsPSd1cmwoI2ludC1yYXJlLWIpJyBkPSdNNjMuNzggMTIzLjg5TDg3LjU1IDM2bC00Ny45LjA1eicvPjxwYXRoIGZpbGw9JyM4MUQ0RkEnIGQ9J004Ny41NSAzNmguMzlsLS4yOC0uMzh6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdpbnQtcmFyZS1jJyB4MT0nOTMuODk3JyB4Mj0nOTMuODk3JyB5MT0nMTIzLjkxJyB5Mj0nMzYnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjMDM5QkU1JyBvZmZzZXQ9JzAnLz48c3RvcCBzdG9wLWNvbG9yPScjMDM5OEUyJyBvZmZzZXQ9Jy4zNjknLz48c3RvcCBzdG9wLWNvbG9yPScjMDM5MEQ5JyBvZmZzZXQ9Jy42MzgnLz48c3RvcCBzdG9wLWNvbG9yPScjMDI4MkM5JyBvZmZzZXQ9Jy44NzQnLz48c3RvcCBzdG9wLWNvbG9yPScjMDI3N0JEJyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjaW50LXJhcmUtYyknIGQ9J00xMjQgMzYuMDJMODcuNTggMzZsLTIzLjc5IDg3LjkxTDEyNCAzNi4wM3onLz48bGluZWFyR3JhZGllbnQgaWQ9J2ludC1yYXJlLWQnIHgxPSczMy45NDQnIHgyPSczMy45NDQnIHkxPScxMjMuOTEnIHkyPSczNS45NjgnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjMjlCNkY2JyBvZmZzZXQ9JzAnLz48c3RvcCBzdG9wLWNvbG9yPScjMjVCM0Y0JyBvZmZzZXQ9Jy4zMzEnLz48c3RvcCBzdG9wLWNvbG9yPScjMUFBQkVGJyBvZmZzZXQ9Jy42NDYnLz48c3RvcCBzdG9wLWNvbG9yPScjMDc5RUU3JyBvZmZzZXQ9Jy45NTQnLz48c3RvcCBzdG9wLWNvbG9yPScjMDM5QkU1JyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjaW50LXJhcmUtZCknIGQ9J00zOS44NiAzNi41OUwzOSAzNy43NWwuODYtMS4xNi0uMTctLjYxLTM1LjUyLS4wMS0uMDYuMDYgNTkuNjcgODcuODh6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdpbnQtcmFyZS1lJyB4MT0nMjkuNTEnIHgyPScyMS43ODMnIHkxPSc1LjQ1NycgeTI9JzM2LjM2NicgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyNCM0U1RkMnIG9mZnNldD0nLjAwNScvPjxzdG9wIHN0b3AtY29sb3I9JyM0RkMzRjcnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNpbnQtcmFyZS1lKScgZD0nTTQwIDM2TDMyIDQuMSAzLjc0IDM2LjA1eicvPjxsaW5lYXJHcmFkaWVudCBpZD0naW50LXJhcmUtZicgeDE9JzEwNS44NycgeDI9JzEwNS44NycgeTE9JzcuMDYnIHkyPSczNy4wMjcnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjODFENEZBJyBvZmZzZXQ9Jy4wMDknLz48c3RvcCBzdG9wLWNvbG9yPScjMjlCNkY2JyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjaW50LXJhcmUtZiknIGQ9J004Ny43NCAzNmw4LTMxLjlMMTI0IDM2LjA1eicvPjxsaW5lYXJHcmFkaWVudCBpZD0naW50LXJhcmUtZycgeDE9JzYzLjY0NCcgeDI9JzYzLjY0NCcgeTE9JzYuNzM4JyB5Mj0nMzUuNzE1JyBncmFkaWVudFVuaXRzPSd1c2VyU3BhY2VPblVzZSc+PHN0b3Agc3RvcC1jb2xvcj0nI0UxRjVGRScgb2Zmc2V0PScwJy8+PHN0b3Agc3RvcC1jb2xvcj0nI0QzRjBGRCcgb2Zmc2V0PScuMjc1Jy8+PHN0b3Agc3RvcC1jb2xvcj0nI0IzRTVGQycgb2Zmc2V0PScxJy8+PC9saW5lYXJHcmFkaWVudD48cGF0aCBmaWxsPSd1cmwoI2ludC1yYXJlLWcpJyBkPSdNMzkuNzQgMzZsMjQtMzEuOTZMODcuNTUgMzZ6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdpbnQtcmFyZS1oJyB4MT0nNDcuODY4JyB4Mj0nNDcuODY4JyB5MT0nNC40ODQnIHkyPSczNy4zNCcgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyM4MUQ0RkEnIG9mZnNldD0nLjAwOScvPjxzdG9wIHN0b3AtY29sb3I9JyMyOUI2RjYnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNpbnQtcmFyZS1oKScgZD0nTTY0IDQuMDRMNDAgMzYuMDUgMzEuNzQgNHonLz48bGluZWFyR3JhZGllbnQgaWQ9J2ludC1yYXJlLWknIHgxPSc2My43MzYnIHgyPSc5NicgeTE9JzIwLjAyMycgeTI9JzIwLjAyMycgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyM0RkMzRjcnIG9mZnNldD0nLjAxMScvPjxzdG9wIHN0b3AtY29sb3I9JyMyOUI2RjYnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNpbnQtcmFyZS1pKScgZD0nTTYzLjc0IDQuMDRsMjQgMzIuMDFMOTYgNHonLz48cGF0aCBkPSdNOTQuNjcgN2wyNS41MyAyOS4yLTU2LjQyIDgyLjQxTDcuNzYgMzYuMTkgMzMuMzcgN2g2MS4zbTEuMzctM0gzMi4wMUw0IDM1Ljkzdi4wM2wuMDMuMDcgNTkuNzQgODcuOSA2MC4xOC04Ny45LjA1LS4wMnYtLjAzTDk2LjA0IDR6JyBmaWxsPScjNDI0MjQyJyBvcGFjaXR5PScuMicvPjwvc3ZnPg==';
	const PG_TAG_RARE = '<span class="pg-tag-ico" title="Rare" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;cursor:help;pointer-events:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));"><img src="'+PG_TAG_RARE_SRC+'" width="19" height="19" style="display:block;" alt=""/></span>';
	const PG_TAG_PROJECTED_SRC = 'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA2NCA2NCc+PHBhdGggZD0nTTYzLjM3IDUzLjUyQzUzLjk4MiAzNi4zNyA0NC41OSAxOS4yMiAzNS4yIDIuMDdhMy42ODcgMy42ODcgMCAwMC02LjUyMiAwQzE5LjI4OSAxOS4yMiA5Ljg5MiAzNi4zNy41MDggNTMuNTJjLTEuNDUzIDIuNjQ5LjM5OSA2LjA4MyAzLjI1OCA2LjA4M2g1Ni4zNWMxLjU4NCAwIDIuNjQ4LS44NTMgMy4yMDMtMi4wMS42OTgtMS4xMDIuODg1LTIuNTY1LjA1NS00LjA3NScgZmlsbD0nI2ZmZGQxNScvPjxwYXRoIGQ9J00yOC45MTcgMzQuNDc3bC0uODg5LTEzLjI2MmMtLjE2Ni0yLjU4My0uMjQ2LTQuNDM5LS4yNDYtNS41NjUgMC0xLjUzNC40LTIuNzI3IDEuMjAyLTMuNTg4LjgwNS0uODU2IDEuODYzLTEuMjg2IDMuMTc1LTEuMjg2IDEuNTgzIDAgMi42NDYuNTUxIDMuMTc4IDEuNjQ2LjUzNyAxLjEwMi44MDkgMi42ODQuODA5IDQuNzUxIDAgMS4yMTUtLjA2NiAyLjQ1My0uMTk4IDMuNzA4bC0xLjE5IDEzLjY0OWMtLjEyOSAxLjYyNi0uNDA0IDIuODcyLS44MjcgMy43MzktLjQyNi44NzEtMS4xMjggMS4zMDEtMi4xMDkgMS4zMDEtLjk5MiAwLTEuNjktLjQxOS0yLjA3Mi0xLjI1Ny0uMzkzLS44NDEtLjY2OC0yLjEyLS44MzMtMy44MzZtMy4wNzIgMTguMjE3Yy0xLjEyNSAwLTIuMTA2LS4zNjItMi45NDctMS4wOTMtLjg0MS0uNzI4LTEuMjYtMS43NDgtMS4yNi0zLjA1OCAwLTEuMTQzLjQtMi4xMiAxLjIwMi0yLjkyMS44MDUtLjgwNiAxLjc4Ni0xLjIwNiAyLjk1MS0xLjIwNnMyLjE1My40IDIuOTc3IDEuMjA2Yy44MTUuODAxIDEuMjM0IDEuNzc4IDEuMjM0IDIuOTIxIDAgMS4yOS0uNDE5IDIuMzA4LTEuMjQ2IDMuMDQ0YTQuMjQ1IDQuMjQ1IDAgMDEtMi45MTEgMS4xMDcnIGZpbGw9JyMxZjJlMzUnLz48L3N2Zz4=';
	const PG_TAG_PROJECTED = '<span class="pg-tag-ico" title="Projected" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;cursor:help;pointer-events:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));"><img src="'+PG_TAG_PROJECTED_SRC+'" width="19" height="19" style="display:block;" alt=""/></span>';
	let koromonsValuesLoaded = false;
	let koromonsValuesPromise = null;
	const indexKoromonsValues = (rows) => {
		koromonsValueCache.clear();
		koromonsTagsCache.clear();
		(Array.isArray(rows) ? rows : []).forEach(item => {
			const id = item?.itemId ?? item?.ItemId ?? item?.assetId ?? item?.AssetId ?? item?.id;
			const raw = item?.Value ?? item?.value ?? item?.val;
			const value = Number(String(raw ?? '').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/)?.[0] || 0);
			if (id != null && Number.isFinite(value) && value > 0) koromonsValueCache.set(String(id), Math.round(value));
			if (id != null) {
				const tags = Array.isArray(item?.Tags) ? item.Tags : [];
				const rare = item?.IsRare === true || tags.includes('Rare');
				const projected = tags.includes('Projected');
				if (rare || projected) koromonsTagsCache.set(String(id), { rare, projected });
			}
		});
		return koromonsValueCache;
	};
	const readKoromonsCache = () => {
		try {
			const cached = JSON.parse(localStorage.getItem(KOROMONS_VALUES_CACHE_KEY) || 'null');
			if (!cached || !Array.isArray(cached.items)) return { hit:false, fresh:false };
			indexKoromonsValues(cached.items);
			const age = Date.now() - Number(cached.t || 0);
			return { hit:true, fresh:age >= 0 && age <= KOROMONS_VALUES_TTL };
		} catch (_) { return { hit:false, fresh:false }; }
	};
	/* HTTP helper: plain page-context fetch. koromons.net serves open CORS headers (verified:
	   fetch from the page returns 200 without any extension), so no GM_xmlhttpRequest privilege
	   is needed and console/local mode gets live data too. */
	const pgGetJson = (url, timeoutMs = 10000) => new Promise((resolve, reject) => {
		const ctl = typeof AbortController === 'function' ? new AbortController() : null;
		const timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch(_) {} reject(new Error('Koromon’s request timed out')); }, timeoutMs);
		fetch(url, { headers:{accept:'application/json'}, signal: ctl ? ctl.signal : undefined })
			.then(r => { if (!r.ok) throw new Error('Koromon’s request failed: HTTP ' + r.status); return r.json(); })
			.then(d => { clearTimeout(timer); resolve(d); })
			.catch(e => { clearTimeout(timer); reject(e); });
	});
	const INTERIUM_VALUES_FALLBACK_URL = 'https://raw.githubusercontent.com/unitedbygrief/koronevalues/refs/heads/main/valu.json';
	const asItemArray = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : (Array.isArray(d?.data) ? d.data : null));
	const requestKoromonsValues = () => pgGetJson(KOROMONS_VALUES_URL, 10000).then(d => {
		const rows = asItemArray(d);
		if (rows && rows.length) return rows;
		throw new Error('Koromon’s api/items returned no items');
	}).catch((e) => {
		// api/items unavailable -> fall back to the GitHub valu.json snapshot so values still render.
		console.warn('[Interium] Koromon’s api/items unavailable, using valu.json fallback:', (e && e.message) || e);
		return pgGetJson(INTERIUM_VALUES_FALLBACK_URL, 10000).then(d => {
			const rows = asItemArray(d);
			if (!rows) throw new Error('valu.json fallback invalid');
			return rows;
		});
	});
	const loadKoromonsValues = (force=false) => {
		if (koromonsValuesPromise && !force) return koromonsValuesPromise;
		const cached = readKoromonsCache();
		koromonsValuesLoaded = cached.hit;
		if (cached.fresh && !force) return Promise.resolve(koromonsValueCache);
		koromonsValuesPromise = requestKoromonsValues().then(rows => {
			indexKoromonsValues(rows); koromonsValuesLoaded = true;
			try { localStorage.setItem(KOROMONS_VALUES_CACHE_KEY,JSON.stringify({t:Date.now(),items:rows})); } catch(_) {}
			return koromonsValueCache;
		}).catch(() => {
			// Mark this page-load attempt as settled even without cache. Otherwise annotateThumbs
			// recursively attaches to the same resolved promise forever and starves the page.
			koromonsValuesLoaded = true;
			return koromonsValueCache;
		});
		return koromonsValuesPromise;
	};
	/* ------------------------------ Koromon’s leaderboard cache + profile block (v1.0.11) */
	const KOROMONS_LB_URL = 'https://www.koromons.net/api/leaderboard';
	const KOROMONS_LB_CACHE_KEY = 'pcs_koromons_lb_v1';
	const KOROMONS_LB_TTL = 1000 * 60 * 30;
	let koromonsLbRows = null;
	let koromonsLbPromise = null;
	const readKoromonsLbCache = () => {
		try {
			const cached = JSON.parse(localStorage.getItem(KOROMONS_LB_CACHE_KEY) || 'null');
			if (!cached || !Array.isArray(cached.players)) return { hit:false, fresh:false };
			koromonsLbRows = cached.players;
			const age = Date.now() - Number(cached.t||0);
			return { hit:true, fresh:age >= 0 && age <= KOROMONS_LB_TTL };
		} catch(e){ return { hit:false, fresh:false }; }
	};
	const requestKoromonsLb = () => pgGetJson(KOROMONS_LB_URL, 15000).then(d => {
		const rows = d && Array.isArray(d.players) ? d.players : (Array.isArray(d) ? d : null);
		if (!rows) throw new Error('Invalid Koromon’s leaderboard response');
		return rows;
	});
	const loadKoromonsLb = (force=false) => {
		if (koromonsLbPromise && !force) return koromonsLbPromise;
		const cached = readKoromonsLbCache();
		if (cached.fresh && !force) return Promise.resolve(koromonsLbRows);
		koromonsLbPromise = requestKoromonsLb().then(rows => {
			koromonsLbRows = rows;
			try { localStorage.setItem(KOROMONS_LB_CACHE_KEY,JSON.stringify({t:Date.now(),players:rows})); } catch(_) {}
			return koromonsLbRows;
		}).catch(() => koromonsLbRows);
		return koromonsLbPromise;
	};
	const koroFindPlayer = (idOrName) => {
		if (!Array.isArray(koromonsLbRows) || !koromonsLbRows.length) return null;
		const s = String(idOrName==null?'':idOrName).trim().toLowerCase();
		if (!s) return null;
		for (let i=0;i<koromonsLbRows.length;i++){
			const p = koromonsLbRows[i];
			if (String(p.id)===s || (p.name && String(p.name).toLowerCase()===s)) return { rank:i+1, total:koromonsLbRows.length, id:p.id, name:p.name, displayName:p.displayName, rap:Number(p.rap)||0, value:Number(p.value)||0, updatedAt:p.updatedAt||null };
		}
		return null;
	};
	const koroComputeFromInventory = async (uid) => {
		await loadKoromonsValues();
		const items = await fetchCollectibles(uid);
		let value=0, rap=0, valued=0;
		items.forEach(it => {
			const r = Number(it.rap)||0; rap += r;
			const v = Number(koromonsValueCache.get(String(it.assetId))||0);
			if (v>0){ value+=v; valued++; } else { value+=r; }
		});
		return { value, rap, count:items.length, valued };
	};
	const koroStatHtml = (label, valueHtml) => '<span style="display:inline-flex;align-items:baseline;gap:6px;min-width:0;"><span style="color:#9aa0a6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">'+label+'</span><span style="font-weight:800;font-size:14px;color:#fff;">'+valueHtml+'</span></span>';
	const koroValueHtml = (n) => '<span style="color:#0084dd !important;font-weight:800;">'+Number(n||0).toLocaleString()+'</span>';
	const applyKoromonsProfileBlock = () => {
		const uid = currentProfileId();
		if (!cfg.koroProfileBlock || !uid){ document.querySelectorAll('.pg-koro-profile').forEach(el=>el.remove()); return; }
		const frame = getProfileFrame();
		if (!frame) return;
		let box = document.querySelector('.pg-koro-profile');
		if (box && box.getAttribute('data-uid')===String(uid) && frame.contains(box)) return;
		if (box) box.remove();
		box = document.createElement('div');
		box.className='pg-koro-profile';
		box.setAttribute('data-uid', String(uid));
		box.style.cssText='position:relative;z-index:1;margin-top:10px;padding:9px 14px;border-radius:10px;background:rgba(0,132,221,0.07);border:1px solid rgba(0,132,221,0.35);display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:13px;line-height:1.4;';
		const head='<span style="display:inline-flex;align-items:center;gap:6px;font-weight:800;letter-spacing:.02em;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">Koromon’s</span></span>';
		box.innerHTML=head+'<span style="color:#9aa0a6;">loading\u2026</span>';
		frame.appendChild(box);
		(async () => {
			try {
				await loadKoromonsLb();
				const hit = koroFindPlayer(uid);
				let est = null;
				if (!hit){ try { est = await koroComputeFromInventory(uid); } catch(_e){} }
				if (!box.isConnected || box.getAttribute('data-uid')!==String(uid)) return;
				if (hit){
					box.innerHTML=head
						+koroStatHtml('Value:', koroValueHtml(hit.value))
						+koroStatHtml('RAP:', '<span class="pg-rap-amt" style="color:#02b757;">'+hit.rap.toLocaleString()+'</span>')
						+koroStatHtml('Rank:', '#'+hit.rank+' <span style="color:#9aa0a6;font-weight:600;font-size:12px;">/ '+hit.total.toLocaleString()+'</span>');
				} else if (est && est.count>0){
					box.innerHTML=head
						+koroStatHtml('Value:', '\u2248 '+koroValueHtml(est.value))
						+koroStatHtml('RAP:', '<span class="pg-rap-amt" style="color:#02b757;">'+est.rap.toLocaleString()+'</span>')
						+'<span style="color:#9aa0a6;font-size:11px;">not on leaderboard \u00b7 estimated from public inventory</span>';
				} else {
					box.innerHTML=head+'<span style="color:#9aa0a6;font-size:12px;">no data \u2014 inventory is private and player is not on the Koromon’s leaderboard</span>';
				}
			} catch(e){ if(box.isConnected) box.innerHTML=head+'<span style="color:#ffb454;font-size:12px;">Koromon’s data unavailable</span>'; }
		})();
	};
	const assetIdFromSrc = (src) => {
		if (!src) return null;
		const m = src.match(/assetId=(\d+)/i) || src.match(/\/asset\/(\d+)/i) || src.match(/thumbs?\/(\d+)/i);
		return m ? m[1] : null;
	};
	const annotateThumbs = () => {
		if (!cfg.tradeValues) return;
		if (!koromonsValuesLoaded) { loadKoromonsValues().then(() => { if(cfg.tradeValues) annotateThumbs(); }); return; }
		document.querySelectorAll('#pk-calc-panel .pcs-value,.pk-modal-backdrop .pcs-value,#pk-results .pcs-value').forEach(e => e.remove());
		document.querySelectorAll('img').forEach(img => {
			if (img.closest('#pk-calc-panel,.pk-modal-backdrop,#pk-results,#pk-shell')) return;
			const id = assetIdFromSrc(img.currentSrc || img.src);
			if (!id) return;
			const wrap = img.closest('[class*="thumb"],[class*="Thumb"],[class*="imageBig"],[class*="imageSmall"],[class*="itemCard"]') || img.parentElement;
			if (!wrap) return;
			const value = koromonsValueCache.get(String(id));
			const oldBadge = wrap.querySelector(':scope > .pcs-value,:scope > .pcs-rap');
			if (!value) { oldBadge?.remove(); return; }
			if (oldBadge) { oldBadge.className='pcs-value'; oldBadge.textContent='Value '+Number(value).toLocaleString(); return; }
			if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
			const badge = document.createElement('div');
			badge.className = 'pcs-value';
			badge.textContent = 'Value ' + Number(value).toLocaleString();
			badge.style.cssText = 'position:absolute;left:6px;bottom:6px;z-index:5;background:rgba(5,5,8,0.86);color:var(--pcs-accent,#c084fc);font:700 11px/1 var(--pcs-gui-font,monospace);padding:4px 7px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);pointer-events:none;backdrop-filter:blur(6px);';
			wrap.appendChild(badge);
		});
	};
	const clearBadges = () => document.querySelectorAll('.pcs-value,.pcs-rap').forEach(e => e.remove());
	const primeFromUrl = () => { if(cfg.tradeValues) loadKoromonsValues().then(annotateThumbs); };

const applyCatalogKoromonsLink = () => {
	const m=location.pathname.match(/\/catalog\/(\d+)(?:\/|$)/i);
	if(!m){ const el=document.querySelector('.pg-cat-koro-link'); if(el) el.remove(); return; }
	const aid=m[1];
	if(!koromonsValuesLoaded){ loadKoromonsValues().then(()=>{ try{ applyCatalogKoromonsLink(); }catch(_){} }); return; }
	if(!koromonsValueCache.has(String(aid))){ const el=document.querySelector('.pg-cat-koro-link'); if(el) el.remove(); return; }
	let link=document.querySelector('.pg-cat-koro-link');
	if(link&&link.getAttribute('data-aid')===aid) return;
	if(link) link.remove();
	const anchor=document.querySelector('[class*="desktopInteractionContainer"],[class*="favBtnContainer-"],[class*="itemInteractionContainer-"]');
	if(!anchor) return;
	link=document.createElement('a');
	link.className='pg-cat-koro-link';
	link.setAttribute('data-aid',aid);
	link.href='https://www.koromons.net/item?id='+aid;
	link.target='_blank';
	link.rel='noopener noreferrer';
	link.style.cssText='display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 14px;border-radius:6px;background:rgba(0,132,221,0.12);border:1px solid rgba(0,132,221,0.4);color:#0084dd !important;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap;';
	link.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">View on Koromon’s</span>';
	link.onmouseenter=()=>{ link.style.background='rgba(0,132,221,0.22)'; };
	link.onmouseleave=()=>{ link.style.background='rgba(0,132,221,0.12)'; };
	anchor.parentNode.insertBefore(link,anchor.nextSibling);
};
const applyPageModules = () => { applyKoromonsProfileBlock(); applyModernTradeStats(); applyTradeWindowStats(); applyCatalogKoromonsLink(); };
const init = () => {
	applyPageModules();
	primeFromUrl();
	let scheduled = false;
	const obs = new MutationObserver(() => {
		if (scheduled) return; scheduled = true;
		requestAnimationFrame(() => { scheduled = false; annotateThumbs(); applyPageModules(); });
	});
	obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
	setInterval(annotateThumbs, 1500);
	setInterval(() => { try{ applyTradeWindowStats(); }catch(_e){} }, 1000);
	setInterval(primeFromUrl, 2500);
	annotateThumbs();
};
if (document.body) init();
else window.addEventListener('DOMContentLoaded', init);
})();

/* ================================================================
   INTEGRATED MODULE: Pekora Collectibles Stacker + Values 4.0 (kiwis v5.0)
   Clean source replacement from viewrap-audit.txt. Only Interium toggle
   gating and non-blocking cached values loading are adapted for integration.
   ================================================================ */
(function () {
    'use strict';
    if (!/^\/internal\/collectibles/i.test(location.pathname)) return;
    console.info('[Interium] Collectibles suite: page detected, starting.');
    try {
        // Stale legacy flag check (pcs_cfg_v1 was written by older builds via GM_setValue;
        // now we read it directly from localStorage with the same prefix the polyfill used).
        const _pcsRaw = localStorage.getItem('interium_local_pcs_cfg_v1');
        const _pcsCfg = _pcsRaw ? JSON.parse(_pcsRaw) : null;
        if (_pcsCfg && _pcsCfg.collectiblesSuite === false) {
            console.warn('[Interium] Ignoring stale saved setting that disabled the collectibles suite.');
        }
    } catch (_) {}

    const VALUES_JSON_URL = 'https://www.koromons.net/api/items';
    const VALUES_CACHE_KEY = 'pk_v50_koromons_items_v3_cache';
    const VALUES_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
    const OWNER_RARE_CACHE_KEY = 'pk_v50_owner_rare_cache_60_exclusions';
    const OWNER_RARE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
    const SETTINGS_KEY = 'pk_v40_settings';
    const RARE_OWNER_CUTOFF = 60;
    const RARE_EXCLUDED_NAMES = new Set(['black valk', 'blackvalk', 'eyes of emeraldwrath']);

    function installAntiFlashStyles() {
        const css = `
            ul.pagination,.pagination,nav[aria-label*=\"Page\"],nav[aria-label*=\"Pagination\"],main .page-item,
            .pagination-wrapper,.page-link,.page-item{
                display:none!important;
            }

            body:not(.pk-v41-ready) main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row > *{
                visibility:hidden!important;
            }
        `;
        const host = document.head || document.documentElement;
        if (!host || document.getElementById('pk-v44-base-style')) return;
        const st = document.createElement('style');
        st.id = 'pk-v44-base-style';
        st.textContent = css;
        host.appendChild(st);
    }

    installAntiFlashStyles();

    const userId = new URLSearchParams(location.search).get('userId');
    if (!userId) { console.warn('[Interium] Collectibles suite: no userId in the URL, leaving page as-is.'); return; }

    const pi = new URLSearchParams(location.search).get('pageIndex');
    if (pi && pi !== '0') {
        location.href = `/internal/collectibles?userId=${encodeURIComponent(userId)}`;
        return;
    }

    const state = {
        valueItems: [],
        valuesById: new Map(),
        valuesByName: new Map(),
        rapById: new Map(),
        rapByName: new Map(),
        rareById: new Map(),
        rareByName: new Map(),
        copiesById: new Map(),
        copiesByName: new Map(),
        demandById: new Map(),
        demandByName: new Map(),
        projectedById: new Map(),
        projectedByName: new Map(),
        stacks: [],
        unstacked: [],
        stacked: true,
        sortMode: 'value',
        query: '',
        valueOnly: false,
        rareGlow: true,
        serialOutline: false,
        calcOpen: false,
        calcSide: 'mine',
        mine: new Set(),
        theirs: new Set(),
        mineItems: new Map(),
        theirItems: new Map(),
        rareScanStarted: false,
        rareAngle: 0,
        rareRaf: 0,
        ownerChecking: new Set()
    };

    const saved = readJson(localStorage.getItem(SETTINGS_KEY), {});
    state.rareGlow = saved.rareGlow !== false;
    state.valueOnly = !!saved.valueOnly;
    state.serialOutline = !!saved.serialOutline;

    const esc = (t) => {
        const d = document.createElement('div');
        d.textContent = String(t ?? '');
        return d.innerHTML;
    };

    const fmt = (n) => Number(n || 0).toLocaleString();

    function readJson(raw, fallback) {
        try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            rareGlow: state.rareGlow,
            valueOnly: state.valueOnly,
            serialOutline: state.serialOutline
        }));
    }

    function cleanName(name) {
        return String(name || '')
            .replace(/[\u200B-\u200F\uFEFF]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function isRareExcludedName(name) {
        const n = cleanName(name);
        const compact = n.replace(/\s+/g, '');
        return RARE_EXCLUDED_NAMES.has(n)
            || RARE_EXCLUDED_NAMES.has(compact)
            || compact === 'blackvalk'
            || n === 'eyes of emeraldwrath';
    }

    function isRareExcludedItem(itemOrStack) {
        return isRareExcludedName(itemOrStack?.name || itemOrStack?.Name || itemOrStack?.title || '');
    }

    function gmGetJson(url) {
        // Plain page-context fetch: koromons.net serves open CORS headers, so no GM privilege
        // is needed and console/local mode works too. (Name kept for call-site compatibility.)
        return fetch(url, { headers: { Accept: 'application/json' } })
            .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }

    const INTERIUM_VALUES_FALLBACK_URL = 'https://raw.githubusercontent.com/unitedbygrief/koronevalues/refs/heads/main/valu.json';
    // Fetch an item array from the primary Koromon's endpoint; if that is down or returns
    // nothing, transparently fall back to the GitHub valu.json snapshot so the collectibles
    // page keeps showing values/demand while koromons.net is unavailable.
    async function gmGetItemsWithFallback(primaryUrl) {
        const toRows = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : (Array.isArray(d?.data) ? d.data : null));
        try {
            const rows = toRows(await gmGetJson(primaryUrl));
            if (rows && rows.length) return rows;
            throw new Error('primary returned no items');
        } catch (e) {
            console.warn('[Interium] api/items unavailable, using valu.json fallback:', (e && e.message) || e);
            const rows = toRows(await gmGetJson(INTERIUM_VALUES_FALLBACK_URL));
            if (!rows) throw new Error('valu.json fallback invalid');
            return rows;
        }
    }

    function numFromAny(v) {
        if (v === undefined || v === null || v === '') return 0;
        if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
        const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        return m ? Math.round(Number(m[0]) || 0) : 0;
    }

    function hasRareTag(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const directKeys = ['Rare', 'rare', 'isRare', 'IsRare', 'is_rare', 'rareItem', 'RareItem', 'limitedRare', 'LimitedRare'];
        for (const key of directKeys) {
            if (obj[key] === true) return true;
            if (typeof obj[key] === 'string' && /\brare\b/i.test(obj[key])) return true;
        }
        const tagKeys = ['tag', 'tags', 'Tag', 'Tags', 'rarity', 'Rarity', 'type', 'Type', 'labels', 'Labels'];
        for (const key of tagKeys) {
            const value = obj[key];
            if (Array.isArray(value) && value.some(v => /\brare\b/i.test(String(v)))) return true;
            if (typeof value === 'string' && /\brare\b/i.test(value)) return true;
        }
        return Object.entries(obj).some(([key, value]) => {
            if (!/rare|rarity|tag|label/i.test(key)) return false;
            if (value === true) return true;
            if (Array.isArray(value)) return value.some(v => /\brare\b/i.test(String(v)));
            return /\brare\b/i.test(String(value));
        });
    }

    function copyCountFromValueItem(obj) {
        if (!obj || typeof obj !== 'object') return 0;
        const keys = [
            'Copies', 'copies', 'CopyCount', 'copyCount', 'copy_count', 'TotalCopies', 'totalCopies',
            'total_copies', 'Amount', 'amount', 'Quantity', 'quantity', 'Qty', 'qty', 'Stock', 'stock',
            'Owners', 'owners', 'Circulation', 'circulation', 'Available', 'available'
        ];
        for (const key of keys) {
            const n = numFromAny(obj[key]);
            if (n > 0) return n;
        }
        for (const [key, value] of Object.entries(obj)) {
            if (!/(copy|copies|quantity|stock|amount|circulation|owners|available)/i.test(key)) continue;
            const n = numFromAny(value);
            if (n > 0) return n;
        }
        return 0;
    }

    function isUntrackedDemand(raw) {
        const s = String(raw ?? '').trim().toLowerCase();
        return !s || s === 'n/a' || s === 'none' || s === 'unknown' || s === 'unassigned' || s === 'untracked' || s === 'not tracked' || s === 'unranked' || s === 'tbd' || s === '-';
    }

    function demandBucket(raw) {
        if (raw && typeof raw === 'object') {
            for (const key of ['label', 'name', 'value', 'rating', 'tier', 'status']) {
                const found = demandBucket(raw[key]);
                if (found) return found;
            }
            return '';
        }
        const s = String(raw ?? '').trim().toLowerCase();
        if (!s || isUntrackedDemand(s)) return '';
        if (/^(?:4|5)$/.test(s) || /amazing|insane|very high|high|hot|strong|rising|good|overpay|\bop\b|demanded/.test(s)) return 'high';
        if (/^(?:0|1)$/.test(s) || /terrible|very low|low|bad|weak|dead|dropping|declin|poor/.test(s)) return 'low';
        if (/^(?:2|3)$/.test(s) || /decent|medium|med|stable|normal|average|ok|fair|mid/.test(s)) return 'medium';
        return '';
    }

    function demandInfo(rawLabel) {
        const label = String(rawLabel ?? '').trim();
        if (!label) return { label: '', cls: '', icon: '' };
        const bucket = demandBucket(label);
        if (bucket === 'high') return { label, cls: 'pk-demand-high', icon: '▲' };
        if (bucket === 'low') return { label, cls: 'pk-demand-low', icon: '▼' };
        if (bucket === 'medium') return { label, cls: 'pk-demand-medium', icon: '◆' };
        return { label: '', cls: '', icon: '' };
    }

    function rawDemandFromValueItem(obj) {
        if (!obj || typeof obj !== 'object') return '';
        // Koromon’s exposes demand directly as obj.Demand, e.g. "High", "Decent",
        // "Low", "Terrible". Untracked items use "None"/"Unassigned" and must
        // never render a pill. Trend (e.g. "Stable") must never be read here.
        const scanDemand = (node, depth = 0) => {
            if (!node || typeof node !== 'object' || depth > 3) return '';
            for (const [key, value] of Object.entries(node)) {
                if (!/demand/i.test(key)) continue;
                if (typeof value === 'string' || typeof value === 'number') {
                    if (isUntrackedDemand(value)) return '';
                    if (demandBucket(value)) return String(value).trim();
                    continue;
                }
                if (value && typeof value === 'object') {
                    const nested = scanDemand(value, depth + 1);
                    if (nested) return nested;
                }
            }
            return '';
        };
        return scanDemand(obj);
    }

    function isProjectedValueItem(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const direct = obj.Projected ?? obj.projected ?? obj.IsProjected ?? obj.isProjected ?? obj.projectedItem ?? obj.ProjectedItem;
        if (direct === true) return true;
        if (typeof direct === 'string' && /true|yes|projected|proj/i.test(direct)) return true;
        const tags = [obj.Tag, obj.tag, obj.Tags, obj.tags, obj.Status, obj.status, obj.Notes, obj.notes].flat();
        return tags.some(v => /projected|proj/i.test(String(v)));
    }

    function lookupDemand(item) {
        const id = String(item.assetId || '');
        if (state.demandById.has(id)) return state.demandById.get(id) || '';
        const exact = cleanName(item.name);
        return state.demandByName.get(exact) || '';
    }

    function lookupProjected(item, value) {
        const id = String(item.assetId || '');
        if (state.projectedById.has(id)) return !!state.projectedById.get(id);
        const exact = cleanName(item.name);
        if (state.projectedByName.has(exact)) return !!state.projectedByName.get(exact);
        const rap = lookupRap(item);
        return value > 0 && rap >= value * 1.8;
    }

    function isProjectedStack(stack) {
        return !!stack?.projected;
    }

    function indexValueItems(items) {
        state.valueItems = Array.isArray(items) ? items : [];
        state.valuesById.clear();
        state.valuesByName.clear();
        state.rapById.clear();
        state.rapByName.clear();
        state.rareById.clear();
        state.rareByName.clear();
        state.copiesById.clear();
        state.copiesByName.clear();
        state.demandById.clear();
        state.demandByName.clear();
        state.projectedById.clear();
        state.projectedByName.clear();

        for (const it of state.valueItems) {
            const id = it.itemId ?? it.ItemId ?? it.itemID ?? it.ItemID ?? it.item_id ?? it.assetId ?? it.AssetId ?? it.assetID ?? it.AssetID ?? it.asset_id ?? it.id ?? it.Id ?? it.ID;
            const name = it.Name ?? it.name ?? it.itemName ?? it.ItemName ?? it.item_name ?? it.title ?? '';
            const keyName = cleanName(name);
            const value = numFromAny(it.Value ?? it.value ?? it.val ?? it.Val);
            const rap = numFromAny(it.RAP ?? it.rap ?? it.RecentAveragePrice ?? it.recentAveragePrice);
            const copies = copyCountFromValueItem(it);
            const rare = !isRareExcludedItem({ name }) && (hasRareTag(it) || (copies > 0 && copies <= RARE_OWNER_CUTOFF));
            const demand = rawDemandFromValueItem(it);
            const projected = isProjectedValueItem(it);
            if (id !== undefined && value > 0) state.valuesById.set(String(id), value);
            if (keyName && value > 0) state.valuesByName.set(keyName, value);
            if (id !== undefined && rap > 0) state.rapById.set(String(id), rap);
            if (keyName && rap > 0) state.rapByName.set(keyName, rap);
            if (id !== undefined) state.rareById.set(String(id), rare);
            if (keyName) state.rareByName.set(keyName, rare);
            if (id !== undefined && copies > 0) state.copiesById.set(String(id), copies);
            if (keyName && copies > 0) state.copiesByName.set(keyName, copies);
            if (id !== undefined && demand) state.demandById.set(String(id), demand);
            if (keyName && demand) state.demandByName.set(keyName, demand);
            if (id !== undefined) state.projectedById.set(String(id), projected);
            if (keyName) state.projectedByName.set(keyName, projected);
        }
    }

    function indexKoromonsDemand(items) {
        state.demandById.clear();
        state.demandByName.clear();
        (Array.isArray(items) ? items : []).forEach(it => {
            const id = it.itemId ?? it.ItemId ?? it.itemID ?? it.ItemID ?? it.item_id ?? it.assetId ?? it.AssetId ?? it.assetID ?? it.AssetID ?? it.asset_id ?? it.id ?? it.Id ?? it.ID;
            const name = it.Name ?? it.name ?? it.itemName ?? it.ItemName ?? it.item_name ?? it.title ?? '';
            const keyName = cleanName(name);
            const demand = rawDemandFromValueItem(it);
            if (!demand) return;
            if (id !== undefined) state.demandById.set(String(id), demand);
            if (keyName) state.demandByName.set(keyName, demand);
        });
    }

    function hydrateCachedValues() {
        const cached = readJson(localStorage.getItem(VALUES_CACHE_KEY), null);
        if (!cached || !Array.isArray(cached.items) || !cached.items.length) return false;
        // Index whatever we have so real values render even if the cache is stale (last-good
        // fallback); the freshness result only decides whether the caller still tries a live refresh.
        indexValueItems(cached.items);
        const age = Date.now() - Number(cached.t || 0);
        return age >= 0 && age <= VALUES_CACHE_MAX_AGE_MS;
    }

    async function refreshValues() {
        try {
            const rows = await gmGetItemsWithFallback(VALUES_JSON_URL);
            if (!Array.isArray(rows) || !rows.length) throw new Error('No item array from Koromon’s api/items or valu.json fallback.');
            indexValueItems(rows);
            try { localStorage.setItem(VALUES_CACHE_KEY, JSON.stringify({ t: Date.now(), items: rows })); } catch (_) {}
            return true;
        } catch (e) {
            console.warn('[PK 5.0] Values refresh failed; keeping cached/RAP data', e);
            return false;
        }
    }

    const KOROMONS_ITEMS_URL = 'https://www.koromons.net/api/items';
    const KOROMONS_DEMAND_CACHE_KEY = 'pk_v50_koromons_demand_cache';
    const KOROMONS_DEMAND_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;

    function hydrateCachedKoromonsDemand() {
        const cached = readJson(localStorage.getItem(KOROMONS_DEMAND_CACHE_KEY), null);
        if (!cached || !Array.isArray(cached.items) || !cached.items.length) return false;
        // Index stale demand data too (last-good fallback) so demand badges don't fall back to blank.
        indexKoromonsDemand(cached.items);
        const age = Date.now() - Number(cached.t || 0);
        return age >= 0 && age <= KOROMONS_DEMAND_CACHE_MAX_AGE_MS;
    }

    async function refreshKoromonsDemand() {
        try {
            const rows = await gmGetItemsWithFallback(KOROMONS_ITEMS_URL);
            if (!Array.isArray(rows) || !rows.length) throw new Error('No item array from Koromon’s api/items or valu.json fallback.');
            indexKoromonsDemand(rows);
            try { localStorage.setItem(KOROMONS_DEMAND_CACHE_KEY, JSON.stringify({ t: Date.now(), items: rows })); } catch (_) {}
            return true;
        } catch (e) {
            console.warn('[PK 5.0] Koromon’s demand refresh failed', e);
            return false;
        }
    }

    function hasJsonValue(item) {
        const id = String(item.assetId || '');
        if (state.valuesById.has(id)) return true;
        const exact = cleanName(item.name);
        if (state.valuesByName.has(exact)) return true;
        const stripped = cleanName(String(item.name || '').replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ''));
        return !!stripped && state.valuesByName.has(stripped);
    }

    function lookupValue(item) {
        const id = String(item.assetId || '');
        if (state.valuesById.has(id)) return state.valuesById.get(id);
        const exact = cleanName(item.name);
        if (state.valuesByName.has(exact)) return state.valuesByName.get(exact);
        const stripped = cleanName(String(item.name || '').replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ''));
        if (stripped && state.valuesByName.has(stripped)) return state.valuesByName.get(stripped);
        return Number(item.recentAveragePrice || 0);
    }

    function lookupRap(item) {
        const id = String(item.assetId || '');
        if (state.rapById.has(id)) return state.rapById.get(id);
        const exact = cleanName(item.name);
        if (state.rapByName.has(exact)) return state.rapByName.get(exact);
        const stripped = cleanName(String(item.name || '').replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ''));
        if (stripped && state.rapByName.has(stripped)) return state.rapByName.get(stripped);
        return Number(item.recentAveragePrice || 0);
    }

    function lookupRare(item) {
        if (isRareExcludedItem(item)) return false;
        const id = String(item.assetId || '');
        if (state.rareById.has(id)) return !!state.rareById.get(id);
        const exact = cleanName(item.name);
        if (state.rareByName.has(exact)) return !!state.rareByName.get(exact);
        const copies = lookupCopies(item);
        return copies > 0 && copies <= RARE_OWNER_CUTOFF;
    }

    function lookupCopies(item) {
        const id = String(item.assetId || '');
        if (state.copiesById.has(id)) return state.copiesById.get(id);
        const exact = cleanName(item.name);
        return state.copiesByName.get(exact) || 0;
    }

    function ownerApiUrl(assetId, cursor = '', limit = 100) {
        return `https://www.pekora.zip/apisite/inventory/v2/assets/${encodeURIComponent(assetId)}/owners?cursor=${encodeURIComponent(cursor || '')}&limit=${encodeURIComponent(limit)}&sortOrder=Asc`;
    }

    function ownerRowsFromResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.owners)) return data.owners;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    }

    function nextOwnerCursorFromResponse(data) {
        return data?.nextPageCursor || data?.nextCursor || data?.cursor || data?.next || '';
    }

    function ownerCache() {
        return readJson(localStorage.getItem(OWNER_RARE_CACHE_KEY), {});
    }

    function cachedOwnerRare(assetId) {
        const cache = ownerCache();
        const row = cache[String(assetId || '')];
        if (!row) return null;
        const age = Date.now() - (Number(row.t) || 0);
        if (age < 0 || age > OWNER_RARE_CACHE_MAX_AGE_MS) return null;
        return row;
    }

    function setCachedOwnerRare(assetId, data) {
        const cache = ownerCache();
        cache[String(assetId || '')] = { ...data, t: Date.now() };
        localStorage.setItem(OWNER_RARE_CACHE_KEY, JSON.stringify(cache));
    }

    async function fetchOwnerRare(assetId) {
        const id = String(assetId || '').trim();
        if (!id) return { rare: false, ownerCount: 0, checked: false };
        const cached = cachedOwnerRare(id);
        if (cached && cached.checked) return cached;
        try {
            const first = await gmGetJson(ownerApiUrl(id, '', 100));
            const rows = ownerRowsFromResponse(first);
            const next = nextOwnerCursorFromResponse(first);
            const count = rows.length + (next ? 1 : 0);
            const result = { rare: rows.length <= RARE_OWNER_CUTOFF && !next, ownerCount: count, checked: true };
            setCachedOwnerRare(id, result);
            return result;
        } catch (e) {
            console.warn('[PK 4.0] Owner rare check failed', id, e);
            return { rare: false, ownerCount: 0, checked: false };
        }
    }

    async function checkDisplayedOwnerRarity(displayed) {
        for (const stack of displayed) {
            if (!stack || !stack.assetId || stack.isRare || isRareExcludedItem(stack) || state.ownerChecking.has(String(stack.assetId))) continue;
            state.ownerChecking.add(String(stack.assetId));
            try {
                const result = await fetchOwnerRare(stack.assetId);
                if (result.rare) markAssetRare(stack.assetId, result.ownerCount);
            } finally {
                state.ownerChecking.delete(String(stack.assetId));
            }
            await new Promise(r => setTimeout(r, 20));
        }
    }

    function rarePriorityScore(stack) {
        if (!stack || isRareExcludedItem(stack)) return 0;
        const id = String(stack.assetId || '');
        const jsonRare = state.rareById.has(id) ? !!state.rareById.get(id) : !!state.rareByName.get(cleanName(stack.name));
        const copies = stack.copies || state.copiesById.get(id) || state.copiesByName.get(cleanName(stack.name)) || 0;
        if (jsonRare || (copies > 0 && copies <= RARE_OWNER_CUTOFF)) return 3;
        if (stack.valueTotal >= 10000) return 2;
        return 1;
    }

    async function checkAllOwnerRarityOnce() {
        if (state.rareScanStarted) return;
        state.rareScanStarted = true;
        const scanQueue = [...state.stacks].sort((a, b) => rarePriorityScore(b) - rarePriorityScore(a) || b.valueTotal - a.valueTotal);
        for (const stack of scanQueue) {
            if (!stack || !stack.assetId || stack.isRare || isRareExcludedItem(stack) || state.ownerChecking.has(String(stack.assetId))) continue;
            state.ownerChecking.add(String(stack.assetId));
            try {
                const result = await fetchOwnerRare(stack.assetId);
                stack.ownerCount = result.ownerCount || 0;
                for (const u of state.unstacked) {
                    if (String(u.assetId) === String(stack.assetId)) u.ownerCount = stack.ownerCount;
                }
                if (result.rare) markAssetRare(stack.assetId, result.ownerCount);
            } finally {
                state.ownerChecking.delete(String(stack.assetId));
            }
            await new Promise(r => setTimeout(r, stack.isRare ? 12 : 45));
        }
        if (state.sortMode === 'rares') render();
    }

    function markAssetRare(assetId, ownerCount = 0) {
        const id = String(assetId || '');
        const matching = [...state.stacks, ...state.unstacked].filter(s => String(s.assetId) === id);
        if (matching.some(isRareExcludedItem)) {
            unmarkAssetRare(id);
            return;
        }
        for (const s of matching) {
            s.isRare = true;
            if (ownerCount) s.ownerCount = ownerCount;
        }
        document.querySelectorAll(`.pk-card[data-asset-id="${CSS.escape(id)}"]`).forEach(card => {
            card.classList.add('pk-rare');
            card.dataset.rare = '1';
            if (!card.querySelector('.pk-rare-gem')) card.insertAdjacentHTML('afterbegin', '<div class="pk-rare-gem" title="Rare"><svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M63.85 123.84l60.1-87.8.05-.02v-.03L96.04 4H32.01L4 35.93v.03l.03.07 59.42 87.45.32.44.07-.09-.22-.83.23.84z" fill="#81D4FA"/><linearGradient id="int-rare-a" x1="4.111" x2="123.89" y1="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".001"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-a)" d="M63.79 123.93L4.11 36.03l27.9-31.96h64.03l27.85 31.96z"/><path fill="none" d="M64 4l-.05.07h.1z"/><linearGradient id="int-rare-b" x1="63.599" x2="63.599" y1="123.89" y2="36.003" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset="0"/><stop stop-color="#7DD3FA" offset=".221"/><stop stop-color="#72CFF9" offset=".431"/><stop stop-color="#5EC8F8" offset=".638"/><stop stop-color="#44BFF7" offset=".841"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-b)" d="M63.78 123.89L87.55 36l-47.9.05z"/><path fill="#81D4FA" d="M87.55 36h.39l-.28-.38z"/><linearGradient id="int-rare-c" x1="93.897" x2="93.897" y1="123.91" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#039BE5" offset="0"/><stop stop-color="#0398E2" offset=".369"/><stop stop-color="#0390D9" offset=".638"/><stop stop-color="#0282C9" offset=".874"/><stop stop-color="#0277BD" offset="1"/></linearGradient><path fill="url(#int-rare-c)" d="M124 36.02L87.58 36l-23.79 87.91L124 36.03z"/><linearGradient id="int-rare-d" x1="33.944" x2="33.944" y1="123.91" y2="35.968" gradientUnits="userSpaceOnUse"><stop stop-color="#29B6F6" offset="0"/><stop stop-color="#25B3F4" offset=".331"/><stop stop-color="#1AABEF" offset=".646"/><stop stop-color="#079EE7" offset=".954"/><stop stop-color="#039BE5" offset="1"/></linearGradient><path fill="url(#int-rare-d)" d="M39.86 36.59L39 37.75l.86-1.16-.17-.61-35.52-.01-.06.06 59.67 87.88z"/><linearGradient id="int-rare-e" x1="29.51" x2="21.783" y1="5.457" y2="36.366" gradientUnits="userSpaceOnUse"><stop stop-color="#B3E5FC" offset=".005"/><stop stop-color="#4FC3F7" offset="1"/></linearGradient><path fill="url(#int-rare-e)" d="M40 36L32 4.1 3.74 36.05z"/><linearGradient id="int-rare-f" x1="105.87" x2="105.87" y1="7.06" y2="37.027" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-f)" d="M87.74 36l8-31.9L124 36.05z"/><linearGradient id="int-rare-g" x1="63.644" x2="63.644" y1="6.738" y2="35.715" gradientUnits="userSpaceOnUse"><stop stop-color="#E1F5FE" offset="0"/><stop stop-color="#D3F0FD" offset=".275"/><stop stop-color="#B3E5FC" offset="1"/></linearGradient><path fill="url(#int-rare-g)" d="M39.74 36l24-31.96L87.55 36z"/><linearGradient id="int-rare-h" x1="47.868" x2="47.868" y1="4.484" y2="37.34" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-h)" d="M64 4.04L40 36.05 31.74 4z"/><linearGradient id="int-rare-i" x1="63.736" x2="96" y1="20.023" y2="20.023" gradientUnits="userSpaceOnUse"><stop stop-color="#4FC3F7" offset=".011"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-i)" d="M63.74 4.04l24 32.01L96 4z"/><path d="M94.67 7l25.53 29.2-56.42 82.41L7.76 36.19 33.37 7h61.3m1.37-3H32.01L4 35.93v.03l.03.07 59.74 87.9 60.18-87.9.05-.02v-.03L96.04 4z" fill="#424242" opacity=".2"/></svg></div>');
        });
    }

    function unmarkAssetRare(assetId) {
        const id = String(assetId || '');
        for (const s of [...state.stacks, ...state.unstacked]) {
            if (String(s.assetId) === id) s.isRare = false;
        }
        document.querySelectorAll(`.pk-card[data-asset-id="${CSS.escape(id)}"]`).forEach(card => {
            card.classList.remove('pk-rare');
            card.dataset.rare = '0';
            card.querySelectorAll('.pk-rare-gem').forEach(el => el.remove());
        });
    }

    async function fetchAll() {
        const items = [];
        let cursor = '';
        do {
            const url = `https://www.pekora.zip/apisite/inventory/v1/users/${encodeURIComponent(userId)}/assets/collectibles?limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
            const data = await gmGetJson(url);
            if (Array.isArray(data?.data)) items.push(...data.data);
            cursor = data?.nextPageCursor || '';
        } while (cursor);
        return items;
    }

    function serialColor(num) {
        if (!num) return '#aab2bd';
        if (num === 1) return '#ffd700';
        if (num <= 5) return '#ff5d73';
        if (num <= 10) return '#ff922b';
        if (num <= 25) return '#ffe066';
        if (num <= 50) return '#69db7c';
        if (num <= 100) return '#4dabf7';
        return '#aab2bd';
    }

    function specialSerialRank(n) {
        const x = Number(n || 0);
        if (!x) return 999999;
        const target = [1, 2, 3, 5, 10, 25, 50, 100];
        const idx = target.indexOf(x);
        return idx >= 0 ? idx : 1000 + x;
    }

    function serialText(stack) {
        if (!stack.serials.length) return 'Serial: none';
        const sorted = [...stack.serials].sort((a, b) => a - b);
        return `Serial: ${sorted.slice(0, 3).map(n => `#${n}`).join(', ')}${sorted.length > 3 ? ' +' + (sorted.length - 3) : ''}`;
    }

    function makeStacks(items) {
        const map = new Map();
        for (const item of items) {
            const value = lookupValue(item);
            const rap = lookupRap(item);
            const key = String(item.assetId || cleanName(item.name));
            if (!map.has(key)) {
                map.set(key, {
                    uid: String(item.assetId),
                    assetId: item.assetId,
                    name: item.name || 'Unknown Item',
                    rapEach: rap,
                    valueEach: value,
                    count: 0,
                    items: [],
                    bestSerial: null,
                    serials: [],
                    isRare: isRareExcludedItem(item) ? false : lookupRare(item),
                    copies: lookupCopies(item),
                    hasValue: hasJsonValue(item),
                    projected: lookupProjected(item, value),
                    demand: lookupDemand(item),
                    ownerCount: 0
                });
            }
            const s = map.get(key);
            s.count++;
            s.items.push(item);
            if (item.serialNumber) {
                const n = Number(item.serialNumber);
                s.serials.push(n);
                if (s.bestSerial === null || n < s.bestSerial) s.bestSerial = n;
            }
            if (lookupProjected(item, value)) s.projected = true;
            if (!s.demand) s.demand = lookupDemand(item);
        }
        return [...map.values()].map(s => ({
            ...s,
            rapTotal: s.items.reduce((sum, i) => sum + lookupRap(i), 0),
            valueTotal: s.valueEach * s.count,
            demand: s.demand || ''
        }));
    }

    function makeUnstacked(stacks) {
        return stacks.flatMap(s => s.items.map(i => {
            const value = lookupValue(i);
            const rap = lookupRap(i);
            return {
                uid: `${i.assetId}:${i.userAssetId}`,
                assetId: i.assetId,
                name: i.name || s.name || 'Unknown Item',
                rapEach: rap,
                valueEach: value,
                count: 1,
                items: [i],
                bestSerial: i.serialNumber ? Number(i.serialNumber) : null,
                serials: i.serialNumber ? [Number(i.serialNumber)] : [],
                isRare: isRareExcludedItem(i) ? false : !!s.isRare,
                copies: s.copies || 0,
                hasValue: hasJsonValue(i),
                rapTotal: rap,
                valueTotal: value,
                demand: lookupDemand(i) || s.demand || '',
                projected: lookupProjected(i, value) || !!s.projected,
                ownerCount: s.ownerCount || 0
            };
        }));
    }

    function projectedBadgeHTML(stack) {
        return isProjectedStack(stack) ? '<div class="pk-projected-badge" title="Possible projected item"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M63.37 53.52C53.982 36.37 44.59 19.22 35.2 2.07a3.687 3.687 0 00-6.522 0C19.289 19.22 9.892 36.37.508 53.52c-1.453 2.649.399 6.083 3.258 6.083h56.35c1.584 0 2.648-.853 3.203-2.01.698-1.102.885-2.565.055-4.075" fill="#ffdd15"/><path d="M28.917 34.477l-.889-13.262c-.166-2.583-.246-4.439-.246-5.565 0-1.534.4-2.727 1.202-3.588.805-.856 1.863-1.286 3.175-1.286 1.583 0 2.646.551 3.178 1.646.537 1.102.809 2.684.809 4.751 0 1.215-.066 2.453-.198 3.708l-1.19 13.649c-.129 1.626-.404 2.872-.827 3.739-.426.871-1.128 1.301-2.109 1.301-.992 0-1.69-.419-2.072-1.257-.393-.841-.668-2.12-.833-3.836m3.072 18.217c-1.125 0-2.106-.362-2.947-1.093-.841-.728-1.26-1.748-1.26-3.058 0-1.143.4-2.12 1.202-2.921.805-.806 1.786-1.206 2.951-1.206s2.153.4 2.977 1.206c.815.801 1.234 1.778 1.234 2.921 0 1.29-.419 2.308-1.246 3.044a4.245 4.245 0 01-2.911 1.107" fill="#1f2e35"/></svg></div>' : '';
    }

    const EXT_ARROW = (c) => `<svg xmlns="http://www.w3.org/2000/svg" height="15" width="15" viewBox="0 -960 960 960" fill="${c}" style="flex:none;"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>`;
    const extIcon = (href, tip, color, cls) => `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${tip}" class="pg-ext-ic ${cls}" style="display:inline-flex;align-items:center;margin-left:4px;opacity:.7;text-decoration:none;vertical-align:middle;line-height:0;cursor:pointer;">${EXT_ARROW(color)}</a>`;
    try{ if(!document.getElementById('pg-ext-ic-guard')){ const _g=document.createElement('meta'); _g.id='pg-ext-ic-guard'; (document.head||document.documentElement).appendChild(_g); document.addEventListener('click',(e)=>{ try{ if(e.target&&e.target.closest&&e.target.closest('.pg-ext-ic')) e.stopPropagation(); }catch(_e){} }, true); } }catch(_e){}
    function cardHTML(stack, index) {
        const mine = state.mine.has(String(stack.uid));
        const d = demandInfo(stack.demand);
        const demandHTML = d.label ? `<div class="pk-demand-pill ${d.cls}"><span>${d.icon}</span>${d.label}</div>` : '';
        const serialStyle = serialColor(stack.bestSerial);
        return `
            <div class="pk-card ${stack.isRare ? 'pk-rare' : ''} ${specialSerialRank(stack.bestSerial) < 1000 ? 'pk-special-serial' : ''}" data-index="${index}" data-uid="${esc(stack.uid)}" data-asset-id="${esc(stack.assetId)}" data-rare="${stack.isRare ? '1' : '0'}">
                ${stack.isRare ? '<div class="pk-rare-gem" title="Rare"><svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M63.85 123.84l60.1-87.8.05-.02v-.03L96.04 4H32.01L4 35.93v.03l.03.07 59.42 87.45.32.44.07-.09-.22-.83.23.84z" fill="#81D4FA"/><linearGradient id="int-rare-a" x1="4.111" x2="123.89" y1="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".001"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-a)" d="M63.79 123.93L4.11 36.03l27.9-31.96h64.03l27.85 31.96z"/><path fill="none" d="M64 4l-.05.07h.1z"/><linearGradient id="int-rare-b" x1="63.599" x2="63.599" y1="123.89" y2="36.003" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset="0"/><stop stop-color="#7DD3FA" offset=".221"/><stop stop-color="#72CFF9" offset=".431"/><stop stop-color="#5EC8F8" offset=".638"/><stop stop-color="#44BFF7" offset=".841"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-b)" d="M63.78 123.89L87.55 36l-47.9.05z"/><path fill="#81D4FA" d="M87.55 36h.39l-.28-.38z"/><linearGradient id="int-rare-c" x1="93.897" x2="93.897" y1="123.91" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#039BE5" offset="0"/><stop stop-color="#0398E2" offset=".369"/><stop stop-color="#0390D9" offset=".638"/><stop stop-color="#0282C9" offset=".874"/><stop stop-color="#0277BD" offset="1"/></linearGradient><path fill="url(#int-rare-c)" d="M124 36.02L87.58 36l-23.79 87.91L124 36.03z"/><linearGradient id="int-rare-d" x1="33.944" x2="33.944" y1="123.91" y2="35.968" gradientUnits="userSpaceOnUse"><stop stop-color="#29B6F6" offset="0"/><stop stop-color="#25B3F4" offset=".331"/><stop stop-color="#1AABEF" offset=".646"/><stop stop-color="#079EE7" offset=".954"/><stop stop-color="#039BE5" offset="1"/></linearGradient><path fill="url(#int-rare-d)" d="M39.86 36.59L39 37.75l.86-1.16-.17-.61-35.52-.01-.06.06 59.67 87.88z"/><linearGradient id="int-rare-e" x1="29.51" x2="21.783" y1="5.457" y2="36.366" gradientUnits="userSpaceOnUse"><stop stop-color="#B3E5FC" offset=".005"/><stop stop-color="#4FC3F7" offset="1"/></linearGradient><path fill="url(#int-rare-e)" d="M40 36L32 4.1 3.74 36.05z"/><linearGradient id="int-rare-f" x1="105.87" x2="105.87" y1="7.06" y2="37.027" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-f)" d="M87.74 36l8-31.9L124 36.05z"/><linearGradient id="int-rare-g" x1="63.644" x2="63.644" y1="6.738" y2="35.715" gradientUnits="userSpaceOnUse"><stop stop-color="#E1F5FE" offset="0"/><stop stop-color="#D3F0FD" offset=".275"/><stop stop-color="#B3E5FC" offset="1"/></linearGradient><path fill="url(#int-rare-g)" d="M39.74 36l24-31.96L87.55 36z"/><linearGradient id="int-rare-h" x1="47.868" x2="47.868" y1="4.484" y2="37.34" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-h)" d="M64 4.04L40 36.05 31.74 4z"/><linearGradient id="int-rare-i" x1="63.736" x2="96" y1="20.023" y2="20.023" gradientUnits="userSpaceOnUse"><stop stop-color="#4FC3F7" offset=".011"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-i)" d="M63.74 4.04l24 32.01L96 4z"/><path d="M94.67 7l25.53 29.2-56.42 82.41L7.76 36.19 33.37 7h61.3m1.37-3H32.01L4 35.93v.03l.03.07 59.74 87.9 60.18-87.9.05-.02v-.03L96.04 4z" fill="#424242" opacity=".2"/></svg></div>' : ''}
                ${state.stacked && stack.count > 1 ? `<div class="pk-badge">x${stack.count}</div>` : ''}
                ${projectedBadgeHTML(stack)}
                <a class="pk-thumb-link" href="/catalog/${esc(stack.assetId)}/--">
                    <img class="pk-thumb" src="/thumbs/asset.ashx?assetId=${esc(stack.assetId)}" loading="lazy">
                </a>
                <div class="pk-name" title="${esc(stack.name)}">${esc(stack.name)}${state.stacked && stack.count > 1 ? ` <span class="pk-name-count">×${stack.count}</span>` : ''}</div>
                ${demandHTML}
                <div class="pk-line"><b>RAP:</b> ${fmt(stack.rapEach)}${extIcon("/catalog/"+esc(stack.assetId)+"/--","Open on Pekora catalog","currentColor","pg-ext-cat")}</div>
                <div class="pk-line"><b>Value:</b> <span class="pk-value">${fmt(stack.valueEach)}</span>${stack.valueEach>0?extIcon("https://www.koromons.net/item?id="+esc(stack.assetId),"View on Koromon’s","#0084dd","pg-ext-koro"):""}</div>
                ${state.stacked && stack.count > 1 ? `<div class="pk-line"><b>Total:</b> <span class="pk-total">${fmt(stack.valueTotal)}</span></div>` : ''}
                <div class="pk-serial" style="color:${serialStyle}!important">${esc(serialText(stack))}</div>
                <div class="pk-card-actions">
                    <button class="pk-mini-btn pk-uaids">View UAIDs (${stack.count})</button>
                    <button class="pk-mini-btn pk-add-mine ${mine ? 'pk-added-mine' : ''}">${mine ? '✓ Added' : '+ Add to Calculator'}</button>
                </div>
            </div>`;
    }

    function showUAIDs(stack) {
        const rows = stack.items.map(i => `
            <div class="pk-uaid">
                <div><b>UAID:</b> ${esc(i.userAssetId)}</div>
                <div style="color:${serialColor(i.serialNumber)}!important"><b>Serial:</b> ${i.serialNumber ? '#' + esc(i.serialNumber) : 'none'}</div>
                <div><b>RAP:</b> ${fmt(lookupRap(i))}</div>
            </div>`).join('');
        const modal = document.createElement('div');
        modal.className = 'pk-modal-backdrop';
        modal.innerHTML = `
            <div class="pk-modal">
                <div class="pk-modal-head">
                    <div><b>${esc(stack.name)}</b><br><span>${fmt(stack.count)} owned</span></div>
                    <button class="pk-close">Close</button>
                </div>
                <div class="pk-uaid-grid">${rows}</div>
            </div>`;
        modal.querySelector('.pk-close').onclick = () => modal.remove();
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }

    function sortStacks(stacks) {
        const arr = [...stacks];
        if (state.sortMode === 'rares') {
            arr.sort((a, b) => Number(!!b.isRare) - Number(!!a.isRare) || b.valueTotal - a.valueTotal);
        } else if (state.sortMode === 'rap') {
            arr.sort((a, b) => b.rapTotal - a.rapTotal);
        } else if (state.sortMode === 'serials') {
            arr.sort((a, b) => (a.bestSerial || 999999999) - (b.bestSerial || 999999999) || b.valueTotal - a.valueTotal);
        } else if (state.sortMode === 'az') {
            arr.sort((a, b) => a.name.localeCompare(b.name));
        } else if (state.sortMode === 'missing') {
            arr.sort((a, b) => Number(!b.hasValue) - Number(!a.hasValue) || b.rapTotal - a.rapTotal);
        } else {
            arr.sort((a, b) => b.valueTotal - a.valueTotal);
        }
        return arr;
    }

    function visibleStacks() {
        let source = state.stacked ? state.stacks : state.unstacked;
        const q = state.query.trim().toLowerCase();
        if (q) source = source.filter(s => s.name.toLowerCase().includes(q) || String(s.assetId).includes(q));
        if (state.valueOnly) source = source.filter(s => s.hasValue);
        return sortStacks(source);
    }

    function totalsFor(set, extraMap) {
        const source = state.stacked ? state.stacks : state.unstacked;
        const owned = source.filter(s => set.has(String(s.uid)));
        const extra = extraMap ? [...extraMap.values()] : [];
        const selected = [...owned, ...extra];
        return {
            selected,
            value: selected.reduce((sum, s) => sum + s.valueTotal, 0),
            rap: selected.reduce((sum, s) => sum + s.rapTotal, 0),
            count: selected.reduce((sum, s) => sum + s.count, 0)
        };
    }

    function theirTotals() {
        return totalsFor(new Set(), state.theirItems);
    }

    // The calculator panel lives on document.body and is created lazily, so
    // the Item Calculator button works even if the grid re-render bailed out
    // or a site re-render removed the panel.
    function ensureCalcPanel() {
        let calc = document.querySelector('#pk-calc-panel');
        if (calc) return calc;
        calc = document.createElement('aside');
        calc.id = 'pk-calc-panel';
        calc.className = 'pk-calc-panel';
        calc.innerHTML = `
            <div id="pk-calc-head" class="pk-calc-head">
                <span>Trade Calculator</span>
                <button id="pk-clear-calc" class="pk-clear">Clear</button>
            </div>
            <div class="pk-calc-columns">
                <section><h4>My Side <button id="pk-add-any-mine" class="pk-clear pk-add-any">Add Any Item</button></h4><div id="pk-calc-mine" class="pk-calc-list"></div></section>
                <section><h4>Their Side <button id="pk-add-any-theirs" class="pk-clear pk-add-any">Add Any Item</button></h4><div id="pk-calc-theirs" class="pk-calc-list"></div></section>
            </div>
            <div id="pk-calc-summary" class="pk-calc-total"></div>
        `;
        document.body.appendChild(calc);
        calc.querySelector('#pk-clear-calc').addEventListener('click', () => { state.mine.clear(); state.mineItems.clear(); state.theirItems.clear(); render(); });
        calc.querySelector('#pk-add-any-mine').addEventListener('click', () => showItemPicker('mine'));
        calc.querySelector('#pk-add-any-theirs').addEventListener('click', () => showItemPicker('theirs'));
        calc.addEventListener('click', e => {
            const btn = e.target.closest('.pk-calc-remove');
            if (!btn) return;
            const row = btn.closest('.pk-calc-item');
            const key = row?.dataset?.key;
            if (row?.dataset?.side === 'mine') { state.mine.delete(String(key)); state.mineItems.delete(String(key)); }
            else state.theirItems.delete(String(key));
            render();
        });
        makeDraggable(calc, calc.querySelector('#pk-calc-head'));
        return calc;
    }

    function updateCalc() {
        const panel = ensureCalcPanel();
        if (!panel) return;
        // Toggle visibility first: even if totals computation ever fails,
        // the panel still opens/closes on click.
        document.body.classList.toggle('pk-calc-open', state.calcOpen);
        const mine = totalsFor(state.mine, state.mineItems);
        const theirs = theirTotals();
        const diff = theirs.value - mine.value;
        panel.querySelector('#pk-calc-mine').innerHTML = calcSideHTML(mine.selected, 'mine');
        panel.querySelector('#pk-calc-theirs').innerHTML = calcSideHTML(theirs.selected, 'theirs');
        panel.querySelector('#pk-calc-summary').innerHTML = `
            <div class="pk-calc-total-row"><span>My Value</span><strong>${fmt(mine.value)}</strong></div>
            <div class="pk-calc-total-row"><span>Their Value</span><strong>${fmt(theirs.value)}</strong></div>
            <div class="pk-calc-total-row ${diff >= 0 ? 'pk-win' : 'pk-lose'}"><span>Difference</span><strong>${diff >= 0 ? '+' : '-'}${fmt(Math.abs(diff))}</strong></div>
        `;
    }

    function calcSideHTML(items, side) {
        if (!items.length) return '<div class="pk-calc-empty">Add items here</div>';
        return items.map(s => `
            <div class="pk-calc-item" data-key="${esc(s.uid)}" data-side="${side}">
                <img src="/thumbs/asset.ashx?assetId=${esc(s.assetId)}" loading="lazy">
                <div><b>${esc(s.name)}</b><span>x${s.count} · ${fmt(s.valueTotal)}</span></div>
                <button class="pk-calc-remove">×</button>
            </div>`).join('');
    }

    function render() {
        const row = getInventoryRow();
        if (!row) { updateCalc(); updateToolbarState(); return; }
        removeOriginalPagination();
        const shown = visibleStacks();
        row.innerHTML = `<div class="pk-grid">${shown.map((s, i) => cardHTML(s, i)).join('')}</div>`;
        attachCardEvents(row, shown);
        updateTopStats(shown);
        updateToolbarState();
        updateCalc();
        applyRareGlowToggle();
        document.body.classList.toggle('pk-serial-outline-on', state.serialOutline);
        shown.filter(isRareExcludedItem).forEach(s => unmarkAssetRare(s.assetId));
        document.body.classList.add('pk-v41-ready');
        setTimeout(() => checkDisplayedOwnerRarity(shown), 0);
        setTimeout(() => checkAllOwnerRarityOnce(), 250);
    }

    function attachCardEvents(row, shown) {
        row.querySelectorAll('.pk-card').forEach(card => {
            const stack = shown[Number(card.dataset.index)];
            if (!stack) return;
            card.querySelector('.pk-uaids')?.addEventListener('click', () => showUAIDs(stack));
            card.querySelector('.pk-add-mine')?.addEventListener('click', () => {
                const key = String(stack.uid);
                state.mine.has(key) ? state.mine.delete(key) : state.mine.add(key);
                render();
            });
        });
    }

    function updateTopStats(shown) {
        const stats = document.querySelector('#pk-stats');
        if (stats) stats.remove();

        const count = document.querySelector('#pk-count');
        if (count) count.textContent = `${fmt(shown.length)} shown`;
    }

    function updateToolbarState() {
        document.querySelectorAll('[data-sort]').forEach(btn => btn.classList.toggle('pk-sort-active', btn.dataset.sort === state.sortMode));
        const stackBtn = document.querySelector('#pk-toggle-stack');
        if (stackBtn) stackBtn.textContent = state.stacked ? 'Unstack' : 'Stack';
        document.querySelector('#pk-toggle-value-only')?.classList.toggle('pk-sort-active', state.valueOnly);
        document.querySelector('#pk-toggle-calc')?.classList.toggle('pk-sort-active', state.calcOpen);
        document.querySelector('#pk-toggle-serial-outline')?.classList.toggle('pk-sort-active', state.serialOutline);
        document.body.classList.toggle('pk-serial-outline-on', state.serialOutline);
    }

    function getInventoryBody() {
        return document.querySelector('main .card.card-body.bg-dark.text-light');
    }

    function getInventoryRow() {
        return document.querySelector('#pk-results') || document.querySelector('main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row');
    }

    function removeOriginalPagination() {
        document.querySelectorAll(
            'ul.pagination,.pagination,nav[aria-label*="Page"],nav[aria-label*="Pagination"],.page-item,.page-link,.pagination-wrapper'
        ).forEach(el => {
            const nav = el.closest('nav') || el.closest('ul') || el;
            nav.remove();
        });

        document.querySelectorAll('main a, main button, main li, main span').forEach(el => {
            const t = (el.textContent || '').trim();
            if (/^[1-9]$/.test(t) && (el.className || '').toString().match(/page|pagination|btn/i)) {
                const parent = el.closest('nav,ul,.pagination,.pagination-wrapper,.d-flex') || el;
                parent.remove();
            }
        });
    }


    // Toolbar events are delegated at the document level so every button
    // keeps working even if the site re-renders/replaces the toolbar DOM
    // (a React re-render keeps the visible buttons but silently strips
    // directly-attached listeners - the exact "button does nothing" bug).
    let _toolbarHandlersInstalled = false;
    function installToolbarHandlers() {
        if (_toolbarHandlersInstalled) return;
        _toolbarHandlersInstalled = true;
        document.addEventListener('input', (e) => {
            const t = e.target;
            if (t && t.id === 'pk-search') { state.query = t.value || ''; render(); }
        }, true);
        document.addEventListener('click', (e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) return;
            try {
                const sortBtn = t.closest('#pk-shell [data-sort]');
                if (sortBtn) { state.sortMode = sortBtn.dataset.sort; render(); return; }
                if (t.closest('#pk-toggle-calc')) { state.calcOpen = !state.calcOpen; updateCalc(); updateToolbarState(); return; }
                if (t.closest('#pk-toggle-stack')) { state.stacked = !state.stacked; render(); return; }
                if (t.closest('#pk-toggle-value-only')) { state.valueOnly = !state.valueOnly; saveSettings(); render(); return; }
                if (t.closest('#pk-toggle-serial-outline')) { state.serialOutline = !state.serialOutline; saveSettings(); render(); return; }
                if (t.closest('#pk-toggle-glow')) { state.rareGlow = !state.rareGlow; saveSettings(); applyRareGlowToggle(); return; }
            } catch (err) {
                console.error('[Interium] Toolbar action failed:', err);
            }
        }, true);
    }

    function buildShell() {
        if (document.getElementById('pk-shell')) return true;
        const body = getInventoryBody();
        const row = document.querySelector('main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row');
        if (!body || !row) return false;

        row.id = 'pk-results';
        removeOriginalPagination();
        const toolbar = document.createElement('div');
        toolbar.id = 'pk-shell';
        toolbar.innerHTML = `
            <div class="pk-toolbar">
                <div class="pk-toolbar-top">
                    <input id="pk-search" class="pk-search" placeholder="Search collectibles or asset id...">
                    <span id="pk-count" class="pk-count"></span>
                </div>
                <div class="pk-toolbar-bottom">
                    <div class="pk-tool-group">
                        <span class="pk-tool-label">Sort</span>
                        <button class="pk-btn" data-sort="value">Value</button>
                        <button class="pk-btn" data-sort="rap">RAP</button>
                        <button class="pk-btn" data-sort="serials">Serials</button>
                        <button class="pk-btn" data-sort="rares">Rares <svg width="11" height="11" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M63.85 123.84l60.1-87.8.05-.02v-.03L96.04 4H32.01L4 35.93v.03l.03.07 59.42 87.45.32.44.07-.09-.22-.83.23.84z" fill="#81D4FA"/><linearGradient id="int-rare-a" x1="4.111" x2="123.89" y1="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".001"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-a)" d="M63.79 123.93L4.11 36.03l27.9-31.96h64.03l27.85 31.96z"/><path fill="none" d="M64 4l-.05.07h.1z"/><linearGradient id="int-rare-b" x1="63.599" x2="63.599" y1="123.89" y2="36.003" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset="0"/><stop stop-color="#7DD3FA" offset=".221"/><stop stop-color="#72CFF9" offset=".431"/><stop stop-color="#5EC8F8" offset=".638"/><stop stop-color="#44BFF7" offset=".841"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-b)" d="M63.78 123.89L87.55 36l-47.9.05z"/><path fill="#81D4FA" d="M87.55 36h.39l-.28-.38z"/><linearGradient id="int-rare-c" x1="93.897" x2="93.897" y1="123.91" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#039BE5" offset="0"/><stop stop-color="#0398E2" offset=".369"/><stop stop-color="#0390D9" offset=".638"/><stop stop-color="#0282C9" offset=".874"/><stop stop-color="#0277BD" offset="1"/></linearGradient><path fill="url(#int-rare-c)" d="M124 36.02L87.58 36l-23.79 87.91L124 36.03z"/><linearGradient id="int-rare-d" x1="33.944" x2="33.944" y1="123.91" y2="35.968" gradientUnits="userSpaceOnUse"><stop stop-color="#29B6F6" offset="0"/><stop stop-color="#25B3F4" offset=".331"/><stop stop-color="#1AABEF" offset=".646"/><stop stop-color="#079EE7" offset=".954"/><stop stop-color="#039BE5" offset="1"/></linearGradient><path fill="url(#int-rare-d)" d="M39.86 36.59L39 37.75l.86-1.16-.17-.61-35.52-.01-.06.06 59.67 87.88z"/><linearGradient id="int-rare-e" x1="29.51" x2="21.783" y1="5.457" y2="36.366" gradientUnits="userSpaceOnUse"><stop stop-color="#B3E5FC" offset=".005"/><stop stop-color="#4FC3F7" offset="1"/></linearGradient><path fill="url(#int-rare-e)" d="M40 36L32 4.1 3.74 36.05z"/><linearGradient id="int-rare-f" x1="105.87" x2="105.87" y1="7.06" y2="37.027" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-f)" d="M87.74 36l8-31.9L124 36.05z"/><linearGradient id="int-rare-g" x1="63.644" x2="63.644" y1="6.738" y2="35.715" gradientUnits="userSpaceOnUse"><stop stop-color="#E1F5FE" offset="0"/><stop stop-color="#D3F0FD" offset=".275"/><stop stop-color="#B3E5FC" offset="1"/></linearGradient><path fill="url(#int-rare-g)" d="M39.74 36l24-31.96L87.55 36z"/><linearGradient id="int-rare-h" x1="47.868" x2="47.868" y1="4.484" y2="37.34" gradientUnits="userSpaceOnUse"><stop stop-color="#81D4FA" offset=".009"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-h)" d="M64 4.04L40 36.05 31.74 4z"/><linearGradient id="int-rare-i" x1="63.736" x2="96" y1="20.023" y2="20.023" gradientUnits="userSpaceOnUse"><stop stop-color="#4FC3F7" offset=".011"/><stop stop-color="#29B6F6" offset="1"/></linearGradient><path fill="url(#int-rare-i)" d="M63.74 4.04l24 32.01L96 4z"/><path d="M94.67 7l25.53 29.2-56.42 82.41L7.76 36.19 33.37 7h61.3m1.37-3H32.01L4 35.93v.03l.03.07 59.74 87.9 60.18-87.9.05-.02v-.03L96.04 4z" fill="#424242" opacity=".2"/></svg></button>
                        <button class="pk-btn" data-sort="az">A-Z</button>
                    </div>
                    <div class="pk-tool-group pk-tool-group-right">
                        <span class="pk-tool-label">Tools</span>
                        <button id="pk-toggle-calc" class="pk-btn">Item Calculator</button>
                        <button id="pk-toggle-value-only" class="pk-btn">Value Only</button>
                        <button id="pk-toggle-serial-outline" class="pk-btn">Serial Outline</button>
                        <button id="pk-toggle-glow" class="pk-btn">Glow</button>
                        <button id="pk-toggle-stack" class="pk-btn pk-btn-green">Unstack</button>
                    </div>
                </div>
            </div>
        `;
        row.parentElement.insertBefore(toolbar, row);

        ensureCalcPanel();
        installToolbarHandlers();
        return true;
    }

    function valueItemId(it, fallback = '') {
        return it.itemId ?? it.ItemId ?? it.assetId ?? it.AssetId ?? it.id ?? it.Id ?? fallback;
    }

    function valueItemName(it) {
        return it.Name ?? it.name ?? it.title ?? 'Unknown Item';
    }

    function valueItemValue(it) {
        return numFromAny(it.Value ?? it.value ?? it.val ?? it.Val);
    }

    function valueItemRap(it) {
        return numFromAny(it.RAP ?? it.rap ?? it.RecentAveragePrice ?? it.recentAveragePrice);
    }

    function showItemPicker(side = 'theirs') {
        const modal = document.createElement('div');
        modal.className = 'pk-modal-backdrop';

        const sortedItems = state.valueItems
            .map((it, originalIndex) => ({
                it,
                originalIndex,
                id: valueItemId(it, originalIndex),
                name: valueItemName(it),
                value: valueItemValue(it),
                rap: valueItemRap(it)
            }))
            .filter(row => row.name && row.value > 0)
            .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

        const title = side === 'mine' ? 'Add Any Item To My Side' : 'Add Any Item To Their Side';
        const rows = sortedItems.map((row, idx) => `
            <button class="pk-picker-row" data-picker-idx="${idx}" data-search="${esc(cleanName(row.name) + ' ' + row.id)}">
                <img class="pk-picker-img" src="/thumbs/asset.ashx?assetId=${esc(row.id)}" loading="lazy">
                <span>${esc(row.name)}</span>
                <b>${fmt(row.value)}</b>
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="pk-modal pk-picker-modal">
                <div class="pk-modal-head">
                    <div><b>${title}</b><br><span>Search Koromon’s items, sorted from highest value to lowest.</span></div>
                    <button class="pk-close">Close</button>
                </div>
                <input id="pk-picker-search" class="pk-search" placeholder="Search item name or asset id...">
                <div class="pk-picker-list">${rows}</div>
            </div>`;

        modal.querySelector('.pk-close').onclick = () => modal.remove();
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        modal.querySelector('#pk-picker-search').addEventListener('input', e => {
            const q = cleanName(e.target.value || '');
            modal.querySelectorAll('.pk-picker-row').forEach(btn => {
                btn.style.display = !q || btn.dataset.search.includes(q) ? '' : 'none';
            });
        });
        modal.querySelectorAll('.pk-picker-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = sortedItems[Number(btn.dataset.pickerIdx)];
                if (!row) return;

                const key = `${side}:${row.id}:${cleanName(row.name)}`;
                const map = side === 'mine' ? state.mineItems : state.theirItems;
                const old = map.get(key);
                const count = old ? old.count + 1 : 1;
                map.set(key, {
                    uid: key,
                    assetId: row.id,
                    name: row.name,
                    count,
                    valueEach: row.value,
                    rapEach: row.rap,
                    valueTotal: row.value * count,
                    rapTotal: row.rap * count
                });

                state.calcOpen = true;
                modal.remove();
                render();
            });
        });
        document.body.appendChild(modal);
        setTimeout(() => modal.querySelector('#pk-picker-search')?.focus(), 30);
    }

    function makeDraggable(panel, handle) {
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        handle.addEventListener('mousedown', e => {
            if (e.target.closest('button')) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            const r = panel.getBoundingClientRect();
            ox = r.left; oy = r.top;
            panel.classList.add('pk-calc-dragging');
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, ox + e.clientX - sx));
            const y = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, oy + e.clientY - sy));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });
        window.addEventListener('mouseup', () => { dragging = false; panel.classList.remove('pk-calc-dragging'); });
    }

    function startRareGlowAnimation() {
        if (state.rareRaf) return;
        const tick = () => {
            if (!state.rareGlow) {
                state.rareRaf = 0;
                document.documentElement.style.removeProperty('--pk-rare-angle');
                return;
            }
            state.rareAngle = (state.rareAngle + 1.6) % 360;
            document.documentElement.style.setProperty('--pk-rare-angle', `${state.rareAngle}deg`);
            state.rareRaf = requestAnimationFrame(tick);
        };
        state.rareRaf = requestAnimationFrame(tick);
    }

    function stopRareGlowAnimation() {
        if (state.rareRaf) cancelAnimationFrame(state.rareRaf);
        state.rareRaf = 0;
        document.documentElement.style.removeProperty('--pk-rare-angle');
    }

    function applyRareGlowToggle() {
        document.body.classList.toggle('pk-rare-glow-on', state.rareGlow);
        document.body.classList.toggle('pk-rare-glow-off', !state.rareGlow);
        if (state.rareGlow) startRareGlowAnimation();
        else stopRareGlowAnimation();
        const btn = document.querySelector('#pk-toggle-glow');
        if (btn) {
            btn.textContent = state.rareGlow ? 'Glow ON' : 'Glow OFF';
            btn.classList.toggle('pk-sort-active', state.rareGlow);
        }
    }

    function updateProfileTotals() {
        const side = document.querySelector('main .col-12.col-lg-3');
        if (!side) return;
        side.querySelector('#pk-profile-totals')?.remove();
        [...side.querySelectorAll('p,div')].filter(el => /Total RAP|Total Value|ID:/i.test(el.textContent || '')).forEach(el => el.remove());
        const totalRap = state.stacks.reduce((s, x) => s + x.rapTotal, 0);
        const totalValue = state.stacks.reduce((s, x) => s + x.valueTotal, 0);
        const box = document.createElement('div');
        box.id = 'pk-profile-totals';
        box.innerHTML = `
            <div class="pk-simple-total">Total RAP: <span>${fmt(totalRap)}</span></div>
            <div class="pk-simple-total">Total Value: <b>${fmt(totalValue)}</b></div>
        `;
        const img = side.querySelector('img');
        if (img) img.insertAdjacentElement('afterend', box);
        else side.appendChild(box);
    }

    function injectStyles() {
        if (document.querySelector('#pk-v40-style')) return;
        const style = document.createElement('style');
        style.id = 'pk-v40-style';
        style.textContent = `
            body{background:#0f1012!important;color:#f4f4f5!important;}
            ul.pagination,.pagination,nav[aria-label*="Page"],nav[aria-label*="Pagination"]{display:none!important;}
            main .container{max-width:calc(100vw - 28px)!important;width:max-content!important;padding-top:10px!important;}
            main .card.card-body.bg-dark.text-light{background:#151515!important;border:1px solid #303030!important;border-radius:12px!important;box-shadow:0 18px 44px rgba(0,0,0,.42)!important;width:max-content!important;max-width:calc(100vw - 28px)!important;overflow:visible!important;padding-top:16px!important;padding-right:28px!important;}
            main .col-12.col-lg-3{width:255px!important;max-width:255px!important;flex:0 0 255px!important;padding:12px 14px!important;background:transparent!important;border:0!important;box-shadow:none!important;text-align:left!important;}
            main .col-12.col-lg-9{width:1040px!important;max-width:1040px!important;flex:0 0 1040px!important;padding-left:10px!important;padding-top:4px!important;}
            main .col-12.col-lg-3 h3{display:none!important;}
            main .col-12.col-lg-3 img{width:220px!important;max-width:220px!important;height:auto!important;display:block!important;margin:0 auto 20px!important;}
            .pk-profile-name,.pk-profile-id{display:none!important;}
            .pk-simple-total{font-size:14px;font-weight:950;color:#fff;margin:9px 0;line-height:1.35;}
            .pk-simple-total span{color:#d0d0d0!important;}.pk-simple-total b{color:#66ff99!important;}
            .pk-toolbar{display:grid!important;grid-template-columns:1fr!important;gap:5px!important;padding:8px 10px!important;margin:0 0 8px!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(22,22,22,.96),rgba(12,12,12,.94))!important;border:1px solid rgba(255,255,255,.13)!important;box-shadow:0 12px 28px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04)!important;position:sticky;top:6px;z-index:80;width:1040px!important;max-width:1040px!important;box-sizing:border-box!important;}
            .pk-toolbar-top{display:flex!important;align-items:center!important;gap:8px!important;width:100%!important;}
            .pk-toolbar-bottom{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:6px!important;flex-wrap:wrap!important;width:100%!important;}
            .pk-tool-group{display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:wrap!important;padding:4px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:10px!important;background:rgba(255,255,255,.045)!important;}
            .pk-tool-group-right{margin-left:auto!important;}.pk-tool-label{color:#aeb6c2!important;font-size:10px!important;font-weight:900!important;letter-spacing:.35px!important;text-transform:uppercase!important;padding:0 4px!important;user-select:none!important;}
            .pk-search{min-width:0!important;width:420px!important;max-width:420px!important;flex:none!important;height:32px!important;padding:8px 11px!important;border-radius:9px!important;background:#0b0b0b!important;color:#fff!important;border:1px solid rgba(255,255,255,.14)!important;outline:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;}
            .pk-search:focus{border-color:#777!important;box-shadow:0 0 0 2px rgba(255,255,255,.10)!important;}
            .pk-btn,.pk-mini-btn,.pk-clear{background:rgba(34,34,34,.92)!important;border:1px solid rgba(255,255,255,.14)!important;color:#eee!important;border-radius:8px!important;cursor:pointer!important;box-shadow:none!important;}
            .pk-btn{height:25px!important;font-size:10px!important;padding:4px 7px!important;line-height:1!important;white-space:nowrap!important;}
            .pk-btn:hover,.pk-mini-btn:hover,.pk-clear:hover{background:rgba(48,48,48,.96)!important;border-color:rgba(255,255,255,.26)!important;}
            .pk-btn-green{background:rgba(16,65,38,.92)!important;border-color:rgba(102,255,153,.55)!important;color:#66ff99!important;font-weight:900!important;}
            .pk-sort-active{border-color:#6fdfff!important;color:#dff8ff!important;box-shadow:0 0 10px rgba(111,223,255,.18)!important;}
            .pk-count{margin-left:auto!important;justify-self:end!important;font-size:11px!important;color:#cfcfcf!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;padding:5px 9px!important;white-space:nowrap!important;}
            .pk-stats{display:none!important;}
            .pk-stat{background:#101010!important;border:1px solid #333!important;border-radius:10px!important;padding:9px!important;text-align:left!important;}
            .pk-stat span{display:block;color:#9ca3af!important;font-size:11px!important;margin-bottom:4px!important;}.pk-stat b{color:#f4f4f5!important;font-size:12px!important;line-height:1.15!important;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .pk-stat-btn{cursor:pointer;color:inherit;}.pk-stat-btn:hover{border-color:#6fdfff!important;}
            .pk-grid{display:grid;grid-template-columns:repeat(7,128px)!important;gap:14px!important;width:980px!important;align-items:stretch!important;justify-content:start!important;padding-top:8px!important;}
            main .pagination, main ul.pagination, main nav[aria-label*=Page], main .page-item{display:none!important;}
            .pk-card{position:relative;background:#181818!important;border:1px solid #2f2f2f!important;border-radius:8px!important;padding:8px!important;height:326px!important;min-height:326px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;transition:.14s ease!important;box-shadow:0 8px 18px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.03)!important;}
            .pk-card:hover{transform:translateY(-1px)!important;border-color:#777!important;box-shadow:0 0 16px rgba(255,255,255,.10),0 10px 24px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.05)!important;}
            .pk-thumb-link{display:block;height:112px!important;margin-bottom:8px!important;}.pk-thumb{width:100%;height:112px!important;object-fit:contain;border-radius:5px;background:#111!important;border:1px solid #252525!important;}
            .pk-name{color:#f5f5f5!important;font-weight:900!important;font-size:11px!important;line-height:1.12!important;min-height:29px!important;max-height:31px!important;overflow:hidden!important;text-shadow:none!important;margin:0 0 5px!important;}.pk-name-count{color:#66ff99!important;font-weight:950!important;}
            .pk-line,.pk-serial{font-size:10.5px!important;line-height:1.15!important;margin:0!important;padding:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:#d2d2d2!important;}.pk-line b{color:#f2f2f2!important;}.pk-value{color:#66ff99!important;font-weight:900!important;}.pk-total{color:#27ae60!important;font-weight:900!important;}.pk-serial{font-weight:900!important;}
            .pk-demand-pill{display:inline-flex;align-items:center;gap:3px;width:max-content;max-width:100%;border-radius:5px;padding:1px 5px;margin:0 0 4px;font-size:8.5px;font-weight:950;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);white-space:nowrap;}.pk-demand-pill span{font-size:7px;}.pk-demand-high{color:#66ff99!important;border-color:rgba(102,255,153,.22)!important;background:rgba(102,255,153,.045)!important;}.pk-demand-medium{color:#ffd166!important;border-color:rgba(255,209,102,.22)!important;background:rgba(255,209,102,.045)!important;}.pk-demand-low{color:#ff8585!important;border-color:rgba(255,133,133,.22)!important;background:rgba(255,133,133,.045)!important;}
            .pk-projected-badge{position:absolute;left:8px;top:8px;z-index:7;width:22px;height:22px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 6px rgba(255,189,74,.45));pointer-events:none;}
            .pk-card-actions{display:grid;gap:4px!important;margin-top:auto!important;padding-top:6px!important;}.pk-mini-btn{width:100%;height:22px!important;min-height:22px!important;font-size:9px!important;padding:3px 5px!important;line-height:1!important;}.pk-added-mine{border-color:#66ff99!important;color:#66ff99!important;}.pk-added-theirs{border-color:#6fdfff!important;color:#6fdfff!important;}
            .pk-badge{position:absolute;top:8px!important;right:8px!important;min-width:24px!important;height:21px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:linear-gradient(180deg,#3f3f3f,#252525)!important;color:#f5f5f5!important;border:1px solid #777!important;border-radius:999px!important;padding:0 7px!important;font-size:11px!important;font-weight:950!important;z-index:4;box-shadow:0 0 12px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.18)!important;}
            body.pk-serial-outline-on .pk-special-serial:not(.pk-rare){border-color:#f6d365!important;box-shadow:0 0 18px rgba(246,211,101,.20),inset 0 1px 0 rgba(255,255,255,.06)!important;}
            .pk-rare-gem{position:absolute;top:7px!important;left:8px!important;z-index:7;line-height:0!important;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))!important;pointer-events:none;}.pk-rare-gem svg{display:block;}
            @keyframes pkRareHaloPulse{0%,100%{box-shadow:0 0 5px rgba(255,255,255,.26),0 0 12px rgba(255,255,255,.16),inset 0 1px 0 rgba(255,255,255,.08)!important;}50%{box-shadow:0 0 10px rgba(255,255,255,.66),0 0 22px rgba(255,255,255,.40),0 0 36px rgba(255,255,255,.22),inset 0 1px 0 rgba(255,255,255,.14)!important;}}
            body.pk-rare-glow-off .pk-card.pk-rare{border:1px solid #2f2f2f!important;outline:none!important;background:#181818!important;box-shadow:0 8px 18px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.03)!important;animation:none!important;}
            body.pk-rare-glow-on .pk-card.pk-rare{position:relative!important;border:2px solid transparent!important;outline:none!important;overflow:hidden!important;background:linear-gradient(#181818,#181818) padding-box,conic-gradient(from var(--pk-rare-angle,0deg),rgba(255,255,255,.08) 0deg,rgba(255,255,255,.12) 58deg,rgba(255,255,255,.92) 82deg,rgba(255,255,255,1) 96deg,rgba(255,255,255,.42) 122deg,rgba(255,255,255,.08) 170deg,rgba(255,255,255,.08) 230deg,rgba(255,255,255,.80) 270deg,rgba(255,255,255,.28) 306deg,rgba(255,255,255,.08) 360deg) border-box!important;animation:pkRareHaloPulse 1.7s ease-in-out infinite!important;}
            body.pk-rare-glow-on .pk-card.pk-rare:hover{background:linear-gradient(#1b1b1b,#1b1b1b) padding-box,conic-gradient(from var(--pk-rare-angle,0deg),rgba(255,255,255,.10) 0deg,rgba(255,255,255,.18) 54deg,rgba(255,255,255,1) 82deg,rgba(255,255,255,1) 104deg,rgba(255,255,255,.48) 132deg,rgba(255,255,255,.10) 180deg,rgba(255,255,255,.10) 230deg,rgba(255,255,255,.90) 270deg,rgba(255,255,255,.34) 310deg,rgba(255,255,255,.10) 360deg) border-box!important;animation-duration:1.25s!important;}
            body.pk-rare-glow-on .pk-card.pk-rare::before,body.pk-rare-glow-on .pk-card.pk-rare::after,body.pk-rare-glow-off .pk-card.pk-rare::before,body.pk-rare-glow-off .pk-card.pk-rare::after{display:none!important;content:none!important;}
            body:not(.pk-calc-open) .pk-calc-panel{display:none!important;}
            .pk-calc-panel{position:fixed;right:14px;bottom:14px;z-index:99991;width:430px;max-width:calc(100vw - 28px);max-height:72vh;overflow:hidden;border-radius:14px;background:linear-gradient(180deg,rgba(25,25,25,.98),rgba(10,10,10,.98));border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 55px rgba(0,0,0,.55),0 0 20px rgba(102,255,153,.08);}
            .pk-calc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:linear-gradient(90deg,rgba(35,35,35,.98),rgba(20,20,20,.98));border-bottom:1px solid rgba(255,255,255,.08);font-weight:900;font-size:14px;cursor:grab;}.pk-calc-dragging .pk-calc-head{cursor:grabbing;}.pk-clear{padding:5px 8px;font-size:11px;}
            .pk-calc-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:9px;}.pk-calc-columns h4{margin:0 0 6px;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:6px;}.pk-add-any{font-size:10px!important;padding:4px 7px!important;height:auto!important;}.pk-calc-list{display:grid;gap:6px;max-height:34vh;overflow:auto;}.pk-calc-empty{border:1px dashed #444;border-radius:8px;color:#9f9f9f;text-align:center;padding:16px 8px;font-size:12px;}.pk-calc-item{display:grid;grid-template-columns:34px 1fr auto;gap:7px;align-items:center;background:#1d1d1d;border:1px solid #343434;border-radius:8px;padding:6px;}.pk-calc-item img{width:34px;height:34px;object-fit:contain;background:#111;border-radius:5px;border:1px solid #292929;}.pk-calc-item b{display:block;font-size:10.5px;color:#eef5ff;line-height:1.15;max-height:25px;overflow:hidden;}.pk-calc-item span{display:block;color:#66ff99;font-size:10px;font-weight:900;}.pk-calc-remove{background:transparent;border:0;color:#8b98a8;cursor:pointer;font-size:16px;}.pk-calc-total{border-top:1px solid rgba(255,255,255,.08);padding:10px 12px;display:grid;gap:6px;background:#121212;}.pk-calc-total-row{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#aab7c5;}.pk-calc-total-row strong{color:#66ff99;font-size:15px;}.pk-win strong{color:#66ff99!important;}.pk-lose strong{color:#ff6b6b!important;}
            .pk-picker-modal{width:min(760px,96vw)!important;}.pk-picker-list{display:grid;gap:6px;max-height:58vh;overflow:auto;margin-top:10px;}.pk-picker-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;justify-content:stretch;gap:10px;align-items:center;text-align:left;background:#111;border:1px solid #333;border-radius:8px;color:#fff;padding:7px 10px;cursor:pointer;}.pk-picker-row:hover{border-color:#6fdfff;background:#181818;}.pk-picker-img{width:38px;height:38px;object-fit:contain;background:#0b0b0b;border:1px solid #292929;border-radius:6px;}.pk-picker-row span{font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.pk-picker-row b{color:#66ff99;white-space:nowrap;}
            .pk-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:999998;display:flex;align-items:center;justify-content:center;padding:20px;}.pk-modal{width:min(680px,95vw);max-height:80vh;overflow:auto;background:#161616;color:#fff;border:1px solid #3a3a3a;border-radius:12px;box-shadow:0 25px 80px rgba(0,0,0,.55);padding:14px;}.pk-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:10px;}.pk-modal-head span{color:#aab4bf;font-size:12px;}.pk-close{background:#242c36;color:#fff;border:1px solid #4a5666;border-radius:7px;padding:6px 10px;cursor:pointer;}.pk-uaid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;}.pk-uaid{background:#111;border:1px solid #333;border-radius:8px;padding:8px;font-size:12px;}
            @media (max-width:1200px){.pk-grid{grid-template-columns:repeat(7,118px)!important;gap:10px!important;}.pk-calc-panel{width:390px;}}
            @media (max-width:900px){main .col-12.col-lg-3,main .col-12.col-lg-9{width:100%!important;max-width:100%!important;flex:0 0 100%!important;}.pk-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;}.pk-toolbar{width:100%!important;max-width:100%!important;}.pk-toolbar-top{flex-wrap:wrap!important;}.pk-search{width:100%!important;max-width:100%!important;}.pk-count{justify-self:start!important;}.pk-tool-group-right{margin-left:0!important;}.pk-calc-panel{position:relative;right:auto;bottom:auto;width:100%;margin-top:12px;}}
            @media (max-width:640px){.pk-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.pk-tool-group{width:100%;}.pk-btn{flex:1 1 auto;}.pk-calc-columns{grid-template-columns:1fr;}}
        `;
        document.head.appendChild(style);
    }


    function waitForInventoryShell(timeoutMs = 15000) {
        return new Promise(resolve => {
            const started = Date.now();
            const check = () => {
                const body = getInventoryBody();
                const row = document.querySelector('main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row');
                if (body && row) return resolve(true);
                if (Date.now() - started >= timeoutMs) return resolve(false);
                setTimeout(check, 50);
            };
            check();
        });
    }

    async function main() {
        injectStyles();
        const ready = await waitForInventoryShell();
        if (!ready) throw new Error('Inventory shell was not found before timeout.');

        hydrateCachedValues();
        const valuesRefresh = refreshValues();
        const items = await fetchAll();
        if (!items.length) throw new Error('Inventory API returned no items; retrying.');

        const rebuildFromCurrentValues = () => {
            state.stacks = makeStacks(items);
            state.unstacked = makeUnstacked(state.stacks);
            updateProfileTotals();
        };
        rebuildFromCurrentValues();
        if (!buildShell()) throw new Error('Could not build UI shell.');
        render();
        setInterval(removeOriginalPagination, 1000);

        valuesRefresh.then(updated => {
            if (!updated || !document.querySelector('#pk-results')) return;
            rebuildFromCurrentValues();
            render();
        });
    }

    let pkBootStarted = false;
    let pkBootDone = false;
    function boot() {
        if (pkBootStarted || pkBootDone) return;
        if (!getInventoryBody() || !document.querySelector('main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row')) return;
        pkBootStarted = true;
        main().then(() => {
            pkBootDone = true;
            if (bootObserver) bootObserver.disconnect();
            if (bootTimer) clearInterval(bootTimer);
        }).catch(e => {
            pkBootStarted = false;
            console.warn('[PK 4.4] Load attempt failed, retrying:', e);
            setTimeout(boot, 750);
        });
    }

    let bootObserver = null;
    let bootTimer = null;
    function startBootWatcher() {
        boot();
        bootTimer = setInterval(boot, 500);
        if (document.documentElement && window.MutationObserver) {
            bootObserver = new MutationObserver(boot);
            bootObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
        setTimeout(() => { if (bootTimer && pkBootDone) clearInterval(bootTimer); }, 30000);
        setTimeout(() => {
            if (!pkBootDone) {
                console.warn('[Interium] Collectibles UI still not booted after 12s.', {
                    inventoryBodyFound: !!getInventoryBody(),
                    shellRowFound: !!document.querySelector('main .card.card-body.bg-dark.text-light .col-12.col-lg-9 .row')
                });
            }
        }, 12000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBootWatcher, { once: true });
    else startBootWatcher();
})();

/* ================================================================
   INTERIUM MASS TRADER ENGINE (ported from the supplied Hexium src.js)
   Consent-based automation: it only SENDS standard trade offers that the
   recipient must MANUALLY accept in Pekora's own UI. It never accepts,
   declines, or auto-confirms trades, never fakes balances/verification,
   and contacts no third-party backend. CSRF is taken ONLY from Pekora's
   own x-csrf-token challenge header - the browser cookie store is never read.
   ================================================================ */
(function () {
    'use strict';
    if (window.InteriumMassTrader) return;

    const API = 'https://www.pekora.zip/apisite';
    const api = (path, opts) => fetch(API + path, Object.assign({ credentials: 'include' }, opts || {}));

    let _csrf = null;
    /* POST helper. The CSRF token is obtained ONLY from Pekora's 403 challenge
       response header (never from the browser cookie store), so Interium's privacy
       policy - and its audit test - still hold. */
    const postJson = async (path, body) => {
        const doPost = (token) => api(path, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'x-csrf-token': token } : {}),
            body: JSON.stringify(body || {}),
        });
        let r = await doPost(_csrf);
        if (r.status === 403) {
            const t = r.headers.get('x-csrf-token');
            if (t && t !== _csrf) { _csrf = t; r = await doPost(t); }
        }
        return r;
    };

    let _myId = null;
    const ensureMyId = async () => {
        if (_myId) return _myId;
        const r = await api('/users/v1/users/authenticated');
        if (!r.ok) throw new Error('auth ' + r.status);
        const d = await r.json();
        _myId = d.id || d.userId || null;
        return _myId;
    };

    const fetchMyInventory = async () => {
        const uid = await ensureMyId();
        if (!uid) throw new Error('Not logged in');
        const items = []; let cursor = '';
        for (let p = 0; p < 40; p++) {
            const r = await api('/inventory/v1/users/' + uid + '/assets/collectibles?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
            if (!r.ok) throw new Error('inventory ' + r.status);
            const d = await r.json();
            (d.data || []).forEach((e) => items.push(e));
            if (!d.nextPageCursor) break; cursor = d.nextPageCursor;
        }
        return items;
    };

    const fetchAssetOwners = async (assetId) => {
        const myId = await ensureMyId();
        const owners = []; let cursor = '';
        for (let p = 0; p < 50; p++) {
            const r = await api('/inventory/v2/assets/' + assetId + '/owners?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
            if (!r.ok) break;
            const d = await r.json();
            for (const e of (d.data || [])) {
                const ownerId = (e.owner && e.owner.id) || e.userId;
                const ownerName = (e.owner && (e.owner.displayName || e.owner.name)) || ('User #' + ownerId);
                const userAssetId = e.userAssetId || e.id;
                if (ownerId && userAssetId && String(ownerId) !== String(myId)) {
                    owners.push({ userId: ownerId, username: ownerName, userAssetId });
                }
            }
            if (!d.nextPageCursor) break; cursor = d.nextPageCursor;
        }
        return owners;
    };

    const thumbs = {};
    const getAssetThumbs = async (assetIds) => {
        const needed = [...new Set(assetIds)].filter((id) => id && !thumbs[id]);
        for (let i = 0; i < needed.length; i += 30) {
            const chunk = needed.slice(i, i + 30);
            try {
                const r = await api('/thumbnails/v1/assets?assetIds=' + chunk.join(',') + '&format=png&size=110x110');
                const d = await r.json();
                for (const e of (d.data || [])) if (e.state === 'Completed' && e.imageUrl) thumbs[e.targetId] = e.imageUrl;
            } catch (_) {}
        }
        return thumbs;
    };

    const getAssetName = async (assetId) => {
        try {
            const r = await api('/catalog/v1/catalog/items/' + assetId + '/details?itemType=Asset');
            const d = await r.json();
            return d.name || '';
        } catch (_) { return ''; }
    };

    const resolveUser = async (raw) => {
        if (/^\d+$/.test(raw)) return { userId: parseInt(raw, 10), username: String(raw) };
        const r = await postJson('/users/v1/usernames/users', { usernames: [raw], excludeBannedUsers: false });
        const d = await r.json();
        if (!d.data || !d.data.length) throw new Error('User not found');
        const u = d.data[0];
        return { userId: u.id, username: u.displayName || u.name || raw };
    };

    const findUserAsset = async (userId, assetId) => {
        let cursor = '';
        for (let p = 0; p < 40; p++) {
            const r = await api('/inventory/v1/users/' + userId + '/assets/collectibles?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
            if (!r.ok) break;
            const d = await r.json();
            for (const item of (d.data || [])) if (item.assetId === assetId) return item.userAssetId || item.id;
            if (!d.nextPageCursor) break; cursor = d.nextPageCursor;
        }
        return null;
    };

    /* Sends ONE standard trade offer. The recipient must manually accept it in
       Pekora's own trades UI - this helper never accepts/declines/auto-confirms. */
    const sendTrade = (myId, myUserAssetIds, partnerId, partnerUserAssetIds) => postJson('/trades/v1/trades/send', {
        offers: [
            { userId: parseInt(myId, 10), userAssetIds: myUserAssetIds },
            { userId: parseInt(partnerId, 10), userAssetIds: partnerUserAssetIds },
        ],
    });

    window.InteriumMassTrader = Object.freeze({
        version: '1.0.0',
        ensureMyId, fetchMyInventory, fetchAssetOwners, getAssetThumbs,
        getAssetName, resolveUser, findUserAsset, sendTrade, thumbs,
    });
    try { if (window.InteriumCore && window.InteriumCore.registerModule) window.InteriumCore.registerModule('masstrader', '1.0.0'); } catch (_) {}
    console.info('[Interium] Mass Trader engine attached v1.0.0 (consent-based trade offers; manual accept required).');
})();
