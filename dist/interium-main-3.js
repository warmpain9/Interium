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
/* Annotates the new React trades page (/trades) with per-item RAP + Koromons Value, side  */
/* RAP totals and a win/loss verdict. Data comes from the same authenticated trade APIs    */
/* the page itself uses; this module only reads and annotates, never clicks or sends.      */
const _pgMt = { listType:'', listAt:0, listRows:[], details:new Map(), inflight:'', lastSig:'' };
const PG_KOROMONS_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1094 1466.2" width="13" height="17" style="flex:none;display:inline-block;vertical-align:-2px;"><path fill="#0084dd" d="M1094 521.6 0 0v469.5l141-67.4 250 119.2L0 707.8v369.7l815.6 388.7L315 893l779-371.4z"/></svg>';
const pgMtClear = () => {
	document.querySelectorAll('.pg-mt-rap,.pg-mt-total,.pg-mt-verdict,.pg-mt-tag').forEach(n=>n.remove());
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
const pgMtAnnotateSection = (sec, offer) => {
	const items=pgMtItems(offer);
	const byName=new Map();
	items.forEach(it=>{ const k=pgMtNameOf(it).toLowerCase(); if(!byName.has(k)) byName.set(k,[]); byName.get(k).push(it); });
	const cards=Array.from(sec.querySelectorAll('[class*="itemCard-"]'));
	let rapTotal=0, valTotal=0, valKnown=0;
	cards.forEach((card,i)=>{
		const nameEl=card.querySelector('[class*="itemName-"]');
		const k=String((nameEl&&nameEl.textContent)||'').trim().toLowerCase();
		const q=byName.get(k);
		const it=(q&&q.length?q.shift():items[i])||null;
		const rap=it?pgMtRapOf(it):0;
		const aid=it?pgMtAssetIdOf(it):null;
		const val=aid!=null?Number(koromonsValueCache.get(String(aid))||0):0;
		rapTotal+=rap; if(val>0){ valTotal+=val; valKnown++; }
		let line=card.querySelector('.pg-mt-rap');
		if(val>0){
			if(!line){ line=document.createElement('div'); line.className='pg-mt-rap'; card.appendChild(line); }
			line.style.cssText='margin-top:3px;font-size:14px;line-height:1.3;font-weight:700;display:inline-flex;align-items:center;gap:5px;color:#0084dd !important;';
			line.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+val.toLocaleString()+'</span>';
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
		const l=document.createElement('span'); l.textContent='Total Value:';
		const v=document.createElement('span'); v.style.cssText='display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;';
		v.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+(valKnown>0?valTotal.toLocaleString():'\u2014')+'</span>';
		t.appendChild(l); t.appendChild(v);
	}
	return { rapTotal, valTotal, valKnown, count:cards.length, robux };
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
				const mkStat=(d,p,label)=>{
					const up=d>0, even=d===0;
					const c=even?'#d0d0d0':(up?'rgb(32,215,66)':'rgb(255,90,90)');
					const path=up?'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z':'M9 4h6v8h5.84L12 19.84L4.16 12H9V4Z';
					const ar=even?'<span style="color:'+c+';font-size:17px;font-weight:900;line-height:1;">=</span>':'<svg xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;" width="20" height="20" viewBox="0 0 24 24"><path fill="'+c+'" d="'+path+'"></path></svg>';
					return '<span style="display:inline-flex;align-items:center;gap:6px;">'+ar+'<span style="color:#fff;font-size:15px;font-weight:900;">'+(d>0?'+':'')+d.toLocaleString()+' '+label+'</span><span style="color:'+c+';font-size:14px;font-weight:800;">('+(p>0?'+':'')+p+'%)</span></span>';
				};
				if(!verdict){ verdict=document.createElement('div'); verdict.className='pg-mt-verdict'; }
				if(secRecv){ if(verdict.parentNode!==main||verdict.nextElementSibling!==secRecv) main.insertBefore(verdict,secRecv); }
				else { const actions=main.querySelector('[class*="actions-"]'); if(actions) main.insertBefore(verdict,actions); else main.appendChild(verdict); }
				verdict.style.cssText='margin:14px 0;max-width:565px;padding:10px 14px;border-radius:10px;background:#121212;border:1px solid #343434;display:flex;align-items:center;justify-content:space-around;gap:24px;flex-wrap:wrap;';
				let htmlStats=mkStat(delta,pct,'RAP');
				if(give.valKnown===give.count&&recv.valKnown===recv.count&&give.count>0&&recv.count>0){
					const gv=give.valTotal+give.robux, rv=recv.valTotal+Math.floor(recv.robux*0.7);
					const dv=rv-gv, pv=gv>0?Math.round(dv/gv*100):0;
					htmlStats+=mkStat(dv,pv,'Value');
				}
				verdict.innerHTML=htmlStats;
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
				line.innerHTML=PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+valTxt+'</span>';
			}
		} else if(line){ line.remove(); }
	}
	return { aid, val };
};
const applyTradeWindowStats = () => {
	const onPage = /^\/users\/\d+\/trade\/?$/i.test(location.pathname);
	if(!onPage){
		if(document.querySelector('.pg-tw-koroval,.pg-tw-tag,.pg-tw-total-value')){
			document.querySelectorAll('.pg-tw-koroval,.pg-tw-tag,.pg-tw-total-value').forEach(n=>n.remove());
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
		let rapSum=0, valSum=0, valKnown=0, total=0;
		slots.forEach(slot=>{
			const nameEl=slot.querySelector('[class*="slotName-"]'); if(!nameEl) return;
			const name=nameEl.textContent.trim();
			const valEl=slot.querySelector('[class*="slotValue-"]');
			const rap=valEl?Number((valEl.textContent||'').replace(/[^0-9]/g,''))||0:0;
			const it=pgTwMatch(idx,name,rap);
			const thumbWrap=slot.querySelector('[class*="slotImageWrap-"]');
			const res=pgTwDecorate(thumbWrap,valEl||nameEl,it,'child',nameEl);
			total++; rapSum+=rap;
			if(res.val>0){ valSum+=res.val; valKnown++; }
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
			const valTxt=valKnown>0?valSum.toLocaleString():(total>0?'\u2014':'0');
			if(vt.getAttribute('data-pg-val')!==valTxt){
				vt.setAttribute('data-pg-val', valTxt);
				vt.innerHTML='<span>Total Value:</span><span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">'+valTxt+'</span></span>';
			}
		}
	});
};
	/* ---------------------------------------------- Koromons Value badges */
	/* Public read-only item values. No RAP fallback: large limiteds are judged */
	/* by Value, and missing Koromons entries simply receive no badge.          */
	const KOROMONS_VALUES_URL = 'https://www.koromons.net/items.json';
	const KOROMONS_VALUES_CACHE_KEY = 'pcs_koromons_values_v1';
	const KOROMONS_VALUES_TTL = 1000 * 60 * 60 * 6;
	const koromonsValueCache = new Map();
	const koromonsTagsCache = new Map();
	const PG_TAG_RARE_SRC = 'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIGFyaWEtaGlkZGVuPSd0cnVlJyBzdHlsZT0nLW1zLXRyYW5zZm9ybTpyb3RhdGUoMzYwZGVnKTstd2Via2l0LXRyYW5zZm9ybTpyb3RhdGUoMzYwZGVnKScgdmlld0JveD0nMCAwIDEyOCAxMjgnIHRyYW5zZm9ybT0ncm90YXRlKDM2MCknPjxwYXRoIGQ9J002My44NSAxMjMuODRsNjAuMS04Ny44LjA1LS4wMnYtLjAzTDk2LjA0IDRIMzIuMDFMNCAzNS45M3YuMDNsLjAzLjA3IDU5LjQyIDg3LjQ1LjMyLjQ0LjA3LS4wOS0uMjItLjgzLjIzLjg0eicgZmlsbD0nIzgxRDRGQScvPjxsaW5lYXJHcmFkaWVudCBpZD0nYScgeDE9JzQuMTExJyB4Mj0nMTIzLjg5JyB5MT0nNjQnIHkyPSc2NCcgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyM4MUQ0RkEnIG9mZnNldD0nLjAwMScvPjxzdG9wIHN0b3AtY29sb3I9JyMyOUI2RjYnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNhKScgZD0nTTYzLjc5IDEyMy45M0w0LjExIDM2LjAzbDI3LjktMzEuOTZoNjQuMDNsMjcuODUgMzEuOTZ6Jy8+PHBhdGggZmlsbD0nbm9uZScgZD0nTTY0IDRsLS4wNS4wN2guMXonLz48bGluZWFyR3JhZGllbnQgaWQ9J2InIHgxPSc2My41OTknIHgyPSc2My41OTknIHkxPScxMjMuODknIHkyPSczNi4wMDMnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjODFENEZBJyBvZmZzZXQ9JzAnLz48c3RvcCBzdG9wLWNvbG9yPScjN0REM0ZBJyBvZmZzZXQ9Jy4yMjEnLz48c3RvcCBzdG9wLWNvbG9yPScjNzJDRkY5JyBvZmZzZXQ9Jy40MzEnLz48c3RvcCBzdG9wLWNvbG9yPScjNUVDOEY4JyBvZmZzZXQ9Jy42MzgnLz48c3RvcCBzdG9wLWNvbG9yPScjNDRCRkY3JyBvZmZzZXQ9Jy44NDEnLz48c3RvcCBzdG9wLWNvbG9yPScjMjlCNkY2JyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjYiknIGQ9J002My43OCAxMjMuODlMODcuNTUgMzZsLTQ3LjkuMDV6Jy8+PHBhdGggZmlsbD0nIzgxRDRGQScgZD0nTTg3LjU1IDM2aC4zOWwtLjI4LS4zOHonLz48bGluZWFyR3JhZGllbnQgaWQ9J2MnIHgxPSc5My44OTcnIHgyPSc5My44OTcnIHkxPScxMjMuOTEnIHkyPSczNicgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyMwMzlCRTUnIG9mZnNldD0nMCcvPjxzdG9wIHN0b3AtY29sb3I9JyMwMzk4RTInIG9mZnNldD0nLjM2OScvPjxzdG9wIHN0b3AtY29sb3I9JyMwMzkwRDknIG9mZnNldD0nLjYzOCcvPjxzdG9wIHN0b3AtY29sb3I9JyMwMjgyQzknIG9mZnNldD0nLjg3NCcvPjxzdG9wIHN0b3AtY29sb3I9JyMwMjc3QkQnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNjKScgZD0nTTEyNCAzNi4wMkw4Ny41OCAzNmwtMjMuNzkgODcuOTFMMTI0IDM2LjAzeicvPjxsaW5lYXJHcmFkaWVudCBpZD0nZCcgeDE9JzMzLjk0NCcgeDI9JzMzLjk0NCcgeTE9JzEyMy45MScgeTI9JzM1Ljk2OCcgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyMyOUI2RjYnIG9mZnNldD0nMCcvPjxzdG9wIHN0b3AtY29sb3I9JyMyNUIzRjQnIG9mZnNldD0nLjMzMScvPjxzdG9wIHN0b3AtY29sb3I9JyMxQUFCRUYnIG9mZnNldD0nLjY0NicvPjxzdG9wIHN0b3AtY29sb3I9JyMwNzlFRTcnIG9mZnNldD0nLjk1NCcvPjxzdG9wIHN0b3AtY29sb3I9JyMwMzlCRTUnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNkKScgZD0nTTM5Ljg2IDM2LjU5TDM5IDM3Ljc1bC44Ni0xLjE2LS4xNy0uNjEtMzUuNTItLjAxLS4wNi4wNiA1OS42NyA4Ny44OHonLz48bGluZWFyR3JhZGllbnQgaWQ9J2UnIHgxPScyOS41MScgeDI9JzIxLjc4MycgeTE9JzUuNDU3JyB5Mj0nMzYuMzY2JyBncmFkaWVudFVuaXRzPSd1c2VyU3BhY2VPblVzZSc+PHN0b3Agc3RvcC1jb2xvcj0nI0IzRTVGQycgb2Zmc2V0PScuMDA1Jy8+PHN0b3Agc3RvcC1jb2xvcj0nIzRGQzNGNycgb2Zmc2V0PScxJy8+PC9saW5lYXJHcmFkaWVudD48cGF0aCBmaWxsPSd1cmwoI2UpJyBkPSdNNDAgMzZMMzIgNC4xIDMuNzQgMzYuMDV6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdmJyB4MT0nMTA1Ljg3JyB4Mj0nMTA1Ljg3JyB5MT0nNy4wNicgeTI9JzM3LjAyNycgZ3JhZGllbnRVbml0cz0ndXNlclNwYWNlT25Vc2UnPjxzdG9wIHN0b3AtY29sb3I9JyM4MUQ0RkEnIG9mZnNldD0nLjAwOScvPjxzdG9wIHN0b3AtY29sb3I9JyMyOUI2RjYnIG9mZnNldD0nMScvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0ndXJsKCNmKScgZD0nTTg3Ljc0IDM2bDgtMzEuOUwxMjQgMzYuMDV6Jy8+PGxpbmVhckdyYWRpZW50IGlkPSdnJyB4MT0nNjMuNjQ0JyB4Mj0nNjMuNjQ0JyB5MT0nNi43MzgnIHkyPSczNS43MTUnIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBzdG9wLWNvbG9yPScjRTFGNUZFJyBvZmZzZXQ9JzAnLz48c3RvcCBzdG9wLWNvbG9yPScjRDNGMEZEJyBvZmZzZXQ9Jy4yNzUnLz48c3RvcCBzdG9wLWNvbG9yPScjQjNFNUZDJyBvZmZzZXQ9JzEnLz48L2xpbmVhckdyYWRpZW50PjxwYXRoIGZpbGw9J3VybCgjZyknIGQ9J00zOS43NCAzNmwyNC0zMS45Nkw4Ny41NSAzNnonLz48bGluZWFyR3JhZGllbnQgaWQ9J2gnIHgxPSc0Ny44NjgnIHgyPSc0Ny44NjgnIHkxPSc0LjQ4NCcgeTI9JzM3LjM0JyBncmFkaWVudFVuaXRzPSd1c2VyU3BhY2VPblVzZSc+PHN0b3Agc3RvcC1jb2xvcj0nIzgxRDRGQScgb2Zmc2V0PScuMDA5Jy8+PHN0b3Agc3RvcC1jb2xvcj0nIzI5QjZGNicgb2Zmc2V0PScxJy8+PC9saW5lYXJHcmFkaWVudD48cGF0aCBmaWxsPSd1cmwoI2gpJyBkPSdNNjQgNC4wNEw0MCAzNi4wNSAzMS43NCA0eicvPjxsaW5lYXJHcmFkaWVudCBpZD0naScgeDE9JzYzLjczNicgeDI9Jzk2JyB5MT0nMjAuMDIzJyB5Mj0nMjAuMDIzJyBncmFkaWVudFVuaXRzPSd1c2VyU3BhY2VPblVzZSc+PHN0b3Agc3RvcC1jb2xvcj0nIzRGQzNGNycgb2Zmc2V0PScuMDExJy8+PHN0b3Agc3RvcC1jb2xvcj0nIzI5QjZGNicgb2Zmc2V0PScxJy8+PC9saW5lYXJHcmFkaWVudD48cGF0aCBmaWxsPSd1cmwoI2kpJyBkPSdNNjMuNzQgNC4wNGwyNCAzMi4wMUw5NiA0eicvPjxwYXRoIGQ9J005NC42NyA3bDI1LjUzIDI5LjItNTYuNDIgODIuNDFMNy43NiAzNi4xOSAzMy4zNyA3aDYxLjNtMS4zNy0zSDMyLjAxTDQgMzUuOTN2LjAzbC4wMy4wNyA1OS43NCA4Ny45IDYwLjE4LTg3LjkuMDUtLjAydi0uMDNMOTYuMDQgNHonIGZpbGw9JyM0MjQyNDInIG9wYWNpdHk9Jy4yJy8+PC9zdmc+';
	const PG_TAG_RARE = '<span class="pg-tag-ico" title="Rare" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;cursor:help;pointer-events:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));"><img src="'+PG_TAG_RARE_SRC+'" width="19" height="19" style="display:block;" alt=""/></span>';
	const PG_TAG_PROJECTED_SRC = 'data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIGFyaWEtaGlkZGVuPSd0cnVlJyB2aWV3Qm94PScwIDAgNjQgNjQnPjxwYXRoIGQ9J002My4zNyA1My41MkM1My45ODIgMzYuMzcgNDQuNTkgMTkuMjIgMzUuMiAyLjA3YTMuNjg3IDMuNjg3IDAgMDAtNi41MjIgMEMxOS4yODkgMTkuMjIgOS44OTIgMzYuMzcuNTA4IDUzLjUyYy0xLjQ1MyAyLjY0OS4zOTkgNi4wODMgMy4yNTggNi4wODNoNTYuMzVjMS41ODQgMCAyLjY0OC0uODUzIDMuMjAzLTIuMDEuNjk4LTEuMTAyLjg4NS0yLjU2NS4wNTUtNC4wNzUnIGZpbGw9JyNmZmRkMTUnLz48cGF0aCBkPSdNMjguOTE3IDM0LjQ3N2wtLjg4OS0xMy4yNjJjLS4xNjYtMi41ODMtLjI0Ni00LjQzOS0uMjQ2LTUuNTY1IDAtMS41MzQuNC0yLjcyNyAxLjIwMi0zLjU4OC44MDUtLjg1NiAxLjg2My0xLjI4NiAzLjE3NS0xLjI4NiAxLjU4MyAwIDIuNjQ2LjU1MSAzLjE3OCAxLjY0Ni41MzcgMS4xMDIuODA5IDIuNjg0LjgwOSA0Ljc1MSAwIDEuMjE1LS4wNjYgMi40NTMtLjE5OCAzLjcwOGwtMS4xOSAxMy42NDljLS4xMjkgMS42MjYtLjQwNCAyLjg3Mi0uODI3IDMuNzM5LS40MjYuODcxLTEuMTI4IDEuMzAxLTIuMTA5IDEuMzAxLS45OTIgMC0xLjY5LS40MTktMi4wNzItMS4yNTctLjM5My0uODQxLS42NjgtMi4xMi0uODMzLTMuODM2bTMuMDcyIDE4LjIxN2MtMS4xMjUgMC0yLjEwNi0uMzYyLTIuOTQ3LTEuMDkzLS44NDEtLjcyOC0xLjI2LTEuNzQ4LTEuMjYtMy4wNTggMC0xLjE0My40LTIuMTIgMS4yMDItMi45MjEuODA1LS44MDYgMS43ODYtMS4yMDYgMi45NTEtMS4yMDZzMi4xNTMuNCAyLjk3NyAxLjIwNmMuODE1LjgwMSAxLjIzNCAxLjc3OCAxLjIzNCAyLjkyMSAwIDEuMjktLjQxOSAyLjMwOC0xLjI0NiAzLjA0NGE0LjI0NSA0LjI0NSAwIDAxLTIuOTExIDEuMTA3JyBmaWxsPScjMWYyZTM1Jy8+PC9zdmc+';
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
	const requestKoromonsValues = () => new Promise((resolve,reject) => {
		try {
			GM_xmlhttpRequest({
				method:'GET', url:KOROMONS_VALUES_URL,
				headers:{accept:'application/json','Cache-Control':'no-cache'},
				responseType:'json', timeout:10000,
				onload:r=>{ try { const d=typeof r.response==='string'?JSON.parse(r.response):(r.response||JSON.parse(r.responseText||'[]')); if(!Array.isArray(d)) throw new Error('Invalid Koromons response'); resolve(d); } catch(e){ reject(e); } },
				onerror:()=>reject(new Error('Koromons request failed')),
				ontimeout:()=>reject(new Error('Koromons request timed out')),
			});
		} catch(e){ reject(e); }
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
	/* ------------------------------ Koromons leaderboard cache + profile block (v1.0.11) */
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
	const requestKoromonsLb = () => new Promise((resolve,reject) => {
		try {
			GM_xmlhttpRequest({
				method:'GET', url:KOROMONS_LB_URL,
				headers:{accept:'application/json','Cache-Control':'no-cache'},
				responseType:'json', timeout:15000,
				onload:r=>{ try { const d=typeof r.response==='string'?JSON.parse(r.response):(r.response||JSON.parse(r.responseText||'null')); const rows=d&&Array.isArray(d.players)?d.players:(Array.isArray(d)?d:null); if(!rows) throw new Error('Invalid Koromons leaderboard response'); resolve(rows); } catch(e){ reject(e); } },
				onerror:()=>reject(new Error('Koromons leaderboard request failed')),
				ontimeout:()=>reject(new Error('Koromons leaderboard request timed out')),
			});
		} catch(e){ reject(e); }
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
		const head='<span style="display:inline-flex;align-items:center;gap:6px;font-weight:800;letter-spacing:.02em;color:#0084dd !important;">'+PG_KOROMONS_SVG+'<span style="color:#0084dd !important;">Koromons</span></span>';
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
						+koroStatHtml('RAP:', '<span style="color:#02b757 !important;">'+hit.rap.toLocaleString()+'</span>')
						+koroStatHtml('Rank:', '#'+hit.rank+' <span style="color:#9aa0a6;font-weight:600;font-size:12px;">/ '+hit.total.toLocaleString()+'</span>');
				} else if (est && est.count>0){
					box.innerHTML=head
						+koroStatHtml('Value:', '\u2248 '+koroValueHtml(est.value))
						+koroStatHtml('RAP:', '<span style="color:#02b757 !important;">'+est.rap.toLocaleString()+'</span>')
						+'<span style="color:#9aa0a6;font-size:11px;">not on leaderboard \u00b7 estimated from public inventory</span>';
				} else {
					box.innerHTML=head+'<span style="color:#9aa0a6;font-size:12px;">no data \u2014 inventory is private and player is not on the Koromons leaderboard</span>';
				}
			} catch(e){ if(box.isConnected) box.innerHTML=head+'<span style="color:#ffb454;font-size:12px;">Koromons data unavailable</span>'; }
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

const applyPageModules = () => { applyKoromonsProfileBlock(); applyModernTradeStats(); applyTradeWindowStats(); };
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
        const _pcsCfg = JSON.parse(GM_getValue('pcs_cfg_v1', 'null') || 'null');
        if (_pcsCfg && _pcsCfg.collectiblesSuite === false) {
            // This build keeps every feature always on. Older Interium builds could
            // leave a stale "disabled" flag behind in this script's storage, which
            // silently killed the collectibles page. Ignore it (and log it).
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
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { Accept: 'application/json' },
                responseType: 'json',
                onload: (r) => {
                    try {
                        resolve(typeof r.response === 'string' ? JSON.parse(r.response) : (r.response || JSON.parse(r.responseText || '{}')));
                    } catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
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
        // Koromons exposes demand directly as obj.Demand, e.g. "High", "Decent",
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
        if (!cached || !Array.isArray(cached.items)) return false;
        const age = Date.now() - Number(cached.t || 0);
        if (age < 0 || age > VALUES_CACHE_MAX_AGE_MS) return false;
        indexValueItems(cached.items);
        return true;
    }

    async function refreshValues() {
        try {
            const data = await gmGetJson(VALUES_JSON_URL);
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : null));
            if (!Array.isArray(rows)) throw new Error('Koromons response is not an item array.');
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
        if (!cached || !Array.isArray(cached.items)) return false;
        const age = Date.now() - Number(cached.t || 0);
        if (age < 0 || age > KOROMONS_DEMAND_CACHE_MAX_AGE_MS) return false;
        indexKoromonsDemand(cached.items);
        return true;
    }

    async function refreshKoromonsDemand() {
        try {
            const data = await gmGetJson(KOROMONS_ITEMS_URL);
            const rows = Array.isArray(data) ? data : (Array.isArray(data && data.items) ? data.items : (Array.isArray(data && data.data) ? data.data : null));
            if (!Array.isArray(rows)) throw new Error('Koromons response is not an array.');
            indexKoromonsDemand(rows);
            try { localStorage.setItem(KOROMONS_DEMAND_CACHE_KEY, JSON.stringify({ t: Date.now(), items: rows })); } catch (_) {}
            return true;
        } catch (e) {
            console.warn('[PK 5.0] Koromons demand refresh failed', e);
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
            if (!card.querySelector('.pk-rare-gem')) card.insertAdjacentHTML('afterbegin', '<div class="pk-rare-gem" title="Rare">💎</div>');
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
        return isProjectedStack(stack) ? '<div class="pk-projected-badge" title="Possible projected item">��️</div>' : '';
    }

    function cardHTML(stack, index) {
        const mine = state.mine.has(String(stack.uid));
        const d = demandInfo(stack.demand);
        const demandHTML = d.label ? `<div class="pk-demand-pill ${d.cls}"><span>${d.icon}</span>${d.label}</div>` : '';
        const serialStyle = serialColor(stack.bestSerial);
        return `
            <div class="pk-card ${stack.isRare ? 'pk-rare' : ''} ${specialSerialRank(stack.bestSerial) < 1000 ? 'pk-special-serial' : ''}" data-index="${index}" data-uid="${esc(stack.uid)}" data-asset-id="${esc(stack.assetId)}" data-rare="${stack.isRare ? '1' : '0'}">
                ${stack.isRare ? '<div class="pk-rare-gem" title="Rare">💎</div>' : ''}
                ${state.stacked && stack.count > 1 ? `<div class="pk-badge">x${stack.count}</div>` : ''}
                ${projectedBadgeHTML(stack)}
                <a class="pk-thumb-link" href="/catalog/${esc(stack.assetId)}/--">
                    <img class="pk-thumb" src="/thumbs/asset.ashx?assetId=${esc(stack.assetId)}" loading="lazy">
                </a>
                <div class="pk-name" title="${esc(stack.name)}">${esc(stack.name)}${state.stacked && stack.count > 1 ? ` <span class="pk-name-count">×${stack.count}</span>` : ''}</div>
                ${demandHTML}
                <div class="pk-line"><b>RAP:</b> ${fmt(stack.rapEach)}</div>
                <div class="pk-line"><b>Value:</b> <span class="pk-value">${fmt(stack.valueEach)}</span></div>
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

    function updateCalc() {
        const mine = totalsFor(state.mine, state.mineItems);
        const theirs = theirTotals();
        const diff = theirs.value - mine.value;
        const panel = document.querySelector('#pk-calc-panel');
        if (!panel) return;
        document.body.classList.toggle('pk-calc-open', state.calcOpen);
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
        if (!row) return;
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
                        <button class="pk-btn" data-sort="rares">Rares💎</button>
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

        const calc = document.createElement('aside');
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

        toolbar.querySelector('#pk-search').addEventListener('input', e => { state.query = e.target.value || ''; render(); });
        toolbar.querySelectorAll('[data-sort]').forEach(btn => btn.addEventListener('click', () => { state.sortMode = btn.dataset.sort; render(); }));
        toolbar.querySelector('#pk-toggle-stack').addEventListener('click', () => { state.stacked = !state.stacked; render(); });
        toolbar.querySelector('#pk-toggle-value-only').addEventListener('click', () => { state.valueOnly = !state.valueOnly; saveSettings(); render(); });
        toolbar.querySelector('#pk-toggle-serial-outline').addEventListener('click', () => { state.serialOutline = !state.serialOutline; saveSettings(); render(); });
        toolbar.querySelector('#pk-toggle-calc').addEventListener('click', () => { state.calcOpen = !state.calcOpen; render(); });
        toolbar.querySelector('#pk-toggle-glow').addEventListener('click', () => { state.rareGlow = !state.rareGlow; saveSettings(); applyRareGlowToggle(); });
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
                    <div><b>${title}</b><br><span>Search Koromons items, sorted from highest value to lowest.</span></div>
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
            .pk-projected-badge{position:absolute;left:8px;top:8px;z-index:7;width:22px;height:22px;border-radius:999px;background:rgba(255,189,74,.96);color:#111;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:950;border:1px solid rgba(255,255,255,.55);box-shadow:0 0 12px rgba(255,189,74,.38);}
            .pk-card-actions{display:grid;gap:4px!important;margin-top:auto!important;padding-top:6px!important;}.pk-mini-btn{width:100%;height:22px!important;min-height:22px!important;font-size:9px!important;padding:3px 5px!important;line-height:1!important;}.pk-added-mine{border-color:#66ff99!important;color:#66ff99!important;}.pk-added-theirs{border-color:#6fdfff!important;color:#6fdfff!important;}
            .pk-badge{position:absolute;top:8px!important;right:8px!important;min-width:24px!important;height:21px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:linear-gradient(180deg,#3f3f3f,#252525)!important;color:#f5f5f5!important;border:1px solid #777!important;border-radius:999px!important;padding:0 7px!important;font-size:11px!important;font-weight:950!important;z-index:4;box-shadow:0 0 12px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.18)!important;}
            body.pk-serial-outline-on .pk-special-serial:not(.pk-rare){border-color:#f6d365!important;box-shadow:0 0 18px rgba(246,211,101,.20),inset 0 1px 0 rgba(255,255,255,.06)!important;}
            .pk-rare-gem{position:absolute;top:7px!important;left:8px!important;z-index:7;font-size:18px!important;line-height:20px!important;filter:none!important;pointer-events:none;}
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

// ─────────────────────────────────────────────────────────────────────
// Interium UI module (module 3) — themes, panel, watermark, page styling
// Ported from the Interium 1.0.5 GUI with these changes:
//   • ALL trading features removed (trading is handled by the Trading
//     Interium modules above — nothing here reads or touches trades)
//   • Auto-refresher / auto-clicker removed
//   • "LARP" fake-balance / fake-verify / fake-item tools removed
//   • Every call to the private hexium.zxwxtt.workers.dev server removed
//     (no auth gate, announcements, badges or remote profile saves)
// The only network requests made here go to pekora.zip itself (your own
// profile info + avatar headshot for the panel header). Settings are
// stored locally in Tampermonkey storage under "interium_ui_cfg_v1".
// ─────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    if (typeof GM_getValue !== 'function') {
        console.warn('[Interium] Not running in a Tampermonkey context — aborting.');
        return;
    }

    const PANEL_HIDDEN_KEY  = 'pks_panel_hidden';
    const THEMES = {
        purple: {
            name: 'Void',
            accent:'#c084fc',accentDim:'#9333ea',accentRgb:'192,132,252',
            topBorder:'linear-gradient(90deg,#c084fc,#818cf8,#38bdf8)',
            panelBg:'#0e0d13',headerBg:'#13111a',tabBarBg:'#0e0d13',tabBorder:'#1e1a2e',
            activeBg:'#1c1828',activeText:'#c084fc',border:'#2a2438',inputBg:'#171520',
            inputBorder:'#2d2840',sectionText:'#4a4060',labelText:'#9988bb',
            mutedText:'rgba(192,132,252,0.55)',valueText:'#e8e0f8',
            cardBorder:'#c084fc22',cardGlow:'0 0 0 1px #c084fc18, 0 4px 24px rgba(192,132,252,0.10)',
            cardHoverBorder:'#c084fc55',cardHoverGlow:'0 0 0 1px #c084fc44, 0 8px 32px rgba(192,132,252,0.18)',
            glowColor:'rgba(192,132,252,0.18)',
        },
        crimson: {
            name: 'Crimson',
            accent:'#ff4466',accentDim:'#cc2244',accentRgb:'255,68,102',
            topBorder:'linear-gradient(90deg,#ff4466,#ff8800,#ff4466)',
            panelBg:'#0d0b0b',headerBg:'#130f0f',tabBarBg:'#0d0b0b',tabBorder:'#2a1a1a',
            activeBg:'#221414',activeText:'#ff4466',border:'#3a2020',inputBg:'#1a1010',
            inputBorder:'#3a2020',sectionText:'#5a3030',labelText:'#bb8888',
            mutedText:'rgba(255,68,102,0.55)',valueText:'#f0dede',
            cardBorder:'#ff446622',cardGlow:'0 0 0 1px #ff446618, 0 4px 24px rgba(255,68,102,0.10)',
            cardHoverBorder:'#ff446655',cardHoverGlow:'0 0 0 1px #ff446644, 0 8px 32px rgba(255,68,102,0.18)',
            glowColor:'rgba(255,68,102,0.18)',
        },
        blue: {
            name: 'Arctic',
            accent:'#38bdf8',accentDim:'#0284c7',accentRgb:'56,189,248',
            topBorder:'linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#38bdf8)',
            panelBg:'#0a0c10',headerBg:'#0e1018',tabBarBg:'#0a0c10',tabBorder:'#161a28',
            activeBg:'#131828',activeText:'#38bdf8',border:'#1e2436',inputBg:'#10131e',
            inputBorder:'#1e2436',sectionText:'#303858',labelText:'#7888aa',
            mutedText:'rgba(56,189,248,0.55)',valueText:'#d0e8f8',
            cardBorder:'#38bdf822',cardGlow:'0 0 0 1px #38bdf818, 0 4px 24px rgba(56,189,248,0.10)',
            cardHoverBorder:'#38bdf855',cardHoverGlow:'0 0 0 1px #38bdf844, 0 8px 32px rgba(56,189,248,0.18)',
            glowColor:'rgba(56,189,248,0.18)',
        },
        midnight: {
            name: 'Gold',
            accent:'#f0a500',accentDim:'#c07800',accentRgb:'240,165,0',
            topBorder:'linear-gradient(90deg,#f0a500,#fbbf24,#f0a500)',
            panelBg:'#090909',headerBg:'#0e0e0e',tabBarBg:'#090909',tabBorder:'#1a1a1a',
            activeBg:'#1a1700',activeText:'#f0a500',border:'#2a2510',inputBg:'#111100',
            inputBorder:'#2a2510',sectionText:'#444',labelText:'#aaa',
            mutedText:'rgba(240,165,0,0.55)',valueText:'#f5e8cc',
            cardBorder:'#f0a50022',cardGlow:'0 0 0 1px #f0a50018, 0 4px 24px rgba(240,165,0,0.10)',
            cardHoverBorder:'#f0a50055',cardHoverGlow:'0 0 0 1px #f0a50044, 0 8px 32px rgba(240,165,0,0.18)',
            glowColor:'rgba(240,165,0,0.18)',
        },
        matrix: {
            name: 'Matrix',
            accent:'#00ff41',accentDim:'#00bb30',accentRgb:'0,255,65',
            topBorder:'linear-gradient(90deg,#00ff41,#00cc30,#00ff41)',
            panelBg:'#050a05',headerBg:'#080d08',tabBarBg:'#050a05',tabBorder:'#0a180a',
            activeBg:'#0a200a',activeText:'#00ff41',border:'#143014',inputBg:'#070e07',
            inputBorder:'#143014',sectionText:'#1a401a',labelText:'#449944',
            mutedText:'rgba(0,255,65,0.55)',valueText:'#ccffcc',
            cardBorder:'#00ff4122',cardGlow:'0 0 0 1px #00ff4118, 0 4px 24px rgba(0,255,65,0.10)',
            cardHoverBorder:'#00ff4155',cardHoverGlow:'0 0 0 1px #00ff4144, 0 8px 32px rgba(0,255,65,0.18)',
            glowColor:'rgba(0,255,65,0.18)',
        },
        rose: {
            name: 'Rose',
            accent:'#fb7185',accentDim:'#e11d48',accentRgb:'251,113,133',
            topBorder:'linear-gradient(90deg,#fb7185,#f472b6,#fb7185)',
            panelBg:'#120a0c',headerBg:'#180e11',tabBarBg:'#120a0c',tabBorder:'#2a151a',
            activeBg:'#26141a',activeText:'#fb7185',border:'#3a1f26',inputBg:'#1a1013',
            inputBorder:'#3a1f26',sectionText:'#5a3038',labelText:'#bb8893',
            mutedText:'rgba(251,113,133,0.55)',valueText:'#f5dde2',
            cardBorder:'#fb718522',cardGlow:'0 0 0 1px #fb718518, 0 4px 24px rgba(251,113,133,0.10)',
            cardHoverBorder:'#fb718555',cardHoverGlow:'0 0 0 1px #fb718544, 0 8px 32px rgba(251,113,133,0.18)',
            glowColor:'rgba(251,113,133,0.18)',
        },
        mono: {
            name: 'Mono',
            accent:'#e5e7eb',accentDim:'#9ca3af',accentRgb:'229,231,235',
            topBorder:'linear-gradient(90deg,#9ca3af,#e5e7eb,#9ca3af)',
            panelBg:'#0c0c0d',headerBg:'#101011',tabBarBg:'#0c0c0d',tabBorder:'#1c1c1e',
            activeBg:'#1c1c1e',activeText:'#e5e7eb',border:'#2b2b2e',inputBg:'#131314',
            inputBorder:'#2b2b2e',sectionText:'#4a4a4e',labelText:'#a0a0a6',
            mutedText:'rgba(229,231,235,0.55)',valueText:'#f0f0f2',
            cardBorder:'#e5e7eb22',cardGlow:'0 0 0 1px #e5e7eb14, 0 4px 24px rgba(229,231,235,0.07)',
            cardHoverBorder:'#e5e7eb44',cardHoverGlow:'0 0 0 1px #e5e7eb33, 0 8px 32px rgba(229,231,235,0.12)',
            glowColor:'rgba(229,231,235,0.14)',
        },
        sakura: {
            name: 'Sakura',
            accent:'#f9a8d4',accentDim:'#f472b6',accentRgb:'249,168,212',
            topBorder:'linear-gradient(90deg,#f9a8d4,#c084fc,#f9a8d4)',
            panelBg:'#100b0f',headerBg:'#160f15',tabBarBg:'#100b0f',tabBorder:'#281a26',
            activeBg:'#241824',activeText:'#f9a8d4',border:'#382438',inputBg:'#171018',
            inputBorder:'#382438',sectionText:'#553a54',labelText:'#bb96b6',
            mutedText:'rgba(249,168,212,0.55)',valueText:'#f5e4f0',
            cardBorder:'#f9a8d422',cardGlow:'0 0 0 1px #f9a8d418, 0 4px 24px rgba(249,168,212,0.10)',
            cardHoverBorder:'#f9a8d455',cardHoverGlow:'0 0 0 1px #f9a8d444, 0 8px 32px rgba(249,168,212,0.18)',
            glowColor:'rgba(249,168,212,0.18)',
        },
    };

    const DEFAULTS = {
        showNotifications:     true,
        notificationDuration:  5000,
        notificationPosition:  'bottom-right',
        theme:                 'purple',
        guiScale:              100,
        hotkeyRefresher:       'F',
        hotkeyHardRefresh:     'R',
        hotkeyToggleGui:       'Insert',
        clickInterval:         1500,
        hardRefreshInterval:   60000,
        miscBgUrl:                  '',
        miscBgBlur:                 false,
        miscBgBlurAmount:           8,
        miscBgDarkOverlay:          false,
        miscBgDarkOpacity:          50,
        sidebarEnabled:             false,
        sidebarMode:                'transparent',
        sidebarBlurAmount:          8,
        sidebarColour:              '#0d0d14',
        sidebarOpacity:             80,
        navbarEnabled:              false,
        navbarMode:                 'transparent',
        navbarColour:               '#0d0d14',
        navbarOpacity:              80,
        miscHideAds:                true,
        miscHideAlert:              false,
        miscHideNavbar:             false,
        miscPageFont:               'Default (Site Font)',
        miscGuiFont:                'Exo 2',
        miscHideMyFeed:             false,
        miscHideBlogNews:           false,
        miscModernGameCards:        false,
        miscGamesGlassify:          true,
        miscGamesHideComments:      false,
        miscGamesHideRecommended:   false,
        miscGamesHeroBackdrop:      true,
        miscCatalogFrameTransparent:false,
        miscCatalogHideSidebar:     false,
        miscCatalogItemCards:       true,
        miscProfileFrameTransparent:false,
        miscProfileNameAnimate:     false,
        miscProfileNameColor1:      '#5100e8',
        miscProfileNameColor2:      '#f238f8',
        miscFriendsFrameTransparent:false,
        miscAvatarFrameTransparent: false,
        miscHomeFramesTransparent:  false,
        miscFooterTransparent:      false,
        profileBannerEnabled:       false,
        profileBannerImage:         '',
        profileBannerBlur:          0,
        profileBannerTint:          '#000000',
        profileBannerTintOpacity:   0,
        profileBannerTintGradient:  false,
        profileBannerTint2:         '#3f2550',
        profileBannerTintAngle:     135,
        profileBannerBrightness:    100,
        hideHexBadge:               false,
        tradesBgColor:              '#262626',
        tradesOpacity:              100,
        tradesBlur:                 0,
        tradesAccent:               '#ffffff',
        tradesGlassCards:           false,
        tradesMetric:               'value',
        tradesPillOpacity:          5,
        watermarkEnabled:       true,
        watermarkPosition:      'bottom-center',
        watermarkShowPing:      true,
        watermarkShowTime:      true,
        watermarkShowUser:      true,
        watermarkScale:         120,
        watermarkOpacity:       90,
        watermarkAccentColor:   '',
        customAccentEnabled:    false,
        customAccentColor:      '#00e87a',
        panelGlass:             true,
        panelOpacity:           85,
        panelBlur:              14,
        panelRadius:            16,
        panelGradientEnabled:   false,
        panelGradientColor1:    '#0d0d12',
        panelGradientColor2:    '#1a1830',
        effectType:             'none',
        effectIntensity:        50,
        effectSpeed:            50,
        effectColor:            '',
        larpEnabled:            false,
        larpVerify:             false,
        larpRobux:              0,
        larpTix:                0,
        avatarBgEnabled:        false,
        avatarBgImage:          '',
        avatarBgBlur:           0,
        avatarGlassify:         false,
        avatarFakeItems:        [],
        avatarFakeQty:          {},
        anonymous:             false,
    };

    const loadCfg = () => {
        try {
            const s = GM_getValue('interium_ui_cfg_v1', null);
            return s ? Object.assign({}, DEFAULTS, JSON.parse(s)) : Object.assign({}, DEFAULTS);
        } catch { return Object.assign({}, DEFAULTS); }
    };
    const saveCfg = (c) => { try { GM_setValue('interium_ui_cfg_v1', JSON.stringify(c)); } catch {} };
    let cfg = loadCfg();

    const hexToRgbObj = (h) => {
        let s = String(h || '').replace('#', '').trim();
        if (s.length === 3) s = s.split('').map(c => c + c).join('');
        if (s.length !== 6) return null;
        const n = parseInt(s, 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const darkenHex = (h, f = 0.66) => {
        const c = hexToRgbObj(h); if (!c) return h;
        const d = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
        return '#' + [d(c.r), d(c.g), d(c.b)].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const deriveAccent = (hex) => {
        const c = hexToRgbObj(hex); if (!c) return null;
        const rgb = `${c.r},${c.g},${c.b}`;
        return {
            accent: hex, accentDim: darkenHex(hex, 0.66), accentRgb: rgb, activeText: hex,
            glowColor: `rgba(${rgb},0.18)`,
            topBorder: `linear-gradient(90deg,${hex},${darkenHex(hex, 0.55)},${hex})`,
            cardBorder: `rgba(${rgb},0.13)`,
            cardGlow: `0 0 0 1px rgba(${rgb},0.10), 0 4px 24px rgba(${rgb},0.10)`,
            cardHoverBorder: `rgba(${rgb},0.33)`,
            cardHoverGlow: `0 0 0 1px rgba(${rgb},0.27), 0 8px 32px rgba(${rgb},0.18)`,
        };
    };
    const getTheme = () => {
        const base = THEMES[cfg.theme] || THEMES.purple;
        if (cfg.customAccentEnabled && cfg.customAccentColor?.trim()) {
            const derived = deriveAccent(cfg.customAccentColor.trim());
            if (derived) return Object.assign({}, base, derived);
        }
        return base;
    };

    const PAGE_FONT_SPECS = {
        'Source Sans Pro Light': { family: 'Source Sans 3', weight: 300 },
    };

    const applyPageFont = (font) => {
        let el = document.getElementById('pks-page-font-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-page-font-style'; document.head.appendChild(el); }
        if (!font || font === 'Default (Site Font)') { el.textContent = ''; return; }
        const { family, weight } = PAGE_FONT_SPECS[font] || { family: font };
        const famParam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : '');
        const url = `https://fonts.googleapis.com/css2?family=${famParam}&display=swap`;
        el.textContent = `@import url('${url}'); body, body * { font-family:'${family}',sans-serif!important;${weight ? ` font-weight:${weight}!important;` : ''} }`;
    };

    const applyGuiFont = (font) => {
        const resolved = (!font || font === 'Share Tech Mono') ? 'Share Tech Mono' : font;
        const linkId = 'pks-gui-font-link';
        let link = document.getElementById(linkId);
        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(resolved)}:wght@400;600;700&display=swap`;
        const varId = 'pks-gui-font-var';
        let varEl = document.getElementById(varId);
        if (!varEl) {
            varEl = document.createElement('style');
            varEl.id = varId;
            document.head.appendChild(varEl);
        }
        varEl.textContent = `:root { --pks-font: '${resolved}', 'Share Tech Mono', monospace; }`;
    };

    const injectFont = () => {
        const baseId = 'pks-base-font-link';
        if (!document.getElementById(baseId)) {
            const link = document.createElement('link');
            link.id = baseId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap';
            document.head.appendChild(link);
        }
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    const SIDEBAR_SELECTORS = [
        '.container-0-2-79 .card-0-2-80',
        '.card-d0-0-2-87',
        '.container-0-2-96 .card-0-2-97',
        '.card-d0-0-2-104',
        '[class*="container-0-2-"] > [class*="card-0-2-"]',
    ].join(',\n                    ');

    const applySidebarNavStyle = () => {
        let el = document.getElementById('pks-sidebar-nav-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-sidebar-nav-style'; document.head.appendChild(el); }
        let css = '';
        if (cfg.sidebarEnabled) {
            const op   = (cfg.sidebarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.sidebarMode === 'transparent') {
                css += `${SIDEBAR_SELECTORS} { background:transparent!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            } else if (cfg.sidebarMode === 'blur') {
                css += `${SIDEBAR_SELECTORS} { background:rgba(13,13,20,${op})!important;backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            } else if (cfg.sidebarMode === 'colour') {
                const col = cfg.sidebarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `${SIDEBAR_SELECTORS} { background:rgba(${r},${g},${b},${op})!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            }
        }
        if (cfg.navbarEnabled) {
            const op   = (cfg.navbarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.navbarMode === 'transparent') {
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:transparent!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            } else if (cfg.navbarMode === 'blur') {
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(13,13,20,${op})!important;backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            } else if (cfg.navbarMode === 'colour') {
                const col = cfg.navbarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(${r},${g},${b},${op})!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            }
        }
        el.textContent = css;
    };

    const applySidebarDirect = () => {
        if (!cfg.sidebarEnabled) return;
        const card = document.querySelector('.container-0-2-96 .card-0-2-97')
            || document.querySelector('.card-d0-0-2-104')
            || document.querySelector('.container-0-2-79 .card-0-2-80')
            || document.querySelector('.card-d0-0-2-87')
            || (() => {
                const containers = document.querySelectorAll('[class*="container-0-2-"]');
                for (const c of containers) {
                    const card = c.querySelector('[class*="card-0-2-"]');
                    if (card && card.querySelector('a[href*="/profile"], a[href="/home"]')) return card;
                }
                return null;
            })();
        if (!card) return;
        const op   = (cfg.sidebarOpacity ?? 80) / 100;
        const blur = cfg.sidebarBlurAmount ?? 8;
        if (cfg.sidebarMode === 'transparent') {
            card.style.setProperty('background', 'transparent', 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        } else if (cfg.sidebarMode === 'blur') {
            card.style.setProperty('background', `rgba(13,13,20,${op})`, 'important');
            card.style.setProperty('backdrop-filter', `blur(${blur}px)`, 'important');
            card.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px)`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        } else if (cfg.sidebarMode === 'colour') {
            const col = cfg.sidebarColour || '#0d0d14';
            const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
            card.style.setProperty('background', `rgba(${r},${g},${b},${op})`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        }
    };


    const SIDEBAR_LINKS = [
        { href: '/internal/robuxexchange', name: 'Robux Exchange' },
        { href: '/internal/tixexchange',   name: 'Tix Exchange' },
        { href: '/My/Trades.aspx',         name: 'My Trades' },
    ];
    const injectSidebarLinks = () => {
        const groups = document.querySelector('a[href="/groups"][class*="link-0-2-"]') || document.querySelector('[class*="card-0-2-"] a[href="/groups"]');
        if (!groups || !groups.parentElement) return;
        let after = groups;
        SIDEBAR_LINKS.forEach(spec => {
            const existing = document.querySelector(`a[data-pks-navlink="${spec.href}"]`);
            if (existing) { after = existing; return; }
            const clone = groups.cloneNode(true);
            clone.setAttribute('data-pks-navlink', spec.href);
            clone.setAttribute('href', spec.href);
            clone.querySelectorAll('[class*="icon-nav-"]').forEach(e => e.remove());
            const wrap = clone.querySelector('[class*="wrapper-0-2-"]');
            if (wrap) wrap.className = wrap.className.replace(/\s*hover-icon-nav-\S+/, '');
            const name = clone.querySelector('[class*="name-0-2-"]');
            if (name) name.textContent = spec.name;
            clone.querySelectorAll('[class*="countWrapper"]').forEach(e => e.remove());
            after.parentElement.insertBefore(clone, after.nextSibling);
            after = clone;
        });
    };

    const applyPageFrameTransparency = () => {
        let el = document.getElementById('pks-frame-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-frame-style'; document.head.appendChild(el); }
        const t = getTheme();
        let css = `[class*="headshotWrapper"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;}`;
        css += `li[class*="messagesContainer-"]{display:none!important;}`;
        css += `[class*="dropdownWrapper"]{position:relative!important;z-index:1500!important;}[class*="dropdownNew"],[class*="dropdownClass"]{z-index:1500!important;}`;
        css += `[class*="userStatus"],[class*="statHeader"],[class*="statText"]{font-weight:700!important;}`;
        const FRAME_CSS = `background:transparent!important;backdrop-filter:blur(0px)!important;border-color:rgba(255,255,255,0.06)!important;box-shadow:none!important;`;
        if (cfg.miscHomeFramesTransparent) {
            css += `.container.container-0-2-162,.container-0-2-162{${FRAME_CSS}}.myFeedContainer-0-2-176,.blogNewsContainer-0-2-177,.homeGamesContainer-0-2-172{${FRAME_CSS}}`;
            css += `[class*="friendSection"] .section-content,[class*="friendSection"]{background:transparent!important;}[class*="thumbnailWrapper"]{box-shadow:none!important;}`;
        }
        if (cfg.miscCatalogFrameTransparent) css += `.catalogContainer-0-2-4,.detailsWrapper-0-2-117{${FRAME_CSS}}`;
        if (cfg.miscProfileFrameTransparent) {
            let glassEl = document.getElementById('pks-profile-glass-style');
            if (!glassEl) { glassEl = document.createElement('style'); glassEl.id = 'pks-profile-glass-style'; document.head.appendChild(glassEl); }
            glassEl.textContent = `
                .card,
                [class*="card-0-2-"],
                .card-body,
                [class*="cardBody-0-2-"],
                .avatarImageCard-0-2-334,
                .groupCard-0-2-402 {
                    background: rgba(255,255,255,0.05) !important;
                    backdrop-filter: blur(20px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                    border: 1px solid rgba(255,255,255,0.15) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.15) !important;
                }
                .avatarWrapper-0-2-191,
                .avatarContainer-0-2-189,
                .image-0-2-193,
                .listItemFriend-0-2-188,
                .friendLink-0-2-190 {
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .avatarWrapper-0-2-191 {
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                }
                /* backdrop-filter makes each card its own stacking context, which
                   buries the Past Usernames popover under the next glass frame.
                   Lift the hovered card so its popover paints above its siblings. */
                .card:hover,
                [class*="card-0-2-"]:hover:not([class*="dropdown"]),
                [class*="cardBody-0-2-"]:hover {
                    position: relative !important;
                    z-index: 100 !important;
                }
                .popover,
                [class*="popover"] {
                    z-index: 2000 !important;
                }
            `;
        } else {
            document.getElementById('pks-profile-glass-style')?.remove();
        }
        if (cfg.miscFriendsFrameTransparent) {
            css += `.section-content{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(20px) saturate(180%)!important;-webkit-backdrop-filter:blur(20px) saturate(180%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;box-shadow:0 8px 32px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.15)!important;}`;
            css += `.friendEntry-0-2-180,.friendWrapper-0-2-181,.thumbnailWrapper-0-2-182{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}`;
        }
        if (cfg.miscAvatarFrameTransparent) css += `.avatarCardContainer-0-2-570,.catalogContainer-0-2-4{${FRAME_CSS}}.pillToggle-0-2-553{background:rgba(255,255,255,0.05)!important;border-color:rgba(255,255,255,0.1)!important;}`;
        if (cfg.miscFooterTransparent) css += `[class*="footerContainer"],footer[class*="footerContainer"]{background:transparent!important;border-top:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;backdrop-filter:none!important;}`;
        if (cfg.miscGamesGlassify) {
            const accentDark = darkenHex(t.accent, 0.62);
            const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
            css += `
                /* every major frame → glass */
                [class*="callsToAction"],[class*="recommendedGamesContainer"],[class*="serverContainer"],[class*="subSectionContainer"],[class*="gameDescription"],[class*="contentContainer"]{${GLASS}padding:16px!important;}
                [class*="callsToAction"]{padding:14px!important;}
                [class*="carouselGameDetails"],[class*="thumbContainer"],[class*="innerCarousel"],[class*="carouselItem"]{border-radius:16px!important;overflow:hidden!important;}
                [class*="gameName"],[class*="containerHeader"] h3{color:#fff!important;}
                [class*="creatorName"]{color:${t.accent}!important;}
                [class*="descriptionText"]{color:#dfe3f0!important;background:transparent!important;}
                [class*="voteText"],[class*="voteNumbers"],[class*="playerCount"],[class*="creatorLabel"]{color:#e6e9f5!important;}
                /* game stats → modern glass chips */
                [class*="gameStatsContainer"]{display:flex!important;flex-wrap:wrap!important;gap:8px!important;border:none!important;padding:0!important;margin-top:12px!important;}
                [class*="gameStat-"]{list-style:none!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:8px 13px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="gameStat-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="gameStatLabel"]{color:#9aa0c0!important;}
                [class*="gameStatStat"]{color:#fff!important;font-weight:700!important;}
                [class*="reportAbuseContainer"] a,[class*="abuseLink"]{color:${t.accent}!important;}
                /* comments → glass */
                [class*="commentContainer"]{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;margin-bottom:8px!important;}
                [class*="createCommentContainer"],[class*="commentBox"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;}
                [class*="commentBox"] input,[class*="createCommentContainer"] input{background:transparent!important;color:#fff!important;border:none!important;}
                /* modern, sleek buttons */
                [class*="actionButtonsContainer"]{gap:8px!important;}
                [class*="playButtonContainer"] button,[class*="buttonWrapper"] button{background:linear-gradient(135deg,${t.accent},${accentDark})!important;border:none!important;border-radius:14px!important;box-shadow:0 6px 22px ${t.accent}55!important;transition:transform 0.16s ease,box-shadow 0.16s ease,filter 0.16s ease!important;}
                [class*="playButtonContainer"] button:hover,[class*="buttonWrapper"] button:hover{transform:translateY(-2px) scale(1.02)!important;filter:brightness(1.08)!important;box-shadow:0 12px 30px ${t.accent}88!important;}
                [class*="playButtonContainer"] button [class*="iconPlay"]{filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))!important;}
                [class*="favoriteButton"],[class*="followButton"]{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:14px!important;padding:8px 14px!important;transition:background 0.15s ease,border-color 0.15s ease,transform 0.15s ease!important;}
                [class*="favoriteButton"]:hover,[class*="followButton"]:hover{background:rgba(255,255,255,0.11)!important;border-color:${t.accent}99!important;transform:translateY(-1px)!important;}
                [class*="favoriteLabel"],[class*="followLabel"]{color:#fff!important;font-weight:600!important;}
                /* About / Store / Servers tabs → modern glass segmented control */
                [class*="buttonCol"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;}
                [class*="vTab-"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
                [class*="vTab-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="vTabLabel"]{color:#cfd3e6!important;font-weight:600!important;margin:0!important;padding:9px 16px!important;text-align:center!important;cursor:pointer!important;}
                [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 0 -2px 0 ${t.accent}!important;}
                [class*="vTabUnselected"]{color:#8a90ad!important;}
            `;
        }
        css += `[class*="gameContainer"] [class*="background-"],[class*="gameContainer"] [class*="thumbContainer"],[class*="gameContainer"] [class*="carouselGameDetails"],[class*="gameContainer"] [class*="descriptionContainer"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (!cfg.miscGamesGlassify) css += `[class*="gameContainer"] [class*="contentContainer"],[class*="gameContainer"] [class*="callsToAction"],[class*="gameContainer"] [class*="recommendedGamesContainer"],[class*="gameContainer"] [class*="commentsContainer"],[class*="gameContainer"] [class*="createCommentContainer"],[class*="gameContainer"] [class*="commentBox"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (cfg.miscGamesHideRecommended) css += `[class*="recommendedGamesContainer"]{display:none!important;}`;
        if (cfg.miscGamesHideComments) css += `[class*="commentsContainer"]{display:none!important;}[class*="containerHeader"]:has(+[class*="commentsContainer"]){display:none!important;}`;
        el.textContent = css;
        applyGamesHeroBackdrop();
        applyMessagesGlass();
    };

    const applyMessagesGlass = () => {
        if (!document.querySelector('div[class*="messagesContainer-"]')) {
            document.getElementById('pks-messages-glass-style')?.remove();
            return;
        }
        let el = document.getElementById('pks-messages-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-messages-glass-style'; document.head.appendChild(el); }
        const t = getTheme();
        const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
        const M = 'div[class*="messagesContainer-"]';
        el.textContent = `
            ${M}{${GLASS}padding:18px!important;color:#e6e9f5!important;}
            /* tabs (Inbox / Sent / Notifications / Archive) */
            ${M} [class*="vTab-0-2"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
            ${M} [class*="vTab-0-2"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
            ${M} [class*="vTabLabel"]{margin:0!important;padding:10px 16px!important;color:#cfd3e6!important;font-weight:600!important;cursor:pointer!important;}
            ${M} [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 3px 0 0 ${t.accent}!important;}
            ${M} [class*="vTabUnselected"]{color:#8a90ad!important;}
            ${M} [class*="count-0-2"]{background:${t.accent}!important;color:#050508!important;border-radius:10px!important;padding:1px 7px!important;font-weight:700!important;margin-left:6px!important;}
            ${M} [class*="btnBottomSeperator"]{display:none!important;}
            /* message rows → individual glass cards */
            ${M} [class*="messageRow-"]{${GLASS}display:flex!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
            ${M} [class*="messageRow-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;background:rgba(255,255,255,0.08)!important;}
            ${M} [class*="userImage-"] img{border-radius:50%!important;border:1px solid rgba(255,255,255,0.15)!important;}
            ${M} [class*="username-"]{color:#fff!important;font-weight:700!important;}
            ${M} [class*="subjectUnread"]{color:${t.accent}!important;font-weight:700!important;}
            ${M} [class*="subject-0-2"]:not([class*="subjectUnread"]){color:#dfe3f0!important;}
            ${M} [class*="body-0-2"]{color:#9aa0c0!important;}
            ${M} [class*="divider-top"]{display:none!important;}
            /* action + pagination buttons → glass */
            ${M} button{background:rgba(255,255,255,0.06)!important;color:#e6e9f5!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;transition:all 0.15s ease!important;}
            ${M} button:hover:not(:disabled){border-color:${t.accent}99!important;background:rgba(255,255,255,0.1)!important;transform:translateY(-1px)!important;}
            ${M} button:disabled{opacity:0.4!important;}
            /* checkboxes */
            ${M} input[type="checkbox"]{accent-color:${t.accent}!important;cursor:pointer!important;}
        `;
    };

    const isGamePage = () => /\/games\/\d+/i.test(location.pathname);
    const applyGamesHeroBackdrop = () => {
        let el = document.getElementById('pks-games-hero-style');
        if (!cfg.miscGamesHeroBackdrop || !isGamePage() || cfg.miscBgUrl?.trim()) { el?.remove(); return; }
        const tryApply = () => {
            const img = document.querySelector('[class*="carouselItem"] img, [class*="thumbContainer"] img, [class*="imageContainer"] img');
            const url = img?.src;
            if (!url) return false;
            if (!el) { el = document.createElement('style'); el.id = 'pks-games-hero-style'; document.head.appendChild(el); }
            el.textContent = `
                body::before{content:'';position:fixed;inset:-40px;z-index:0;background:url('${url.replace(/'/g, "\\'")}') center/cover no-repeat;filter:blur(38px) saturate(135%) brightness(0.55);transform:scale(1.1);pointer-events:none;}
                body::after{content:'';position:fixed;inset:0;z-index:0;background:linear-gradient(180deg,rgba(8,8,14,0.55),rgba(8,8,14,0.88))!important;pointer-events:none;}
                body>*{position:relative;z-index:1;}#pks-panel,#pks-watermark{z-index:2147483647!important;}
            `;
            return true;
        };
        if (tryApply()) return;
        let tries = 0;
        const obs = new MutationObserver(() => { if (tries++ > 120) { obs.disconnect(); return; } if (tryApply()) obs.disconnect(); });
        obs.observe(document.body, { childList: true, subtree: true });
    };

    const applyThemeToDom = () => {
        const t = getTheme();
        let styleEl = document.getElementById('pks-theme-style');
        if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'pks-theme-style'; document.head.appendChild(styleEl); }
        styleEl.textContent = `
            #pks-panel input:focus, #pks-panel select:focus { border-color:${t.accent}!important;box-shadow:0 0 0 2px ${t.accent}22!important; }
            #pks-panel input[type=checkbox] { accent-color:${t.accent}; }
            .pks-tab-btn.active { background:${t.activeBg}!important;color:${t.activeText}!important;border-bottom:2px solid ${t.accent}!important; }
            #pks-r-dot.on { background:${t.accent}!important;box-shadow:0 0 8px ${t.accent}!important; }
            .pks-stat-val { color:${t.accent}!important; }
            #pks-panel input[type=text], #pks-panel input[type=number], #pks-panel select { background:${t.inputBg};border-color:${t.inputBorder};color:${t.valueText}; }
            #pks-panel { background:${t.panelBg};border-color:${t.border}; }
            #pks-header { background:${t.headerBg}; }
            #pks-tab-bar { background:${t.tabBarBg};border-bottom-color:${t.tabBorder}; }
            .pks-section-title { color:${t.sectionText}!important; }
            .pks-row label { color:${t.labelText}!important; }
            #pks-top-border { background:${t.topBorder}!important; }
            #pks-r-start.pks-action-btn { background:${t.accent}!important;color:#050508!important; }
            #pks-avatar-img { border-color:${t.accent}44!important; }
            .pks-currency-pill { border-color:${t.border}!important;background:${t.inputBg}!important; }
            .pks-stat { background:${t.inputBg}!important;border-color:${t.border}!important; }
            .pks-action-btn:hover { filter:brightness(1.2); }
            @keyframes pks-title-color { 0%{color:${t.accent}} 50%{color:${t.accentDim}} 100%{color:${t.accent}} }
            #pks-header-title { color:${t.accent};animation:pks-title-color 3s ease-in-out infinite; }
        `;
        updatePanelGlow();
        applyPanelAppearance();
        updateWatermarkTheme();
        applyCardStyle();
        applyMisc();
        applyTradeStyle();
    };

    const updatePanelGlow = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        panel.style.boxShadow = `0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04),0 0 28px 4px ${t.glowColor},0 0 60px 8px ${t.glowColor.replace('0.18','0.07')}`;
    };

    const applyPanelAppearance = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        const header = document.getElementById('pks-header');
        const tabbar = document.getElementById('pks-tab-bar');
        panel.style.borderRadius = (cfg.panelRadius ?? 16) + 'px';

        if (cfg.panelGradientEnabled) {
            const c1 = cfg.panelGradientColor1 || '#0d0d12';
            const c2 = cfg.panelGradientColor2 || '#1a1830';
            panel.style.setProperty('background', `linear-gradient(160deg, ${c1}, ${c2})`, 'important');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
            header?.style.setProperty('background', 'transparent', 'important');
            tabbar?.style.setProperty('background', 'transparent', 'important');
            return;
        }
        header?.style.removeProperty('background');
        tabbar?.style.removeProperty('background');

        if (cfg.panelGlass) {
            const op   = (cfg.panelOpacity ?? 85) / 100;
            const blur = cfg.panelBlur ?? 14;
            const c    = hexToRgbObj(t.panelBg) || { r: 12, g: 12, b: 14 };
            panel.style.setProperty('background', `rgba(${c.r},${c.g},${c.b},${op})`, 'important');
            panel.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
            panel.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else {
            panel.style.removeProperty('background');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
        }
    };

    const state = {
        session:   { lastUrl: location.href, cachedCsrf: null },
        dom:       { observer: null, retryTimer: null },
        refresher: { running: false, clickTimer: null, reloadTimer: null, clicks: 0, reloads: 0 },
        profile:   { id: null, name: null, robux: 0, tickets: 0, avatar: null },
        watermark: { startTime: Date.now(), pingTimer: null, ping: null, dragX: null, dragY: null },
        authInfo:  { daysLeft: 0 },
        authKey:   null,
        trade: {
            tradeTabActive: false,
            massModal: null,
            massBlastState: { myItems:[], mySelected:[], targetAssetId:null, targetOwners:[], sending:false, stopped:false, delaySeconds:20, logs:[] },
            massCustomState: { myItems:[], mySelected:[], targets:[], sending:false, logs:[] },
            assetThumbs: {},
            myUserId: null,
        }
    };

    let twMyItems = [], twTheirItems = [], twMySelected = [], twTheirSelected = [];
    let twMyPage = 0, twTheirPage = 0, twMySearch = '', twTheirSearch = '';
    const TW_PER_PAGE = 10, TW_MAX_SEL = 4;

    const isHomePage     = () => location.pathname === '/' || location.pathname.toLowerCase() === '/home';
    const isProfilePage  = () => /\/users\/\d+\/profile/i.test(location.pathname);

    let _csrfToken = null;
    const getCsrf = () => {
        const m = document.cookie.match(/rbxcsrf4=([^;]+)/);
        return m ? m[1] : _csrfToken || '';
    };

    const postApi = async (url, body = {}) => {
        let csrf = getCsrf();
        const doPost = async (token) => {
            const h = { 'Content-Type': 'application/json' };
            if (token) h['x-csrf-token'] = token;
            const r = await fetch(url, { method: 'POST', headers: h, credentials: 'include', body: JSON.stringify(body) });
            if (r.status === 403) {
                const t = r.headers.get('x-csrf-token');
                if (t && t !== token) { _csrfToken = t; return doPost(t); }
            }
            return r;
        };
        return doPost(csrf);
    };

    const apiGet = (url) => fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });

    // ── Interium: removed-feature stubs ──────────────────────────────
    // Trading, the auto-refresher, LARP/fake-item tools and every call to
    // the private hexium worker server were removed from this build.
    // Trading is handled by Interium's own trading module. These no-op
    // stubs keep the remaining UI code paths safe.
    const _noop = () => {};
    const isTradePage = () => false;
    const isTradeWindow = () => false;
    const applyTradeStyle = _noop, applyTradesCustom = _noop, ensureTradesOverlay = _noop,
          injectTradeWindow = _noop, buildMassTradeUI = _noop, injectProfileTradeButton = _noop;
    const startRefresher = _noop, stopRefresher = _noop, panelLog = _noop,
          updateRefresherUI = _noop, updateRefresherStatus = _noop;
    const applyLarp = _noop, applyFakeVerify = _noop, applyCatalogOwned = _noop,
          injectAvatarTools = _noop, removeFakeAvatarItem = _noop, formatLarp = () => '';
    const addFakeAvatarItem = async () => {};
    const fetchFakeItemData = async () => null;
    const applyBadges = _noop, pollAnnouncements = _noop, saveProfileBanner = _noop;
    const getAuthSession = () => '';


    const notify = (message, type = 'success') => {
        if (!cfg.showNotifications) return;
        const colors = {
            success: { bg:'#0d1f16', border:'#00e87a', accent:'#00e87a' },
            error:   { bg:'#1f0d0d', border:'#ff4466', accent:'#ff4466' },
            info:    { bg:'#0d1120', border:'#5b8cff', accent:'#5b8cff' },
            warning: { bg:'#1f1a0d', border:'#f0a500', accent:'#f0a500' },
        };
        const icons = {
            success: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>`,
            error:   `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>`,
            info:    `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="5" x2="6" y2="9"/><circle cx="6" cy="3" r="0.5" fill="currentColor"/></svg>`,
            warning: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L10.5 10H1.5Z"/><line x1="6" y1="5.5" x2="6" y2="7.5"/></svg>`,
        };
        const c = colors[type] || colors.info;
        const icon = icons[type] || icons.info;
        const posStyles = {
            'top-center':    'top:16px;left:50%;transform:translateX(-50%);',
            'bottom-center': 'bottom:16px;left:50%;transform:translateX(-50%);',
            'top-right':     'top:16px;right:16px;',
            'bottom-right':  'bottom:16px;right:16px;',
        };
        const pos = posStyles[cfg.notificationPosition] || posStyles['top-center'];
        const existing = document.querySelectorAll('.pks-notif');
        existing.forEach((el, i) => {
            if (cfg.notificationPosition?.includes('bottom')) el.style.bottom = (16 + (existing.length - i) * 56) + 'px';
            else el.style.top = (16 + (existing.length - i) * 56) + 'px';
        });
        const el = document.createElement('div');
        el.className = 'pks-notif';
        el.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483647;display:inline-flex;align-items:center;gap:9px;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:10px 14px;width:auto;max-width:340px;white-space:nowrap;font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:11px;color:#e0e0e0;box-shadow:0 0 18px ${c.border}33,0 4px 14px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,top 0.2s,bottom 0.2s;pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden;`;
        el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${c.accent};display:flex;align-items:center;justify-content:center;color:${c.accent};flex-shrink:0;">${icon}</div><span style="flex:1;line-height:1.3;white-space:normal;max-width:260px;">${message}</span><div style="width:2px;height:28px;border-radius:2px;background:${c.accent};flex-shrink:0;"></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
        setTimeout(() => {
            el.style.opacity = '0';
            el.addEventListener('transitionend', () => el.remove(), { once: true });
        }, cfg.notificationDuration);
    };

    const fetchProfile = async () => {
        try {
            const userRes = await fetch('https://www.pekora.zip/apisite/users/v1/users/authenticated', { credentials:'include' });
            if (!userRes.ok) return;
            const user = await userRes.json();
            state.profile.id   = user.id;
            state.profile.name = user.displayName || user.name;
            state.trade.myUserId = user.id;
            const currRes = await fetch(`https://www.pekora.zip/apisite/economy/v1/users/${user.id}/currency`, { credentials:'include' });
            if (currRes.ok) { const curr = await currRes.json(); state.profile.robux = curr.robux ?? 0; state.profile.tickets = curr.tickets ?? 0; }
            updateProfileUI();
            updateWatermark();
        } catch {}
    };

    const updateProfileUI = () => {
        const nameEl   = document.getElementById('pks-profile-name');
        const robuxEl  = document.getElementById('pks-profile-robux');
        const ticketEl = document.getElementById('pks-profile-tickets');
        const avatarEl = document.getElementById('pks-avatar-img');
        const avatarX  = document.getElementById('pks-avatar-anon');
        const t        = getTheme();
        if (cfg.anonymous) {
            if (nameEl)   nameEl.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
            if (robuxEl)  robuxEl.textContent = '\u2022\u2022\u2022';
            if (ticketEl) ticketEl.textContent = '\u2022\u2022\u2022';
            if (avatarEl) avatarEl.style.display = 'none';
            if (avatarX)  avatarX.style.display = 'flex';
        } else {
            if (nameEl)   nameEl.textContent = state.profile.name ?? '\u2014';
            if (robuxEl)  robuxEl.innerHTML  = `<span style="color:${t.accent};font-weight:700;">${(state.profile.robux ?? 0).toLocaleString()}</span>`;
            if (ticketEl) ticketEl.innerHTML = `<span style="color:#f0a500;font-weight:700;">${(state.profile.tickets ?? 0).toLocaleString()}</span>`;
            if (avatarEl) avatarEl.style.display = 'block';
            if (avatarX)  avatarX.style.display = 'none';
        }
    };

    const getWatermarkAccent = () => cfg.watermarkAccentColor?.trim() || getTheme().accent;

    const measurePing = async () => {
        try {
            const t0 = performance.now();
            await fetch('https://www.pekora.zip/apisite/users/v1/users/authenticated', { credentials:'include', cache:'no-store', signal:AbortSignal.timeout(5000) });
            state.watermark.ping = Math.round(performance.now() - t0);
        } catch { state.watermark.ping = null; }
        updateWatermark();
    };

    const formatSessionTime = () => {
        const ms = Date.now() - state.watermark.startTime;
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m`; if (m > 0) return `${m}m ${s % 60}s`; return `${s}s`;
    };

    const updateWatermark = () => {
        const wm = document.getElementById('pks-watermark');
        if (!wm) return;
        if (!cfg.watermarkEnabled) { wm.style.display = 'none'; return; }
        wm.style.display = '';
        const wmAccent = getWatermarkAccent();
        const scale = (cfg.watermarkScale ?? 100) / 100;
        const op    = (cfg.watermarkOpacity ?? 90) / 100;
        const parts = [{ text:'Interium', logo:true }];
        if (cfg.watermarkShowTime) parts.push({ text:formatSessionTime() });
        if (cfg.watermarkShowPing) {
            const p = state.watermark.ping;
            const pingColor = p === null ? '#555' : p < 80 ? '#00e87a' : p < 200 ? '#f0a500' : '#ff4466';
            parts.push({ text:p !== null ? `${p}ms` : '\u2014ms', color:pingColor });
        }
        if (cfg.watermarkShowUser) parts.push({ text:cfg.anonymous ? '\u2022\u2022\u2022\u2022\u2022\u2022' : (state.profile.name || '\u2026') });
        wm.innerHTML = '';
        parts.forEach((p, i) => {
            if (i > 0) { const sep = document.createElement('span'); sep.textContent = '\u00b7'; sep.style.cssText = `color:rgba(255,255,255,0.15);margin:0 5px;font-size:${10 * scale}px;`; wm.appendChild(sep); }
            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.cssText = p.logo ? `color:${wmAccent};font-weight:700;letter-spacing:0.1em;font-size:${10 * scale}px;` : `color:${p.color || 'rgba(255,255,255,0.5)'};font-size:${10 * scale}px;`;
            wm.appendChild(span);
        });
        let shimmer = wm.querySelector('.pks-wm-shimmer');
        if (!shimmer) { shimmer = document.createElement('div'); shimmer.className = 'pks-wm-shimmer'; wm.appendChild(shimmer); }
        shimmer.style.cssText = `position:absolute;bottom:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${wmAccent}99,transparent);animation:pks-wm-slide 2.5s linear infinite;`;
        if (state.watermark.dragX === null) {
            const positions = {
                'bottom-left':  'bottom:12px;left:12px;','bottom-right':'bottom:12px;right:12px;',
                'top-left':     'top:12px;left:12px;','top-right':'top:12px;right:420px;',
                'bottom-center':'bottom:12px;left:50%;transform:translateX(-50%);','top-center':'top:12px;left:50%;transform:translateX(-50%);',
            };
            const pos = positions[cfg.watermarkPosition] || positions['bottom-left'];
            wm.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483640;display:flex;align-items:center;gap:0;font-family:var(--pks-font),'Share Tech Mono',monospace;font-weight:600;letter-spacing:0.06em;background:rgba(5,5,8,0.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:${5*scale}px ${12*scale}px;pointer-events:auto;user-select:none;overflow:hidden;opacity:${op};cursor:grab;`;
        } else {
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px';
            wm.style.opacity = String(op); wm.style.padding = `${5*scale}px ${12*scale}px`;
        }
    };

    const updateWatermarkTheme = () => updateWatermark();

    const buildWatermark = () => {
        let kf = document.getElementById('pks-wm-kf');
        if (!kf) { kf = document.createElement('style'); kf.id = 'pks-wm-kf'; kf.textContent = `@keyframes pks-wm-slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`; document.head.appendChild(kf); }
        let wm = document.getElementById('pks-watermark');
        if (!wm) { wm = document.createElement('div'); wm.id = 'pks-watermark'; document.body.appendChild(wm); }
        let isDragging = false, dox = 0, doy = 0, dsx = 0, dsy = 0;
        wm.addEventListener('mousedown', (e) => {
            isDragging = true; const r = wm.getBoundingClientRect(); dox = r.left; doy = r.top; dsx = e.clientX; dsy = e.clientY; wm.style.cursor = 'grabbing'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            state.watermark.dragX = dox + (e.clientX - dsx); state.watermark.dragY = doy + (e.clientY - dsy);
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px'; wm.style.bottom = 'auto'; wm.style.right = 'auto'; wm.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { isDragging = false; wm.style.cursor = 'grab'; });
        updateWatermark();
        setInterval(updateWatermark, 1000);
        measurePing();
        state.watermark.pingTimer = setInterval(measurePing, 10000);
    };

    let _fxCanvas = null, _fxCtx = null, _fxRaf = null, _fxParticles = [], _fxCols = [], _fxResize = null, _fxLast = 0;
    const MATRIX_CHARS = 'アウエカキクケコサシスセソダツナニノハホマミムメモヤユヨリワ0123456789'.split('');

    const fxResolveColor = (type) => {
        if (cfg.effectColor?.trim()) return cfg.effectColor.trim();
        const t = getTheme();
        if (type === 'matrix') return t.accent;
        if (type === 'rain')   return '#9fc4ff';
        return '#ffffff';
    };

    const stopEffects = () => {
        if (_fxRaf) cancelAnimationFrame(_fxRaf);
        _fxRaf = null;
        if (_fxResize) { window.removeEventListener('resize', _fxResize); _fxResize = null; }
        if (_fxCanvas) { _fxCanvas.remove(); _fxCanvas = null; _fxCtx = null; }
        document.getElementById('pks-effects-style')?.remove();
        _fxParticles = []; _fxCols = [];
    };

    const fxInit = (type, w, h) => {
        _fxParticles = []; _fxCols = [];
        const intensity = Math.max(10, Math.min(100, cfg.effectIntensity ?? 50)) / 100;
        if (type === 'rain') {
            const n = Math.round(60 + intensity * 240);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, len: 8+Math.random()*14, vy: 6+Math.random()*6, vx: -1-Math.random()*1.2 });
        } else if (type === 'snow') {
            const n = Math.round(40 + intensity * 160);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 1+Math.random()*2.5, vy: 0.4+Math.random()*1.1, phase: Math.random()*Math.PI*2, drift: 0.3+Math.random()*0.7 });
        } else if (type === 'stars') {
            const n = Math.round(50 + intensity * 200);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 0.5+Math.random()*1.6, phase: Math.random()*Math.PI*2, tw: 0.01+Math.random()*0.03 });
        } else if (type === 'matrix') {
            const fs = 14, cols = Math.ceil(w / fs);
            for (let i = 0; i < cols; i++) _fxCols.push({ y: (Math.random()*h)/fs, speed: 0.3+Math.random()*0.7 });
        }
    };

    const fxDraw = (type, dt) => {
        const ctx = _fxCtx, c = _fxCanvas;
        if (!ctx || !c) return;
        const w = c.width, h = c.height;
        const speed = Math.max(10, Math.min(100, cfg.effectSpeed ?? 50)) / 50;
        const color = fxResolveColor(type);
        ctx.clearRect(0, 0, w, h);
        if (type === 'rain') {
            ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.1;
            ctx.beginPath();
            for (const p of _fxParticles) {
                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx*2, p.y + p.len);
                p.y += p.vy * speed * dt; p.x += p.vx * speed * dt;
                if (p.y > h) { p.y = -p.len; p.x = Math.random()*w; }
                if (p.x < 0) p.x = w;
            }
            ctx.stroke(); ctx.globalAlpha = 1;
        } else if (type === 'snow') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                ctx.globalAlpha = 0.75;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
                p.phase += 0.02 * dt;
                p.y += p.vy * speed * dt; p.x += Math.sin(p.phase) * p.drift * speed * dt * 0.5;
                if (p.y > h) { p.y = -p.r; p.x = Math.random()*w; }
            }
            ctx.globalAlpha = 1;
        } else if (type === 'stars') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                p.phase += p.tw * dt * speed;
                ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(p.phase));
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'matrix') {
            const fs = 14;
            ctx.font = fs + 'px monospace'; ctx.textAlign = 'center';
            for (let i = 0; i < _fxCols.length; i++) {
                const col = _fxCols[i];
                const x = i * fs + fs/2, headY = col.y * fs;
                for (let k = 0; k < 6; k++) {
                    const yy = headY - k*fs;
                    if (yy < 0 || yy > h) continue;
                    ctx.globalAlpha = k === 0 ? 1 : Math.max(0, 0.5 - k*0.08);
                    ctx.fillStyle = k === 0 ? '#ffffff' : color;
                    ctx.fillText(MATRIX_CHARS[(Math.random()*MATRIX_CHARS.length)|0], x, yy);
                }
                col.y += col.speed * speed * 0.6 * dt;
                if (headY > h + 40) { col.y = Math.random()*-10; col.speed = 0.3+Math.random()*0.7; }
            }
            ctx.globalAlpha = 1;
        }
    };

    const applyEffects = () => {
        const type = cfg.effectType || 'none';
        stopEffects();
        if (type === 'none' || !document.body) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'pks-effects-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1;';
        document.body.insertBefore(canvas, document.body.firstChild);
        let fxStyle = document.getElementById('pks-effects-style');
        if (!fxStyle) { fxStyle = document.createElement('style'); fxStyle.id = 'pks-effects-style'; document.head.appendChild(fxStyle); }
        fxStyle.textContent = `body > *:not(#pks-effects-canvas):not(#pks-tr-overlay):not(#pks-tw-root){position:relative;z-index:2;} #pks-effects-canvas{z-index:1!important;}`;
        _fxCanvas = canvas; _fxCtx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; fxInit(type, canvas.width, canvas.height); };
        resize(); _fxResize = resize; window.addEventListener('resize', resize);
        _fxLast = performance.now();
        const loop = (now) => {
            const dt = Math.min(3, (now - _fxLast) / 16.67); _fxLast = now;
            fxDraw(type, dt);
            _fxRaf = requestAnimationFrame(loop);
        };
        _fxRaf = requestAnimationFrame(loop);
    };

    const profileId = () => { const m = location.pathname.match(/\/users\/(\d+)/); return m ? m[1] : null; };

    const myPekoraId = () => String(state.profile.id || '');

    const getProfileFrame = () => {
        const h = document.querySelector('h2[class*="username"]');
        if (!h) return null;
        return h.closest('[class*="cardBody-0-2-"]') || h.closest('[class*="card-0-2-"]') || null;
    };

    const applyProfileBanner = (data) => {
        const frame = getProfileFrame();
        if (!frame) return;
        let layer = frame.querySelector(':scope > .pks-prof-banner');
        if (!data || !data.img) { if (layer) layer.remove(); return; }
        if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'pks-prof-banner';
            layer.style.cssText = 'position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;';
            frame.insertBefore(layer, frame.firstChild);
        }
        Array.from(frame.children).forEach(c => {
            if (c === layer) return;
            if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
            c.style.zIndex = '1';
        });
        const img    = String(data.img).replace(/'/g, "\\'");
        const blur   = Math.max(0, Math.min(40, +data.blur || 0));
        const bright = Math.max(30, Math.min(150, +data.bright || 100)) / 100;
        const tint   = /^#[0-9a-fA-F]{6}$/.test(data.tint || '') ? data.tint : '#000000';
        const tint2  = /^#[0-9a-fA-F]{6}$/.test(data.tint2 || '') ? data.tint2 : tint;
        const angle  = Math.max(0, Math.min(360, +data.tintAngle || 135));
        const grad   = !!data.tintGradient;
        const tintBg = grad ? `linear-gradient(${angle}deg, ${tint}, ${tint2})` : tint;
        const tintOp = Math.max(0, Math.min(100, +data.tintOp || 0)) / 100;
        const sig = `${img}|${blur}|${bright}|${tint}|${tint2}|${angle}|${grad}|${tintOp}`;
        if (layer.getAttribute('data-sig') === sig) return;
        layer.setAttribute('data-sig', sig);
        layer.innerHTML = `
            <div style="position:absolute;inset:-${blur * 2 + 2}px;background-image:url('${img}');background-size:cover;background-position:center;filter:blur(${blur}px) brightness(${bright});"></div>
            <div style="position:absolute;inset:0;background:${tintBg};opacity:${tintOp};"></div>`;
    };

    let _bannerFetchedId = null, _bannerFetchedData = null;
    const localBannerData = () => (cfg.profileBannerEnabled && cfg.profileBannerImage) ? {
        img: cfg.profileBannerImage, blur: cfg.profileBannerBlur, tint: cfg.profileBannerTint,
        tintOp: cfg.profileBannerTintOpacity, bright: cfg.profileBannerBrightness,
        tint2: cfg.profileBannerTint2, tintGradient: cfg.profileBannerTintGradient, tintAngle: cfg.profileBannerTintAngle,
    } : null;

    const applyProfileBannerForPage = () => {
        const id = profileId();
        if (!id) return;
        // Local-only: the banner is shown on your own profile from your saved settings.
        applyProfileBanner(id === myPekoraId() ? localBannerData() : null);
    };

    let _modalFixedEls = [];
    const fixGameModal = () => {
        const modal = document.querySelector('[class*="modalWrapper"]');
        if (modal) {
            modal.style.setProperty('position', 'fixed', 'important');
            modal.style.setProperty('top', '50%', 'important');
            modal.style.setProperty('left', '50%', 'important');
            modal.style.setProperty('right', 'auto', 'important');
            modal.style.setProperty('bottom', 'auto', 'important');
            modal.style.setProperty('margin', '0', 'important');
            modal.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            modal.style.setProperty('z-index', '2147483647', 'important');
            for (let el = modal.parentElement; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
                if (el.hasAttribute('data-pks-modalfix')) continue;
                const cs = getComputedStyle(el);
                const traps = cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none'
                    || (cs.backdropFilter && cs.backdropFilter !== 'none')
                    || /transform|perspective|filter/.test(cs.willChange || '')
                    || /paint|layout|strict|content/.test(cs.contain || '');
                if (!traps) continue;
                el.setAttribute('data-pks-modalfix', '1');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter'].forEach(p => el.style.setProperty(p, 'none', 'important'));
                el.style.setProperty('will-change', 'auto', 'important');
                el.style.setProperty('contain', 'none', 'important');
                _modalFixedEls.push(el);
            }
        } else if (_modalFixedEls.length) {
            _modalFixedEls.forEach(el => {
                el.removeAttribute('data-pks-modalfix');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter', 'will-change', 'contain'].forEach(p => el.style.removeProperty(p));
            });
            _modalFixedEls = [];
        }
    };

    const applyCardStyle = () => {
        let cs = document.getElementById('pks-card-style');
        if (!cs) { cs = document.createElement('style'); cs.id = 'pks-card-style'; document.head.appendChild(cs); }
        if (!cfg.miscModernGameCards && !cfg.miscCatalogItemCards) { cs.textContent = ''; return; }
        const t = getTheme();
        let cssOut = '';
        if (cfg.miscModernGameCards) {
            cssOut += `.gameCardContainer-0-2-207,[class*="gameCardContainer"]{background:rgba(12,12,18,0.9)!important;border-radius:14px!important;border:1px solid ${t.cardBorder}!important;box-shadow:${t.cardGlow}!important;transition:border-color 0.22s,box-shadow 0.22s,transform 0.18s!important;overflow:hidden!important;}.gameCardContainer-0-2-207:hover,[class*="gameCardContainer"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;transform:translateY(-3px)!important;z-index:2!important;}`;
        }
        if (cfg.miscCatalogItemCards) {
            cssOut += `
                div[class*="imageBig"],div[class*="imageSmall"]{max-width:none!important;background:rgba(255,255,255,0.045)!important;backdrop-filter:blur(13px) saturate(160%)!important;-webkit-backdrop-filter:blur(13px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 28px rgba(0,0,0,0.28)!important;padding:10px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
                div[class*="imageBig"]:hover,div[class*="imageSmall"]:hover{transform:translateY(-5px)!important;box-shadow:0 16px 44px rgba(0,0,0,0.45)!important;border-color:${t.accent}77!important;}
                div[class*="imageBig"] img:not([class*="overlay"]),div[class*="imageSmall"] img:not([class*="overlay"]){border:none!important;border-radius:12px!important;background:transparent!important;}
                [class*="overviewDetails"]{background:linear-gradient(to top,rgba(0,0,0,0.82),rgba(0,0,0,0.12),transparent)!important;border-radius:0 0 12px 12px!important;padding:16px 8px 6px!important;}
                [class*="itemName"]{color:#fff!important;font-weight:700!important;text-shadow:0 1px 3px rgba(0,0,0,0.65)!important;}
                [class*="overviewDetails"] p{color:#e3e8ff!important;}
                [class*="detailsWrapper"]{background:rgba(12,12,20,0.9)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid ${t.accent}55!important;border-radius:12px!important;box-shadow:0 12px 32px rgba(0,0,0,0.5)!important;color:#fff!important;}
                [class*="detailsKey"]{color:#9aa0c0!important;}
                [class*="detailsValue"]{color:#fff!important;}
                [class*="detailsValue"] a,[class*="detailsWrapper"] a{color:${t.accent}!important;}
            `;
            const catDark = darkenHex(t.accent, 0.6);
            cssOut += `
                [class*="catalogContainer"]{background:transparent!important;}
                [class*="catalogContainer"] h1,[class*="catalogContainer"] h2,[class*="catalogContainer"] [class*="bottom-0-2"],[class*="catalogContainer"] [class*="top-0-2"]{color:#fff!important;}
                [class*="catalogContainer"] h3,[class*="catalogContainer"] label,[class*="catalogContainer"] summary,[class*="catalogContainer"] p,[class*="catalogContainer"] [class*="sortByLabel"]{color:#dfe3f0!important;}
                [class*="catalogContainer"] a{color:${t.accent}!important;}
                [class*="catalogContainer"] input[type="text"],[class*="catalogContainer"] select{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;color:#fff!important;padding:5px 9px!important;}
                [class*="catalogContainer"] select option{background:#16161f!important;color:#fff!important;}
                [class*="catalogContainer"] [class*="caret-0-2"]{background:transparent!important;border:none!important;color:#fff!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2,[class*="catalogContainer"] [class*="button-0-2"]{background:linear-gradient(135deg,${t.accent},${catDark})!important;border:none!important;color:#050508!important;border-radius:8px!important;font-weight:700!important;transition:filter 0.15s ease!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2:hover,[class*="catalogContainer"] [class*="button-0-2"]:hover{filter:brightness(1.12)!important;color:#050508!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]{background:rgba(255,255,255,0.04)!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:8px!important;margin-bottom:4px!important;padding:2px 8px!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]:hover{background:${t.accent}1f!important;border-color:${t.accent}66!important;}
                [class*="catalogContainer"] [class*="separator-0-2"]{border-color:rgba(255,255,255,0.1)!important;background:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="divider-right"]{border-color:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="wrapper-0-2"]{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(12px) saturate(150%)!important;-webkit-backdrop-filter:blur(12px) saturate(150%)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;}
            `;
        }
        cs.textContent = cssOut;
    };

    let _tradeWindowInjected = false;
    let _tradesPageInjected = false;
    let _tradesInjecting = false;
    let _tradesClosed = false;
    let _tradesRepaint = null;

    const escHtml = (s) => {
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    };

    const fmtNum = (n) => {
        if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M';
        if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'') + 'K';
        return n.toLocaleString();
    };

    const applyMisc = () => {
        let miscStyle = document.getElementById('pks-misc-style');
        if (!miscStyle) { miscStyle = document.createElement('style'); miscStyle.id = 'pks-misc-style'; document.head.appendChild(miscStyle); }
        const t = getTheme();
        let css = '';
        css += `img[src*="headshot"],img[src*="thumbnail"]{background-color:transparent!important;}[class*="avatarHeadshotContainer"],[class*="avatarContainer"],[class*="avatarWrapper"],[class*="userIconContainer"],[class*="userIcon"]{background-color:transparent!important;}`;
        css += `[class*="iconCard"],[class*="iconCard"] [class*="imageWrapper"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;

        css += `
            [class*="moneyContainer"]{overflow:visible!important;}
            [class*="moneyContainer"] .col-lg-10{flex:0 0 100%!important;max-width:100%!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border-radius:16px!important;padding:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;}
            [class*="moneyContainer"] table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;}
            [class*="moneyContainer"] thead{background:rgba(255,255,255,0.05)!important;border:none!important;}
            [class*="moneyContainer"] thead th{color:#9aa0c0!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0.05em!important;font-size:11px!important;border:none!important;padding:11px 14px!important;}
            [class*="moneyContainer"] thead tr th:first-child{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;}
            [class*="moneyContainer"] thead tr th:last-child{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;}
            [class*="moneyContainer"] tbody tr{transition:background 0.15s ease!important;}
            [class*="moneyContainer"] tbody tr:hover{background:rgba(255,255,255,0.06)!important;}
            [class*="moneyContainer"] tbody td{color:#dfe3f0!important;border:none!important;border-top:1px solid rgba(255,255,255,0.06)!important;padding:12px 14px!important;vertical-align:middle!important;}
            [class*="moneyContainer"] tbody [class*="image-"]{border:1px solid rgba(255,255,255,0.15)!important;}
            [class*="senderName"]{color:#fff!important;font-weight:600!important;}
            [class*="viewDetails"]{color:${t.accent}!important;font-weight:700!important;cursor:pointer!important;}
            [class*="viewDetails"]:hover{text-decoration:underline!important;}
            [class*="tradeTypeActions"]{color:#cfd3e6!important;}
            [class*="tradeTypeActions"] a{color:${t.accent}!important;}
            [class*="tradeTypeActions"] select{background:rgba(255,255,255,0.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;padding:4px 8px!important;}
        `;
        css += `
            [class*="modalWrapper"]{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483647!important;margin:0!important;max-width:92vw!important;background:rgba(20,20,30,0.5)!important;backdrop-filter:blur(26px) saturate(170%)!important;-webkit-backdrop-filter:blur(26px) saturate(170%)!important;border:none!important;border-radius:16px!important;box-shadow:0 20px 60px rgba(0,0,0,0.6)!important;color:#fff!important;overflow:hidden!important;}
            [class*="modalWrapper"] [class*="innerSection"]{background:transparent!important;border:none!important;}
            [class*="modalWrapper"] [class*="title-"]{color:#fff!important;font-weight:700!important;}
            [class*="modalWrapper"] p,[class*="modalWrapper"] span{color:#e6e9f5;}
            [class*="modalWrapper"] a{color:${t.accent}!important;}
            [class*="modalWrapper"] [class*="robuxLabel"]{color:#3fd07e!important;}
            [class*="modalWrapper"] [class*="imageWrapper"]{background:transparent!important;}
            [class*="modalWrapper"] [class*="col-0-2"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:10px!important;}
            [class*="modalWrapper"] [class*="divider-right"],[class*="modalWrapper"] [class*="divider-top"]{border-color:rgba(255,255,255,0.14)!important;}
            [class*="modalWrapper"] [class*="closeButton"]{color:#fff!important;cursor:pointer!important;opacity:0.85!important;}
            [class*="modalWrapper"] [class*="closeButton"]:hover{opacity:1!important;}
            /* Profile friend-action buttons (Unfriend / Message / Chat) → modern glass */
            [class*="actionContainer"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;}
            [class*="actionContainer"] [class*="buttonContainer"]{margin:0!important;}
            [class*="actionContainer"] button{background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px) saturate(160%)!important;-webkit-backdrop-filter:blur(10px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;color:#fff!important;font-weight:600!important;letter-spacing:0.02em!important;padding:8px 18px!important;box-shadow:0 4px 16px rgba(0,0,0,0.25)!important;transition:background 0.16s ease,border-color 0.16s ease,transform 0.14s ease,box-shadow 0.16s ease!important;}
            [class*="actionContainer"] button:hover{background:rgba(255,255,255,0.12)!important;border-color:${t.accent}!important;transform:translateY(-2px)!important;box-shadow:0 8px 24px ${t.accent}55!important;}
            /* Remove the (disabled) Chat button entirely */
            [class*="actionContainer"] [class*="newDisabledCancelButton"]{display:none!important;}
            [class*="actionContainer"] [class*="buttonContainer"]:has([class*="newDisabledCancelButton"]){display:none!important;}
            /* About / Creations tab bar → transparent frame (scoped to profile, beats glassify) */
            [class*="buttonCol"]{background:transparent!important;border:none!important;box-shadow:none!important;}
            [class*="buttonCol"] [class*="vTab-"]{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
            /* Auto-remove the OBC flair icon everywhere */
            .icon-obc,[class*="icon-obc"]{display:none!important;}
        `;
        if (cfg.miscBgUrl?.trim()) {
            const blur = cfg.miscBgBlur ? `blur(${cfg.miscBgBlurAmount ?? 8}px)` : 'none';
            const darkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
            css += `body{background-image:url('${cfg.miscBgUrl.trim()}')!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important;background-repeat:no-repeat!important;}body::before{content:'';position:fixed;inset:0;z-index:0;background:inherit;filter:${blur};pointer-events:none;}body::after{content:'';position:fixed;inset:0;z-index:1;background:rgba(0,0,0,${darkOp});pointer-events:none;}body>*{position:relative;z-index:2;}#pks-panel,#pks-watermark{z-index:2147483647!important;}`;
        }
        if (cfg.miscHideAds) css += `[class*="adWrapper"],[class*="adImage"]{display:none!important;}`;
        if (cfg.miscHideAlert) css += `[class*="alertBg"],[class*="alertText"],[class*="alertLink"],[class*="fakeAlert"]{display:none!important;}`;
        if (cfg.miscHideNavbar) css += `.navbar-wrapper-main,.navbar-0-2-49,nav.navbar,[class*="navBar"]{display:none!important;}.main-0-2-1{padding-top:0!important;}`;
        if (cfg.miscHideMyFeed) css += `[class*="myFeedContainer"]{display:none!important;}`;
        if (cfg.miscHideBlogNews) css += `[class*="blogNewsContainer"]{display:none!important;}`;
        if (cfg.miscCatalogHideSidebar) css += `.divider-right,.col-12.col-md-4.col-lg-2,[class*="sideBar"],[class*="sidebar"]{display:none!important;}.col-12.col-md-8.col-lg-10{flex:0 0 100%!important;max-width:100%!important;}`;
        if (cfg.miscProfileNameAnimate) {
            const c1 = cfg.miscProfileNameColor1 || t.accent;
            const c2 = cfg.miscProfileNameColor2 || '#38bdf8';
            css += `@keyframes pks-name-anim{0%{color:${c1}}50%{color:${c2}}100%{color:${c1}}}.username-0-2-278,[class*="username"],[class*="helloMessage"]{animation:pks-name-anim 3s ease-in-out infinite!important;font-weight:700!important;}`;
        }
        miscStyle.textContent = css;
        applySidebarNavStyle();
        applyPageFrameTransparency();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    const setupHotkeys = () => {
        document.addEventListener('keydown', (e) => {
            if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
            if (document.querySelector('.pks-hk-record.recording')) return;
            const key = e.key.toUpperCase();
            if (cfg.hotkeyToggleGui && key === cfg.hotkeyToggleGui.toUpperCase()) {
                e.preventDefault();
                const panel = document.getElementById('pks-panel');
                if (!panel) {
                    try { GM_setValue(PANEL_HIDDEN_KEY, false); } catch {}
                    buildPanel(state.authInfo || {});
                } else {
                    const willHide = panel.style.display !== 'none';
                    panel.style.display = willHide ? 'none' : '';
                    try { GM_setValue(PANEL_HIDDEN_KEY, willHide); } catch {}
                }
            }
        });
    };

    const buildPanel = (authInfo = {}) => {
        const daysLeft = authInfo.daysLeft;
        const daysStr  = daysLeft === Infinity || daysLeft === undefined ? '\u221e' : String(daysLeft);

        const style = document.createElement('style');
        style.id = 'pks-panel-style';
        style.textContent = `
            /* ── design tokens (deduped surfaces/lines) ───────────────── */
            #pks-panel {
                --pks-surface:#15151d; --pks-surface-2:#101017; --pks-surface-3:#0a0a10;
                --pks-line:#262633; --pks-line-soft:#1d1d28; --pks-radius:9px;
            }
            #pks-panel * { box-sizing:border-box; }
            #pks-panel, #pks-panel input, #pks-panel select, #pks-panel button, #pks-panel span, #pks-panel div, #pks-panel label {
                font-family:var(--pks-font),'Share Tech Mono',monospace;
            }
            @keyframes pks-panel-in { from{opacity:0;transform:translateY(-10px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes pks-fade-in { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
            @keyframes pks-border-flow { 0%{background-position:0% 50%;} 100%{background-position:200% 50%;} }
            #pks-panel [id^="pks-tab-"][style*="block"] { animation:pks-fade-in 0.22s ease; }
            #pks-panel input[type=number], #pks-panel input[type=text], #pks-panel select {
                background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:var(--pks-radius);color:#e6e6f2;font-size:11px;padding:6px 9px;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;outline:none;
            }
            #pks-panel input[type=text]:hover, #pks-panel input[type=number]:hover, #pks-panel select:hover { background:#1a1a24; }
            #pks-panel input[type=color] { padding:2px;width:38px;height:28px;cursor:pointer;background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:7px; }
            #pks-panel input[type=checkbox] { -webkit-appearance:none;appearance:none;width:32px;height:18px;border-radius:9px;background:var(--pks-surface-3);border:1px solid var(--pks-line);cursor:pointer;position:relative;transition:background 0.2s,border-color 0.2s;flex-shrink:0; }
            #pks-panel input[type=checkbox]::after { content:'';position:absolute;top:1px;left:1px;width:14px;height:14px;border-radius:50%;background:#54545f;transition:transform 0.2s,background 0.2s; }
            #pks-panel input[type=checkbox]:checked::after { transform:translateX(14px);background:#fff; }
            #pks-panel select { cursor:pointer; }
            #pks-panel ::-webkit-scrollbar { width:6px;height:6px; }
            #pks-panel ::-webkit-scrollbar-track { background:transparent; }
            #pks-panel ::-webkit-scrollbar-thumb { background:#2c2c3a;border-radius:3px;border:1px solid transparent;background-clip:padding-box; }
            #pks-panel ::-webkit-scrollbar-thumb:hover { background:#3a3a4c; }
            #pks-panel label { cursor:pointer; }
            #pks-tab-bar::-webkit-scrollbar { display:none; }
            .pks-tab-btn { all:unset;padding:11px 5px 9px;font-size:8.5px;font-weight:700;letter-spacing:0.07em;cursor:pointer;color:#5a5a68;transition:color 0.15s,background 0.15s,border-color 0.15s;border-bottom:2px solid transparent;white-space:nowrap;flex:1;text-align:center;position:relative;border-radius:7px 7px 0 0; }
            .pks-tab-btn:hover { color:#a8a8bb;background:rgba(255,255,255,0.03); }
            .pks-tab-btn svg { transition:transform 0.15s; }
            .pks-tab-btn:hover svg { transform:translateY(-1px); }
            .pks-section-title { color:#3a3a48;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;margin:16px 0 9px;font-weight:700;display:flex;align-items:center;gap:8px; }
            .pks-section-title::after { content:'';flex:1;height:1px;background:linear-gradient(90deg,currentColor,transparent);opacity:0.35; }
            .pks-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:8px;padding:1px 0; }
            .pks-row label { color:#b0b0c0;font-size:11px;flex:1; }
            .pks-row .pks-row-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
            .pks-stat { flex:1;background:linear-gradient(160deg,var(--pks-surface),var(--pks-surface-2));border:1px solid var(--pks-line-soft);border-radius:10px;padding:10px 8px;text-align:center;transition:border-color 0.18s,transform 0.18s; }
            .pks-stat:hover { transform:translateY(-1px);border-color:var(--pks-line); }
            .pks-stat-val { color:#00e87a;font-size:21px;font-weight:700;display:block;line-height:1;letter-spacing:-0.02em; }
            .pks-stat-lbl { color:#45454f;font-size:8px;text-transform:uppercase;letter-spacing:0.13em;margin-top:5px;display:block; }
            .pks-action-btn { all:unset;flex:1;text-align:center;padding:9px 0;border-radius:var(--pks-radius);font-size:11px;font-weight:700;letter-spacing:0.08em;cursor:pointer;transition:filter 0.15s,transform 0.12s,box-shadow 0.15s;border:1px solid transparent;position:relative; }
            .pks-action-btn:hover { transform:translateY(-1px); }
            .pks-action-btn:active { transform:scale(0.97)!important; }
            .pks-hk-record { all:unset;padding:5px 13px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--pks-line);background:var(--pks-surface);color:#bcbccc;min-width:52px;text-align:center;transition:border-color 0.15s,color 0.15s,background 0.15s; }
            .pks-hk-record:hover { background:#1c1c26;border-color:#33334a; }
            .pks-hk-record.recording { border-color:#f0a500!important;color:#f0a500!important;animation:pks-blink 0.8s infinite; }
            @keyframes pks-blink { 0%,100%{opacity:1}50%{opacity:0.3} }
            .pks-theme-swatch { all:unset;padding:8px 10px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.04em;cursor:pointer;border:1px solid var(--pks-line-soft);background:var(--pks-surface-2);text-align:center;transition:filter 0.15s,transform 0.15s,box-shadow 0.15s;display:flex;align-items:center;gap:7px; }
            .pks-theme-swatch:hover { filter:brightness(1.3);transform:translateY(-1px); }
            .pks-theme-swatch.active { border-width:1.5px;box-shadow:0 2px 14px -4px currentColor; }
            .pks-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
            .pks-currency-pill { display:flex;align-items:center;gap:5px;background:var(--pks-surface);border:1px solid var(--pks-line-soft);border-radius:7px;padding:3px 9px;font-size:11px; }
            .pks-unit-label { color:#4a4a56;font-size:10px; }
            .pks-win-btn { all:unset;width:11px;height:11px;border-radius:50%;cursor:pointer;display:block;flex-shrink:0;transition:filter 0.15s,transform 0.1s,box-shadow 0.15s;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25); }
            .pks-win-btn:hover { filter:brightness(1.3);transform:scale(1.18); }
            .pks-win-btn:active { transform:scale(0.92); }
            .pks-page-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.09);color:#6a6a7a;margin-bottom:9px; }
            .pks-mode-pill { display:inline-flex;border:1px solid var(--pks-line);border-radius:8px;overflow:hidden;background:var(--pks-surface); }
            .pks-mode-pill button { all:unset;padding:5px 11px;font-size:9.5px;font-weight:700;letter-spacing:0.06em;cursor:pointer;color:#52525e;background:transparent;transition:background 0.15s,color 0.15s;white-space:nowrap; }
            .pks-mode-pill button:hover { color:#9a9aae; }
            .pks-mode-pill button.active { background:#2a2a3a;color:#eaeaf5; }
            .pks-mode-pill button:not(:last-child) { border-right:1px solid var(--pks-line); }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'pks-panel';
        panel.style.cssText = `all:initial;position:fixed;top:18px;right:18px;z-index:2147483647;font-family:var(--pks-font),'Share Tech Mono',monospace;background:#0c0c0e;border:1px solid #2a2a35;border-radius:16px;width:374px;box-shadow:0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04);overflow:hidden;user-select:none;transform-origin:top right;animation:pks-panel-in 0.34s cubic-bezier(0.22,1,0.36,1);`;

        panel.innerHTML = `
            <div id="pks-top-border" style="height:3px;width:100%;background:linear-gradient(90deg,#00e5ff,#a855f7,#fbbf24);background-size:200% 100%;animation:pks-border-flow 6s linear infinite;flex-shrink:0;"></div>
            <div id="pks-header" style="padding:13px 15px;background:#111116;cursor:move;border-bottom:1px solid #1a1a22;position:relative;">
                <div style="display:flex;align-items:center;gap:11px;">
                    <div style="position:relative;flex-shrink:0;width:40px;height:40px;">
                        <div style="position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(from 0deg,rgba(0,232,122,0.5),rgba(0,232,122,0.05),rgba(0,232,122,0.5));opacity:0.55;"></div>
                        <img id="pks-avatar-img" src="" alt="" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(0,232,122,0.35);background:#1a1a2a;object-fit:cover;display:none;">
                        <div id="pks-avatar-anon" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,0.12);background:#1a1a2a;display:none;align-items:center;justify-content:center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                        <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;background:#00e87a;border-radius:50%;border:2px solid #111116;box-shadow:0 0 6px #00e87a;z-index:1;"></div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div id="pks-header-title" style="font-size:9px;letter-spacing:0.24em;text-transform:uppercase;line-height:1;margin-bottom:3px;font-weight:700;">Interium</div>
                        <div id="pks-profile-name" style="color:#fff;font-size:13.5px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:112px;line-height:1.2;">Loading\u2026</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#00e87a;font-size:7.5px;font-weight:700;">R$</span><span id="pks-profile-robux" style="color:#fff;font-weight:700;">\u2014</span></div>
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#f0a500;font-size:7.5px;font-weight:700;">TIX</span><span id="pks-profile-tickets" style="color:#fff;font-weight:700;">\u2014</span></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;margin-left:3px;">
                        <button id="pks-min-btn" class="pks-win-btn" title="Minimise" style="background:#febc2e;"></button>
                        <button id="pks-close-btn" class="pks-win-btn" title="Close" style="background:#ff5f57;"></button>
                    </div>
                </div>
            </div>
            <div id="pks-body">
                <div id="pks-tab-bar" style="display:flex;align-items:flex-end;padding:0 2px;background:#0d0d0f;border-bottom:1px solid #1a1a24;overflow-x:auto;scrollbar-width:none;">
                    <button class="pks-tab-btn active" data-tab="hex"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M2 5l3 2.2L8 2l3 5.2L14 5l-1.3 8H3.3z"/></svg>PROFILE</button>
                    <button class="pks-tab-btn" data-tab="misc"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>MISC</button>
                    <button class="pks-tab-btn" data-tab="settings"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4"/></svg>CFG</button>
                </div>
                <div id="pks-tab-misc" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:4px;"><span class="pks-page-badge">Universal \u2014 all pages</span></div>
                    <div class="pks-section-title">Sidebar Style</div>
                    <div class="pks-row"><label>Enable sidebar styling</label><input type="checkbox" id="cfg-sidebarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-sidebar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-sidebar-blur-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Blur amount</label><div class="pks-row-right"><input type="number" id="cfg-sidebarBlurAmount" min="1" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row" id="pks-sidebar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-sidebarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-sidebarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Navbar Style</div>
                    <div class="pks-row"><label>Enable navbar styling</label><input type="checkbox" id="cfg-navbarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-navbar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-navbar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-navbarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-navbarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Background Image</div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-miscBgUrl" placeholder="https://i.imgur.com/\u2026 (press Enter to apply)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur background</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgBlur"><input type="number" id="cfg-miscBgBlurAmount" min="1" max="30" step="1" style="width:50px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Dark overlay</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgDarkOverlay"><input type="number" id="cfg-miscBgDarkOpacity" min="0" max="95" step="5" style="width:50px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Effects</div>
                    <div class="pks-row"><label>Background effect</label><select id="cfg-effectType" style="width:130px;"><option value="none">None</option><option value="rain">Rain</option><option value="snow">Snow</option><option value="stars">Stars</option><option value="matrix">Matrix</option></select></div>
                    <div class="pks-row"><label>Intensity</label><div class="pks-row-right"><input type="number" id="cfg-effectIntensity" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Speed</label><div class="pks-row-right"><input type="number" id="cfg-effectSpeed" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Colour (blank = auto)</label><div class="pks-row-right"><input type="color" id="cfg-effectColor"><button id="cfg-effectColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-section-title">Other</div>
                    <div class="pks-row"><label>Hide ads</label><input type="checkbox" id="cfg-miscHideAds"></div>
                    <div class="pks-row"><label>Remove alert banner</label><input type="checkbox" id="cfg-miscHideAlert"></div>
                    <div class="pks-row"><label>Hide nav bar entirely</label><input type="checkbox" id="cfg-miscHideNavbar"></div>
                    <div class="pks-row"><label>Transparent footer</label><input type="checkbox" id="cfg-miscFooterTransparent"></div>
                    <div class="pks-section-title">Fonts</div>
                    <div class="pks-row"><label>Page font</label><select id="cfg-miscPageFont" style="width:160px;"><option value="Default (Site Font)">Default (Site Font)</option><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option><option value="Source Sans Pro Light">Source Sans Pro Light</option></select></div>
                    <div class="pks-row"><label>GUI font</label><select id="cfg-miscGuiFont" style="width:160px;"><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option></select></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/home</span></div>
                    <div class="pks-row"><label>Transparent page frames</label><input type="checkbox" id="cfg-miscHomeFramesTransparent"></div>
                    <div class="pks-row"><label>Hide My Feed</label><input type="checkbox" id="cfg-miscHideMyFeed"></div>
                    <div class="pks-row"><label>Hide Blog / News</label><input type="checkbox" id="cfg-miscHideBlogNews"></div>
                    <div class="pks-row"><label>Modern game cards</label><input type="checkbox" id="cfg-miscModernGameCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/games</span></div>
                    <div class="pks-row"><label>Glassify game page</label><input type="checkbox" id="cfg-miscGamesGlassify"></div>
                    <div class="pks-row"><label>Hero backdrop (blurred thumb)</label><input type="checkbox" id="cfg-miscGamesHeroBackdrop"></div>
                    <div class="pks-row"><label>Hide comments</label><input type="checkbox" id="cfg-miscGamesHideComments"></div>
                    <div class="pks-row"><label>Hide recommended games</label><input type="checkbox" id="cfg-miscGamesHideRecommended"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/Catalog.aspx</span></div>
                    <div class="pks-row"><label>Transparent main frame</label><input type="checkbox" id="cfg-miscCatalogFrameTransparent"></div>
                    <div class="pks-row"><label>Hide sidebar</label><input type="checkbox" id="cfg-miscCatalogHideSidebar"></div>
                    <div class="pks-row"><label>Glassify item cards</label><input type="checkbox" id="cfg-miscCatalogItemCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/profile</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscProfileFrameTransparent"></div>
                    <div class="pks-row"><label>Animated username colour</label><input type="checkbox" id="cfg-miscProfileNameAnimate"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 1</label><input type="color" id="cfg-miscProfileNameColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 2</label><input type="color" id="cfg-miscProfileNameColor2"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/friends</span></div>
                    <div class="pks-row"><label>Transparent friend cards</label><input type="checkbox" id="cfg-miscFriendsFrameTransparent"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/My/Avatar</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscAvatarFrameTransparent"></div>
                    <div class="pks-row"><label>Glassify item frames</label><input type="checkbox" id="cfg-avatarGlassify"></div>
                    <div class="pks-row"><label>Avatar background</label><input type="checkbox" id="cfg-avatarBgEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Background blur</label><div class="pks-row-right"><input type="number" id="cfg-avatarBgBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">Watermark</span></div>
                    <div class="pks-row"><label>Show watermark</label><input type="checkbox" id="cfg-watermarkEnabled"></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-watermarkPosition" style="width:130px;"><option value="bottom-left">Bottom Left</option><option value="bottom-right">Bottom Right</option><option value="bottom-center">Bottom Center</option><option value="top-left">Top Left</option><option value="top-right">Top Right</option><option value="top-center">Top Center</option></select></div>
                    <div class="pks-row"><label>Accent colour</label><div class="pks-row-right"><input type="color" id="cfg-watermarkAccentColor"><button id="cfg-watermarkAccentColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-row"><label>Scale</label><div class="pks-row-right"><input type="number" id="cfg-watermarkScale" min="60" max="200" step="10" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Opacity</label><div class="pks-row-right"><input type="number" id="cfg-watermarkOpacity" min="10" max="100" step="5" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Show session time</label><input type="checkbox" id="cfg-watermarkShowTime"></div>
                    <div class="pks-row"><label>Show ping</label><input type="checkbox" id="cfg-watermarkShowPing"></div>
                    <div class="pks-row"><label>Show username</label><input type="checkbox" id="cfg-watermarkShowUser"></div>
                    <div style="margin-top:4px;"><button id="pks-wm-reset-pos" class="pks-action-btn" style="width:100%;background:#16161f;color:#666;border-color:#252535;padding:7px;font-size:10px;">\u21ba Reset watermark position</button></div>
                    <div style="margin-top:8px;"><button id="pks-misc-apply" class="pks-action-btn" style="width:100%;background:#16161f;color:#888;border-color:#2a2a35;padding:8px;">\u21ba Re-apply All Misc Settings</button></div>
                </div>
                <div id="pks-tab-hex" style="padding:12px 13px;display:block;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:6px;"><span class="pks-page-badge">Profile Banner</span></div>
                    <div class="pks-row"><label>Enable banner</label><input type="checkbox" id="cfg-profileBannerEnabled"></div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-profileBannerImage" placeholder="https://i.imgur.com/… (press Enter)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Brightness</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBrightness" min="30" max="150" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Tint colour</label><input type="color" id="cfg-profileBannerTint"></div>
                    <div class="pks-row"><label>Tint opacity</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Gradient tint</label><input type="checkbox" id="cfg-profileBannerTintGradient"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 2</label><input type="color" id="cfg-profileBannerTint2"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Angle</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintAngle" min="0" max="360" step="15" style="width:55px;"><span class="pks-unit-label">°</span></div></div>
                    <div style="padding:8px 10px;background:#13131c;border:1px solid #1e1e2a;border-radius:6px;margin-top:8px;">
                        <div style="color:#444;font-size:9px;line-height:1.85;letter-spacing:0.06em;">Banner settings are saved locally in your browser and shown on <span style="color:#00e87a;">your own</span> profile only.</div>
                    </div>
                </div>
                <div id="pks-tab-settings" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div class="pks-section-title">Theme</div>
                    <div id="pks-theme-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:6px;"></div>
                    <div class="pks-section-title">GUI Scale</div>
                    <div class="pks-row"><label>Panel scale</label><div class="pks-row-right"><input type="number" id="cfg-guiScale" min="70" max="150" step="5" style="width:64px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Keybinds</div>
                    <div class="pks-row"><label>Toggle GUI</label><button class="pks-hk-record" id="pks-hk-record-toggle-gui" data-cfg="hotkeyToggleGui">Insert</button></div>
                    <div class="pks-section-title">Panel Appearance</div>
                    <div class="pks-row"><label>Custom accent colour</label><div class="pks-row-right"><input type="checkbox" id="cfg-customAccentEnabled"><input type="color" id="cfg-customAccentColor"></div></div>
                    <div class="pks-row"><label>Glass / blur panel</label><input type="checkbox" id="cfg-panelGlass"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Opacity</label><div class="pks-row-right"><input type="number" id="cfg-panelOpacity" min="20" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Blur</label><div class="pks-row-right"><input type="number" id="cfg-panelBlur" min="0" max="60" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Corner radius</label><div class="pks-row-right"><input type="number" id="cfg-panelRadius" min="0" max="28" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Gradient background</label><input type="checkbox" id="cfg-panelGradientEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 1</label><input type="color" id="cfg-panelGradientColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 2</label><input type="color" id="cfg-panelGradientColor2"></div>
                    <div class="pks-section-title">Notifications</div>
                    <div class="pks-row"><label>Show notifications</label><input type="checkbox" id="cfg-showNotifications"></div>
                    <div class="pks-row"><label>Duration</label><div class="pks-row-right"><input type="number" id="cfg-notificationDuration" min="1000" max="30000" step="500" style="width:75px;"><span class="pks-unit-label">ms</span></div></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-notificationPosition" style="width:120px;"><option value="top-center">Top Center</option><option value="bottom-center">Bottom Center</option><option value="top-right">Top Right</option><option value="bottom-right">Bottom Right</option></select></div>
                    <div class="pks-section-title">Privacy</div>
                    <div class="pks-row"><label>Anonymous mode</label><input type="checkbox" id="cfg-anonymous"></div>
                    <div class="pks-section-title">Config (JSON)</div>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <button id="pks-cfg-export" class="pks-action-btn" style="background:#16161f;color:#8a8aff;border-color:#252540;padding:8px;">\u2913 Export</button>
                        <button id="pks-cfg-import" class="pks-action-btn" style="background:#16161f;color:#00e87a;border-color:#1e3a2a;padding:8px;">\u2911 Import</button>
                    </div>
                    <textarea id="pks-cfg-json" spellcheck="false" placeholder="Paste config JSON here, then press Import\u2026" style="width:100%;height:84px;resize:vertical;background:#0c0c12;border:1px solid #232330;border-radius:7px;color:#cfd3e6;font-family:var(--pks-font),monospace;font-size:9.5px;line-height:1.5;padding:8px;outline:none;"></textarea>
                    <div style="color:#444;font-size:9px;line-height:1.8;letter-spacing:0.04em;margin-top:5px;">Export copies your settings to the box (and clipboard). Paste a config and Import to load it.</div>
                    <div style="margin-top:10px;border-top:1px solid #1a1a24;padding-top:12px;">
                        <button id="pks-reset-btn" class="pks-action-btn" style="width:100%;background:#1e1414;color:#ff4466;border-color:#ff446633;padding:8px;">\u21ba Reset all settings</button>
                    </div>
                    <div style="margin-top:8px;text-align:center;color:#1e1e2e;font-size:9px;letter-spacing:0.1em;">Interium \u00b7 GUI adapted from Hexium by @CardCounting</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const applyGuiScale = () => {
            const s = (cfg.guiScale ?? 100) / 100;
            panel.style.transform = `scale(${s})`;
            panel.style.transformOrigin = 'top right';
            panel.style.width = '374px';
        };
        applyGuiScale();
        updatePanelGlow();

        const updateLarpPreview = () => {
            const prev = document.getElementById('pks-larp-preview');
            const t = getTheme(), on = !!cfg.larpEnabled;
            if (prev) prev.style.opacity = on ? '1' : '0.45';
            const rob = document.getElementById('pks-larp-prev-robux');
            const tix = document.getElementById('pks-larp-prev-tix');
            if (rob) rob.textContent = formatLarp(cfg.larpRobux);
            if (tix) { tix.textContent = formatLarp(cfg.larpTix); tix.style.setProperty('color', '#f0a500', 'important'); }
            const st = document.getElementById('pks-larp-status');
            if (st) st.innerHTML = `Status: <span style="color:#ccc">${on ? 'Faking balance' : 'Off'}</span>`;
            const dot = document.getElementById('pks-larp-dot');
            if (dot) { dot.style.background = on ? t.accent : '#2e2e3a'; dot.style.boxShadow = on ? `0 0 8px ${t.accent}` : 'none'; }
        };

        const initModePill = (pillId, cfgKey, onChange) => {
            const pill = document.getElementById(pillId);
            if (!pill) return;
            pill.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]); });
            pill.addEventListener('click', (e) => {
                const btn = e.target.closest('button'); if (!btn) return;
                pill.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                cfg[cfgKey] = btn.dataset.mode; saveCfg(cfg); onChange?.(); applySidebarNavStyle(); applySidebarDirect(); updateModeVisibility();
            });
        };

        const updateModeVisibility = () => {
            const sbBlurRow  = document.getElementById('pks-sidebar-blur-row');
            const sbColorRow = document.getElementById('pks-sidebar-colour-row');
            if (sbBlurRow)  sbBlurRow.style.display  = (cfg.sidebarMode === 'blur' || cfg.navbarMode === 'blur') ? '' : 'none';
            if (sbColorRow) sbColorRow.style.display = cfg.sidebarMode === 'colour' ? '' : 'none';
            const nbColorRow = document.getElementById('pks-navbar-colour-row');
            if (nbColorRow) nbColorRow.style.display = cfg.navbarMode === 'colour' ? '' : 'none';
        };

        initModePill('pks-sidebar-mode-pill', 'sidebarMode', null);
        initModePill('pks-navbar-mode-pill', 'navbarMode', null);
        updateModeVisibility();

        const themeGrid = document.getElementById('pks-theme-grid');
        Object.entries(THEMES).forEach(([key, t]) => {
            const btn = document.createElement('button');
            btn.className = 'pks-theme-swatch' + (cfg.theme === key ? ' active' : '');
            btn.style.color = t.accent; btn.style.borderColor = cfg.theme === key ? t.accent : '#1e1e2a';
            btn.innerHTML = `<span class="pks-dot" style="background:${t.accent};box-shadow:0 0 6px ${t.accent}88;"></span>${t.name}`;
            btn.addEventListener('click', () => {
                cfg.theme = key; saveCfg(cfg);
                themeGrid.querySelectorAll('.pks-theme-swatch').forEach((b, i) => { const tk = Object.keys(THEMES)[i]; b.classList.toggle('active', tk === key); b.style.borderColor = tk === key ? THEMES[tk].accent : '#1e1e2a'; });
                applyThemeToDom();
            });
            themeGrid.appendChild(btn);
        });

        const fieldMap = {
            'cfg-showNotifications':'showNotifications','cfg-notificationDuration':'notificationDuration','cfg-notificationPosition':'notificationPosition',
            'cfg-anonymous':'anonymous','cfg-guiScale':'guiScale',
            'cfg-customAccentEnabled':'customAccentEnabled','cfg-customAccentColor':'customAccentColor',
            'cfg-panelGlass':'panelGlass','cfg-panelOpacity':'panelOpacity','cfg-panelBlur':'panelBlur','cfg-panelRadius':'panelRadius',
            'cfg-panelGradientEnabled':'panelGradientEnabled','cfg-panelGradientColor1':'panelGradientColor1','cfg-panelGradientColor2':'panelGradientColor2',
            'cfg-effectType':'effectType','cfg-effectIntensity':'effectIntensity','cfg-effectSpeed':'effectSpeed','cfg-effectColor':'effectColor',
            'cfg-sidebarEnabled':'sidebarEnabled','cfg-sidebarBlurAmount':'sidebarBlurAmount','cfg-sidebarColour':'sidebarColour','cfg-sidebarOpacity':'sidebarOpacity',
            'cfg-navbarEnabled':'navbarEnabled','cfg-navbarColour':'navbarColour','cfg-navbarOpacity':'navbarOpacity',
            'cfg-miscBgUrl':'miscBgUrl','cfg-miscBgBlur':'miscBgBlur','cfg-miscBgBlurAmount':'miscBgBlurAmount',
            'cfg-miscBgDarkOverlay':'miscBgDarkOverlay','cfg-miscBgDarkOpacity':'miscBgDarkOpacity',
            'cfg-miscHideAds':'miscHideAds','cfg-miscHideAlert':'miscHideAlert','cfg-miscHideNavbar':'miscHideNavbar',
            'cfg-miscFooterTransparent':'miscFooterTransparent',
            'cfg-miscPageFont':'miscPageFont','cfg-miscGuiFont':'miscGuiFont',
            'cfg-miscHomeFramesTransparent':'miscHomeFramesTransparent',
            'cfg-miscHideMyFeed':'miscHideMyFeed','cfg-miscHideBlogNews':'miscHideBlogNews',
            'cfg-miscModernGameCards':'miscModernGameCards',
            'cfg-miscGamesGlassify':'miscGamesGlassify','cfg-miscGamesHeroBackdrop':'miscGamesHeroBackdrop',
            'cfg-miscGamesHideComments':'miscGamesHideComments','cfg-miscGamesHideRecommended':'miscGamesHideRecommended',
            'cfg-miscCatalogFrameTransparent':'miscCatalogFrameTransparent',
            'cfg-miscCatalogHideSidebar':'miscCatalogHideSidebar','cfg-miscCatalogItemCards':'miscCatalogItemCards',
            'cfg-miscProfileFrameTransparent':'miscProfileFrameTransparent',
            'cfg-miscProfileNameAnimate':'miscProfileNameAnimate',
            'cfg-miscProfileNameColor1':'miscProfileNameColor1','cfg-miscProfileNameColor2':'miscProfileNameColor2',
            'cfg-miscFriendsFrameTransparent':'miscFriendsFrameTransparent',
            'cfg-miscAvatarFrameTransparent':'miscAvatarFrameTransparent','cfg-avatarGlassify':'avatarGlassify',
            'cfg-avatarBgEnabled':'avatarBgEnabled','cfg-avatarBgBlur':'avatarBgBlur',
            'cfg-tradesBgColor':'tradesBgColor','cfg-tradesOpacity':'tradesOpacity','cfg-tradesBlur':'tradesBlur','cfg-tradesAccent':'tradesAccent',
            'cfg-profileBannerEnabled':'profileBannerEnabled','cfg-profileBannerImage':'profileBannerImage','cfg-profileBannerBlur':'profileBannerBlur','cfg-profileBannerTint':'profileBannerTint','cfg-profileBannerTintOpacity':'profileBannerTintOpacity','cfg-profileBannerBrightness':'profileBannerBrightness','cfg-hideHexBadge':'hideHexBadge','cfg-profileBannerTintGradient':'profileBannerTintGradient','cfg-profileBannerTint2':'profileBannerTint2','cfg-profileBannerTintAngle':'profileBannerTintAngle','cfg-tradesGlassCards':'tradesGlassCards','cfg-tradesMetric':'tradesMetric','cfg-tradesPillOpacity':'tradesPillOpacity',
            'cfg-watermarkEnabled':'watermarkEnabled','cfg-watermarkPosition':'watermarkPosition',
            'cfg-watermarkAccentColor':'watermarkAccentColor','cfg-watermarkScale':'watermarkScale','cfg-watermarkOpacity':'watermarkOpacity',
            'cfg-watermarkShowTime':'watermarkShowTime','cfg-watermarkShowPing':'watermarkShowPing','cfg-watermarkShowUser':'watermarkShowUser',
        };

        const OPTIONAL_COLOR_FIELDS = new Set(['cfg-watermarkAccentColor','cfg-sidebarColour','cfg-navbarColour','cfg-effectColor']);

        const syncFieldsFromCfg = () => {
            for (const [id, key] of Object.entries(fieldMap)) {
                const el = document.getElementById(id); if (!el) continue;
                if (el.type === 'checkbox') el.checked = !!cfg[key];
                else if (el.type === 'color') { if (cfg[key]?.trim()) el.value = cfg[key]; }
                else el.value = cfg[key] ?? '';
            }
            const clickEl  = document.getElementById('pks-r-click-ms');
            const reloadEl = document.getElementById('pks-r-reload-ms');
            if (clickEl) clickEl.value = cfg.clickInterval; if (reloadEl) reloadEl.value = cfg.hardRefreshInterval;
            [['pks-hk-record-toggle-gui','hotkeyToggleGui'],['pks-hk-record-refresher','hotkeyRefresher'],['pks-hk-record-hardrefresh','hotkeyHardRefresh']].forEach(([elId, cfgKey]) => {
                const el = document.getElementById(elId); if (el) el.textContent = cfg[cfgKey] || 'none';
            });
            ['pks-sidebar-mode-pill','pks-navbar-mode-pill'].forEach(pillId => {
                const pill = document.getElementById(pillId);
                const cfgKey = pillId === 'pks-sidebar-mode-pill' ? 'sidebarMode' : 'navbarMode';
                pill?.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]));
            });
            const larpR = document.getElementById('cfg-larpRobux'); if (larpR) larpR.value = cfg.larpRobux ? String(cfg.larpRobux) : '';
            const larpT = document.getElementById('cfg-larpTix');   if (larpT) larpT.value = cfg.larpTix   ? String(cfg.larpTix)   : '';
            const larpE = document.getElementById('cfg-larpEnabled'); if (larpE) larpE.checked = !!cfg.larpEnabled;
            const larpV = document.getElementById('cfg-larpVerify'); if (larpV) larpV.checked = !!cfg.larpVerify;
            updateLarpPreview();
            updateModeVisibility();
        };
        syncFieldsFromCfg();

        const reapplyAll = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); updateModeVisibility();
            applyEffects(); applyAvatarGlass(); applyAvatarBg();
            if (isTradePage()) applyTradeStyle();
            applyTradesCustom();
            applyProfileBannerForPage();
        };

        panel.addEventListener('change', (e) => {
            const el = e.target; const id = el.id; if (!id) return;
            if (id === 'pks-r-click-ms')      { cfg.clickInterval       = Math.max(100,  parseInt(el.value) || 1500); saveCfg(cfg); return; }
            if (id === 'pks-r-reload-ms')     { cfg.hardRefreshInterval = Math.max(5000, parseInt(el.value) || 60000); saveCfg(cfg); return; }
            if (id === 'cfg-miscBgUrl') return;
            const key = fieldMap[id]; if (!key) return;
            if (el.type === 'checkbox')     cfg[key] = el.checked;
            else if (el.type === 'number')  cfg[key] = parseFloat(el.value) || DEFAULTS[key];
            else if (el.type === 'color')   cfg[key] = el.value;
            else                            cfg[key] = el.value || (OPTIONAL_COLOR_FIELDS.has(id) ? '' : DEFAULTS[key]);
            saveCfg(cfg);
            reapplyAll();
            if (id === 'cfg-tradesMetric' && _tradesRepaint) _tradesRepaint();
            if (id === 'cfg-tradesPillOpacity') applyTradesCustom();
            if (id === 'cfg-anonymous') { updateProfileUI(); updateWatermark(); }
            if (id === 'cfg-guiScale') applyGuiScale();
            if (id === 'cfg-miscPageFont') applyPageFont(el.value);
            if (id === 'cfg-miscGuiFont')  applyGuiFont(el.value);
        });

        const bgUrlInput = document.getElementById('cfg-miscBgUrl');
        if (bgUrlInput) {
            bgUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { cfg.miscBgUrl = bgUrlInput.value; saveCfg(cfg); applyMisc(); notify('Background image applied', 'info'); }
            });
        }

        document.getElementById('cfg-watermarkAccentColorClear')?.addEventListener('click', () => {
            cfg.watermarkAccentColor = ''; saveCfg(cfg); applyMisc(); applyCardStyle(); updateWatermark();
            notify('Colour cleared \u2014 using theme default', 'info');
        });

        document.getElementById('cfg-effectColorClear')?.addEventListener('click', () => {
            cfg.effectColor = ''; saveCfg(cfg); applyEffects();
            notify('Effect colour cleared \u2014 using auto', 'info');
        });

        const larpRobuxEl = document.getElementById('cfg-larpRobux');
        const larpTixEl   = document.getElementById('cfg-larpTix');
        const larpToggle  = document.getElementById('cfg-larpEnabled');
        const commitLarp = () => {
            cfg.larpRobux = parseInt((larpRobuxEl?.value || '').replace(/[^\d]/g, '')) || 0;
            cfg.larpTix   = parseInt((larpTixEl?.value   || '').replace(/[^\d]/g, '')) || 0;
            saveCfg(cfg); applyLarp(); updateLarpPreview();
        };
        larpRobuxEl?.addEventListener('input', commitLarp);
        larpTixEl?.addEventListener('input', commitLarp);
        larpToggle?.addEventListener('change', () => {
            cfg.larpEnabled = larpToggle.checked; saveCfg(cfg); applyLarp(); updateLarpPreview();
        });
        const verifyToggle = document.getElementById('cfg-larpVerify');
        verifyToggle?.addEventListener('change', () => {
            cfg.larpVerify = verifyToggle.checked; saveCfg(cfg); applyFakeVerify();
            notify(cfg.larpVerify ? 'Fake verify on' : 'Fake verify off', 'info');
        });

        const _larpCardCache = {};
        const renderLarpFakeList = () => {
            const list = document.getElementById('pks-larp-fakelist');
            if (!list) return;
            list.innerHTML = '';
            const ids = cfg.avatarFakeItems || [];
            if (!ids.length) {
                list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:18px;color:#3a3a48;font-size:10px;">No fake items yet</div>`;
                return;
            }
            ids.forEach(id => {
                const card = document.createElement('div');
                card.style.cssText = `position:relative;background:#16161f;border:1px solid #252535;border-radius:8px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,transform 0.12s;`;
                const qty = Math.max(1, parseInt((cfg.avatarFakeQty || {})[id]) || 1);
                card.innerHTML = `
                    <div style="width:100%;aspect-ratio:1;background:#0a0b0e;overflow:hidden;">
                        <img src="https://www.pekora.zip/thumbs/asset.ashx?assetId=${id}&width=110&height=110&format=png" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.opacity=0;">
                    </div>
                    ${qty > 1 ? `<div style="position:absolute;top:4px;right:4px;background:#00e87a;color:#050508;font-size:9px;font-weight:800;padding:1px 5px;border-radius:9px;">×${qty}</div>` : ''}
                    <div style="padding:3px 4px;font-size:9px;color:#9a9ab0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;" title="Asset ${id}">${escHtml(_larpCardCache[id] || ('#' + id))}</div>
                    <div class="pks-larp-rm" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(120,10,30,0.78);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.06em;opacity:0;transition:opacity 0.15s;">REMOVE</div>
                `;
                const overlay = card.querySelector('.pks-larp-rm');
                card.addEventListener('mouseenter', () => { card.style.borderColor = '#ff4466'; card.style.transform = 'translateY(-2px)'; overlay.style.opacity = '1'; });
                card.addEventListener('mouseleave', () => { card.style.borderColor = '#252535'; card.style.transform = 'none'; overlay.style.opacity = '0'; });
                card.addEventListener('click', () => { removeFakeAvatarItem(id); renderLarpFakeList(); notify('Removed fake item', 'info'); });
                list.appendChild(card);
                if (_larpCardCache[id] === undefined) {
                    _larpCardCache[id] = null;
                    fetchFakeItemData(id).then(d => {
                        if (d?.name) { _larpCardCache[id] = d.name; const lbl = card.querySelector('div[title]'); if (lbl) lbl.textContent = d.name; }
                    });
                }
            });
        };
        document.getElementById('pks-larp-add-item')?.addEventListener('click', async () => {
            const inp = document.getElementById('pks-larp-assetid');
            const qtyInp = document.getElementById('pks-larp-qty');
            const id = (inp?.value || '').replace(/[^\d]/g, '');
            if (!id) { notify('Enter a valid asset ID', 'error'); return; }
            const qty = Math.max(1, parseInt(qtyInp?.value) || 1);
            cfg.avatarFakeQty = Object.assign({}, cfg.avatarFakeQty, { [id]: qty }); saveCfg(cfg);
            const btn = document.getElementById('pks-larp-add-item');
            if (btn) { btn.disabled = true; btn.textContent = '…'; }
            await addFakeAvatarItem(id, true);
            applyCatalogOwned();
            if (btn) { btn.disabled = false; btn.textContent = 'Add'; }
            if (inp) inp.value = '';
            if (qtyInp) qtyInp.value = '1';
            renderLarpFakeList();
            notify('Fake item saved — faked as owned + worn', 'success');
        });
        renderLarpFakeList();

        const TABS = ['hex','misc','settings'];
        panel.querySelectorAll('.pks-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TABS.forEach(t => { const el = document.getElementById(`pks-tab-${t}`); if (el) el.style.display = btn.dataset.tab === t ? 'block' : 'none'; });
                applyThemeToDom();
            });
        });

        document.getElementById('pks-r-start')?.addEventListener('click', startRefresher);
        document.getElementById('pks-r-stop')?.addEventListener('click', stopRefresher);
        document.getElementById('pks-misc-apply')?.addEventListener('click', () => {
            applyMisc(); applyCardStyle(); applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency();
            if (isTradePage()) applyTradeStyle();
            notify('Misc settings applied', 'info');
        });
        document.getElementById('pks-hex-save')?.addEventListener('click', (e) => saveProfileBanner(e.currentTarget));
        document.getElementById('cfg-profileBannerImage')?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            cfg.profileBannerImage = e.target.value.trim();
            if (cfg.profileBannerImage) cfg.profileBannerEnabled = true;
            const en = document.getElementById('cfg-profileBannerEnabled'); if (en) en.checked = cfg.profileBannerEnabled;
            saveCfg(cfg); applyProfileBannerForPage();
            notify('Banner preview updated — press Save to share it', 'info');
        });
        document.getElementById('pks-wm-reset-pos')?.addEventListener('click', () => {
            state.watermark.dragX = null; state.watermark.dragY = null;
            const wm = document.getElementById('pks-watermark');
            if (wm) { wm.style.left = ''; wm.style.top = ''; wm.style.bottom = ''; wm.style.right = ''; wm.style.transform = ''; }
            updateWatermark(); notify('Watermark position reset', 'info');
        });

        panel.querySelectorAll('.pks-hk-record').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-hk-record.recording').forEach(b => {
                    if (b !== btn) { b.classList.remove('recording'); b.textContent = cfg[b.dataset.cfg] || 'none'; }
                });
                if (btn.classList.contains('recording')) { btn.classList.remove('recording'); btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                btn.classList.add('recording'); btn.textContent = '\u2026';
                const onKey = (e) => {
                    e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', onKey, true);
                    btn.classList.remove('recording');
                    if (e.key === 'Escape') { btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    cfg[btn.dataset.cfg] = key; saveCfg(cfg); btn.textContent = key;
                };
                document.addEventListener('keydown', onKey, true);
            });
        });

        document.getElementById('pks-reset-btn')?.addEventListener('click', () => {
            cfg = Object.assign({}, DEFAULTS); saveCfg(cfg); syncFieldsFromCfg();
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects(); applyLarp();
            notify('Settings reset to defaults', 'info');
        });

        const reapplyEverything = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects();
            applyLarp(); applyFakeVerify(); applyTradesCustom(); applyProfileBannerForPage();
        };
        document.getElementById('pks-cfg-export')?.addEventListener('click', () => {
            const json = JSON.stringify(cfg, null, 2);
            const box = document.getElementById('pks-cfg-json'); if (box) box.value = json;
            try { navigator.clipboard?.writeText(json); } catch {}
            notify('Config exported (copied to clipboard)', 'success');
        });
        document.getElementById('pks-cfg-import')?.addEventListener('click', () => {
            const box = document.getElementById('pks-cfg-json');
            const raw = (box?.value || '').trim();
            if (!raw) { notify('Paste config JSON first', 'error'); return; }
            let parsed;
            try { parsed = JSON.parse(raw); } catch { notify('Invalid JSON', 'error'); return; }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { notify('Invalid config', 'error'); return; }
            const next = Object.assign({}, DEFAULTS);
            for (const k of Object.keys(DEFAULTS)) if (k in parsed) next[k] = parsed[k];
            cfg = next; saveCfg(cfg); syncFieldsFromCfg(); reapplyEverything();
            document.getElementById('pks-theme-grid')?.querySelectorAll('.pks-theme-swatch').forEach((b, i) => {
                const tk = Object.keys(THEMES)[i];
                b.classList.toggle('active', tk === cfg.theme);
                b.style.borderColor = tk === cfg.theme ? THEMES[tk].accent : '#1e1e2a';
            });
            notify('Config imported', 'success');
        });

        const body   = document.getElementById('pks-body');
        const minBtn = document.getElementById('pks-min-btn');
        const closeB = document.getElementById('pks-close-btn');
        let minimised = false;
        minBtn?.addEventListener('click', () => {
            minimised = !minimised; body.style.display = minimised ? 'none' : '';
            minBtn.title = minimised ? 'Restore' : 'Minimise';
        });
        closeB?.addEventListener('click', () => {
            panel.style.transition = 'opacity 0.18s,transform 0.18s';
            panel.style.opacity = '0'; panel.style.transform = 'scale(0.94)';
            stopRefresher();
            setTimeout(() => panel.remove(), 200);
        });

        (() => {
            const header = document.getElementById('pks-header');
            let ox = 0, oy = 0, sx = 0, sy = 0;
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
                const onMove = (e2) => { panel.style.right = 'auto'; panel.style.left = `${ox + e2.clientX - sx}px`; panel.style.top = `${oy + e2.clientY - sy}px`; };
                const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            });
        })();

        const trySetAvatar = () => {
            if (!state.profile.id) return;
            const img = document.getElementById('pks-avatar-img');
            const anonEl = document.getElementById('pks-avatar-anon');
            if (!img) return;
            fetch(`https://www.pekora.zip/apisite/thumbnails/v1/users/avatar-headshot?userIds=${state.profile.id}&size=60x60&format=Png`, { credentials:'include' })
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    const url = d?.data?.[0]?.imageUrl;
                    if (url) img.src = url;
                    if (!cfg.anonymous) { img.style.display = 'block'; if (anonEl) anonEl.style.display = 'none'; }
                    else { img.style.display = 'none'; if (anonEl) anonEl.style.display = 'flex'; }
                }).catch(() => { if (!cfg.anonymous) img.style.display = 'block'; });
        };

        applyThemeToDom(); applyMisc(); applyCardStyle(); applyEffects(); applyLarp();
        applySidebarNavStyle(); applySidebarDirect(); injectSidebarLinks(); applyPageFrameTransparency();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
        if (isTradePage()) applyTradeStyle();
        fetchProfile().then(trySetAvatar);
        setInterval(() => fetchProfile().then(trySetAvatar), 30000);
        panelLog('Panel ready. Configure intervals and press START.', 'info');
    };

    const isAvatarPage = () => /\/My\/Avatar/i.test(location.pathname) || /(^|\/)avatar(\/|$)/i.test(location.pathname);
    const AV_WRAP_SEL = '[class*="avatarCardWrapper"]';

    const isCatalogItemPage = () => /\/catalog\/\d+/i.test(location.pathname);
    const currentCatalogAssetId = () => { const m = location.pathname.match(/\/catalog\/(\d+)/i); return m ? m[1] : null; };

    const AVATAR_BG_PRESETS = [
    ];

    const applyAvatarBg = () => {
        let el = document.getElementById('pks-avatar-bg-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-bg-style'; document.head.appendChild(el); }
        if (!cfg.avatarBgEnabled || !cfg.avatarBgImage?.trim()) { el.textContent = ''; return; }
        const url  = cfg.avatarBgImage.trim().replace(/'/g, "\\'");
        const blur = Math.max(0, cfg.avatarBgBlur ?? 0);
        el.textContent = `
            [class*="avatarThumbContainer"]{position:relative!important;overflow:hidden!important;}
            [class*="avatarThumbContainer"]::before{content:'';position:absolute;inset:0;background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}z-index:0;pointer-events:none;}
            [class*="avatarThumbContainer"] > *{position:relative;z-index:1;}
        `;
    };

    const applyAvatarGlass = () => {
        let el = document.getElementById('pks-avatar-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-glass-style'; document.head.appendChild(el); }
        el.textContent = cfg.avatarGlassify
            ? `[class*="avatarCardContainer"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(14px) saturate(160%)!important;-webkit-backdrop-filter:blur(14px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,0.25)!important;overflow:hidden!important;}[class*="avatarCardImage"]{background:transparent!important;}`
            : '';
    };

    const applyAvatarControls = () => {
        if (!isAvatarPage()) return;
        if (!document.getElementById('pks-avatar-controls-style')) {
            const st = document.createElement('style');
            st.id = 'pks-avatar-controls-style';
            st.textContent = `[class*="thumbnail3DButtonContainer"]{display:none!important;}`;
            document.head.appendChild(st);
        }
        const frame = document.querySelector('[class*="avatarThumbContainer"]');
        if (!frame) return;
        frame.style.setProperty('position', 'relative', 'important');
        const pill = [...document.querySelectorAll('[class*="pillToggle"]')].find(p => p.querySelector('input[name="avatarType"]'));
        if (pill && pill.parentElement !== frame) {
            pill.style.setProperty('position', 'absolute', 'important');
            pill.style.setProperty('top', '8px', 'important');
            pill.style.setProperty('right', '8px', 'important');
            pill.style.setProperty('z-index', '30', 'important');
            pill.style.setProperty('margin', '0', 'important');
            frame.appendChild(pill);
        }
    };

    const isFriendsPage = () => /\/friends/i.test(location.pathname);
    const declineFriend = (uid) => postApi(`https://www.pekora.zip/apisite/friends/v1/users/${uid}/decline-friend-request`, {});
    const unfriendUser  = (uid) => postApi(`https://www.pekora.zip/apisite/friends/v1/users/${uid}/unfriend`, {});

    const collectRequestIds = async () => {
        const ids = new Set();
        try {
            let cursor = '';
            for (let i = 0; i < 50; i++) {
                const url = `https://www.pekora.zip/apisite/friends/v1/my/friends/requests?limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
                const r = await apiGet(url);
                if (!r.ok) break;
                const d = await r.json();
                (d.data || []).forEach(u => { const id = u.id || u.userId; if (id) ids.add(String(id)); });
                cursor = d.nextPageCursor;
                if (!cursor) break;
            }
        } catch {}
        if (ids.size === 0) {
            document.querySelectorAll('[class*="manageRequestCard"]').forEach(card => {
                const wrap = card.closest('[class*="friendCardWrapper"]') || card.parentElement;
                const m = wrap?.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/);
                if (m) ids.add(m[1]);
            });
        }
        return [...ids];
    };

    const addFriendRemoveButtons = () => {
        document.querySelectorAll('[class*="friendCardWrapper"]').forEach(wrap => {
            if (wrap.querySelector('[class*="manageRequestCard"]')) return;
            if (wrap.querySelector('.pks-remove-friend')) return; 
            const uid = wrap.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/)?.[1];
            if (!uid) return;
            const host = wrap.querySelector('[class*="friendCard"]') || wrap;
            host.style.position = 'relative';
            const btn = document.createElement('button');
            btn.className = 'pks-remove-friend';
            btn.title = 'Remove friend';
            btn.innerHTML = '✕';
            btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:5;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,0.35);color:#fff;font-size:12px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s,transform 0.12s;';
            let armed = false, tmr = null;
            btn.addEventListener('mouseenter', () => { if (!armed) btn.style.background = 'rgba(216,40,60,0.9)'; });
            btn.addEventListener('mouseleave', () => { if (!armed) btn.style.background = 'rgba(0,0,0,0.35)'; });
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                if (btn.disabled) return;
                if (!armed) { armed = true; btn.style.background = '#d8283c'; btn.style.transform = 'scale(1.15)'; btn.title = 'Click again to remove'; tmr = setTimeout(() => { armed = false; btn.style.transform = 'none'; btn.style.background = 'rgba(0,0,0,0.35)'; btn.title = 'Remove friend'; }, 2500); return; }
                clearTimeout(tmr); armed = false; btn.disabled = true; btn.innerHTML = '…';
                try {
                    const r = await unfriendUser(uid);
                    if (r.ok) { notify('Removed friend', 'success'); wrap.style.transition = 'opacity 0.25s'; wrap.style.opacity = '0'; setTimeout(() => wrap.remove(), 260); }
                    else { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
                } catch { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
            });
            host.appendChild(btn);
        });
    };

    const doBulk = async (btn, label, collectFn, actionFn, noun) => {
        btn.disabled = true; btn.textContent = 'Loading…';
        const ids = await collectFn();
        if (!ids.length) { notify(`No ${noun} found`, 'info'); btn.disabled = false; btn.textContent = label; return; }
        let done = 0, fail = 0;
        for (const id of ids) {
            btn.textContent = `${label} ${done + fail + 1}/${ids.length}…`;
            try { const r = await actionFn(id); r.ok ? done++ : fail++; } catch { fail++; }
            await new Promise(res => setTimeout(res, 120));
        }
        notify(`${label}: ${done} ${noun}${fail ? ` (${fail} failed)` : ''}`, fail ? 'info' : 'success');
        btn.disabled = false; btn.textContent = label;
        setTimeout(() => location.reload(), 700);
    };

    const mkBulkBtn = (id, label, t, runFn) => {
        const btn = document.createElement('button');
        btn.id = id; btn.textContent = label;
        btn.style.cssText = `margin-left:14px;vertical-align:middle;background:${t.accent};color:#050508;border:none;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--pks-font),'Exo 2',sans-serif;letter-spacing:0.04em;box-shadow:0 2px 10px ${t.accent}55;`;
        let armed = false, armTimer = null;
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            if (!armed) { armed = true; btn.textContent = 'Click again to confirm'; armTimer = setTimeout(() => { armed = false; btn.textContent = label; }, 3000); return; }
            clearTimeout(armTimer); armed = false;
            await runFn(btn);
        });
        return btn;
    };

    let _bulkObserver = null;
    const injectFriendsButtons = () => {
        if (!isFriendsPage()) { _bulkObserver?.disconnect(); _bulkObserver = null; return; }
        const tryInject = () => {
            const t = getTheme();
            const heads = [...document.querySelectorAll('h2')];
            const reqH2 = heads.find(h => /FRIEND REQUESTS/i.test(h.textContent || ''));
            if (reqH2 && !reqH2.querySelector('#pks-bulk-ignore'))
                reqH2.appendChild(mkBulkBtn('pks-bulk-ignore', 'Bulk Ignore', t, (b) => doBulk(b, 'Bulk Ignore', collectRequestIds, declineFriend, 'requests')));
            const activeTab = (document.querySelector('[class*="entryActive"]')?.textContent || '').trim().toLowerCase();
            if (activeTab === 'friends') addFriendRemoveButtons();
            return true;
        };
        tryInject();
        if (_bulkObserver) return;
        let scheduled = false;
        _bulkObserver = new MutationObserver(() => {
            if (scheduled) return; scheduled = true;
            requestAnimationFrame(() => { scheduled = false; tryInject(); });
        });
        _bulkObserver.observe(document.body, { childList: true, subtree: true });
    };

    const applyAgeOverride = () => {
        document.querySelectorAll('[class*="ageSpan-"]').forEach(el => {
            if (el.textContent !== '13+') el.textContent = '13+';
        });
    };

    const removeNagAlerts = () => {
        document.querySelectorAll('.alert-pjx.alert-warning').forEach(el => el.remove());
    };

    const monitorDOM = () => {
        if (state.dom.observer) state.dom.observer.disconnect();
        let debounce = null;
        state.dom.observer = new MutationObserver(() => {
            if (debounce) return;
            debounce = setTimeout(() => {
                debounce = null;
                if (cfg.sidebarEnabled) applySidebarDirect();
                injectSidebarLinks();
                applyAgeOverride();
                ensureTradesOverlay();
                removeNagAlerts();
                injectProfileTradeButton();
                applyAvatarControls();
                applyBadges();
                applyProfileBannerForPage();
            }, 60);
        });
        state.dom.observer.observe(document.body, { childList:true, subtree:true });
        applyAgeOverride();
        removeNagAlerts();
        injectProfileTradeButton();
        applyAvatarControls();
        applyBadges();
        applyProfileBannerForPage();
    };

    const monitorNavigation = () => {
        const origPush    = history.pushState;
        const origReplace = history.replaceState;
        const onNav = () => {
            const url = location.href; if (url === state.session.lastUrl) return;
            state.session.lastUrl = url;
            _tradeWindowInjected = false;
            _tradesPageInjected = false;
            _tradesInjecting = false;
            _tradesClosed = false;
            const _trOv = document.getElementById('pks-tr-overlay');
            if (_trOv) { if (_trOv._onKey) document.removeEventListener('keydown', _trOv._onKey); _trOv.remove(); }
            document.getElementById('pks-tr-hide')?.remove();
            twMyItems = []; twTheirItems = [];
            twMySelected = []; twTheirSelected = [];
            twMyPage = 0; twTheirPage = 0;
            twMySearch = ''; twTheirSearch = '';
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            setTimeout(() => {
                applyPageFrameTransparency();
                applySidebarNavStyle();
                applySidebarDirect();
                if (isTradePage()) applyTradeStyle();
                if (isTradeWindow()) injectTradeWindow();
                if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
                if (isAvatarPage()) injectAvatarTools();
                if (isCatalogItemPage()) applyCatalogOwned();
                applyGamesHeroBackdrop();
                injectFriendsButtons();
                if (!isTradeWindow() && cfg.effectType !== 'none' && !document.getElementById('pks-effects-canvas')) applyEffects();
            }, 400);
        };
        history.pushState    = function (...a) { origPush.apply(this, a);    onNav(); };
        history.replaceState = function (...a) { origReplace.apply(this, a); onNav(); };
        window.addEventListener('popstate', onNav);
    };

    const init = () => {
        injectFont();

        const run = (authInfo) => {
            state.authInfo = authInfo || {};
            buildPanel(authInfo);
            try {
                if (GM_getValue(PANEL_HIDDEN_KEY, false)) {
                    const p = document.getElementById('pks-panel');
                    if (p) p.style.display = 'none';
                }
            } catch {}
            buildWatermark();
            setupHotkeys();
            monitorDOM();
            if (isTradeWindow()) injectTradeWindow();
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            if (isAvatarPage()) injectAvatarTools();
            if (isCatalogItemPage()) applyCatalogOwned();
            injectFriendsButtons();
            setTimeout(() => notify('Welcome to Interium!', 'success'), 800);
        };

        const authInfo = {};
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(authInfo));
        else run(authInfo);


        console.log('%cINTERIUM UI', 'color:#a855f7;font-weight:900;font-size:14px;letter-spacing:2px;');
        console.log('[Interium] UI module loaded — trading features live in the trading module.');

        monitorNavigation();
    };

    init();
})();
