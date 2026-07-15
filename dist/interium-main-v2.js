/* Interium main runtime — direct Trading Interium build.
 * Unofficial community software; not affiliated with Pekora.
 */
/* INTERIUM_MAIN */
console.info('[Interium] Direct trading runtime loaded.');

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
				let hit = koroFindPlayer(uid);
				// A remote loader starts later than a document-start userscript. If the
				// first lookup used a stale cache, refresh once before falling back.
				if (!hit) {
					try {
						await loadKoromonsLb(true);
						hit = koroFindPlayer(uid);
					} catch (_e) {}
				}
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
    try {
        const _pcsCfg = JSON.parse(GM_getValue('pcs_cfg_v1', 'null') || 'null');
        if (_pcsCfg && _pcsCfg.collectiblesSuite === false) return;
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
    if (!userId) return;

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
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBootWatcher, { once: true });
    else startBootWatcher();
})();
