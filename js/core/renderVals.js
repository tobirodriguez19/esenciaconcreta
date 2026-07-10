// La función central que arma el objeto de bindings que consume el template
// (todo lo que el HTML lee vía {{ }}). Se mantiene como un solo bloque en vez
// de partirse en varios buildXViewModel por dominio: comparte demasiadas
// variables locales (decoded, catsSorted, code(), spProd, etc.) entre
// secciones como para separarla sin arriesgar un error de threading de
// estado entre archivos.
window.EC = window.EC || {};
EC.core = EC.core || {};
EC.core.renderVals = function (self) {
  return { renderVals: function renderVals() {
    const s=self.state;
    self.updateSeo();
    const cartQtyMap={}; s.cart.forEach(c=>{ cartQtyMap[c.id]=(cartQtyMap[c.id]||0)+c.qty; });
    const dec=p=>{ const scents=self.isScented(p)?p.scents:[]; const stock=self.totalStock(p); const cols=p.colors||[]; const userColor=s.catalogColors[p.id]; const catColor=cols.length?(userColor||cols[0]):null; const catStock=cols.length?self.colorStock(p,catColor):stock; const fp=userColor?self.firstPhoto(p,userColor):self.featuredPhoto(p); const cq=cartQtyMap[p.id]||0; return {...p,scents,stock,featured:!!p.featured,categoryLabel:self.catLabel(p.category),priceFmt:self.fmt(p.price),slotId:self.mainSlot(p.id),img:self.photoUrlFor(p),catImgSlot:fp.slot,catImgSrc:fp.src,cardId:'ec-catcard-'+p.id,cartQty:cq,inCart:cq>0,soldOut:catStock<=0,stockLabel:stock>5?'En stock':(stock>0?('Últimas '+stock+' unidades'):'Sin stock'),stockColor:stock>5?'#6a665e':(stock>0?'#a8742e':'#b3261e'),colorDots:cols.map(n=>({name:n,hex:self.hex(n,p)})),colorBtns:cols.map(n=>({name:n,set:()=>self.setCatColor(p.id,n),style:'width:18px;height:18px;border-radius:999px;cursor:pointer;background:'+self.hex(n,p)+';transition:box-shadow .2s;'+(n===catColor?'box-shadow:inset 0 0 0 2px #fff,0 0 0 2px #232220;':'box-shadow:inset 0 0 0 1px rgba(35,34,32,.18);')}))}; };
    const decoded=s.products.map(dec);
    const byId=id=>decoded.find(p=>p.id===id);

    // hero (featured products in chosen order)
    const orderedFeatured=decoded.filter(p=>p.featured).sort((a,b)=>(a.featuredPos??1e9)-(b.featuredPos??1e9));
    const heroPool=(orderedFeatured.length?orderedFeatured:decoded).map(hp=>{ const aromasTxt=hp.scents.length?hp.scents.join(' · '):(hp.colors||[]).join(' · '); return {name:hp.name,aromasLabel:hp.scents.length?('Aromas: '+aromasTxt):hp.shortDesc,catUpper:(self.catLabel(hp.category)||'').toUpperCase(),priceFmt:hp.priceFmt,slotId:hp.slotId,img:hp.img,open:()=>self.openProduct(hp.id),openSimilar:()=>self.openCatWith(hp.category)}; });
    self._heroLen=heroPool.length;
    const hIdx=heroPool.length?(s.heroIndex%heroPool.length):0;
    const heroSlides=heroPool;
    const heroShift='translateX(-'+(hIdx*100)+'%)';
    const heroDots=heroPool.map((p,i)=>({go:()=>self.setHero(i),style:'width:'+(i===hIdx?'26px':'8px')+';height:8px;border-radius:999px;border:none;cursor:pointer;padding:0;transition:all .35s ease;background:'+(i===hIdx?'#232220':'rgba(35,34,32,.22)')}));
    const heroHasNav=heroPool.length>1;

    const catsSorted=s.categories.slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const categories=catsSorted.map(c=>({id:c.id,label:c.label,slotId:'ec-cat-'+c.id,img:c.photoUrl||self.NO_PHOTO_IMG,open:()=>self.openCatWith(c.id),openNav:()=>{ self.closeNav(); self.openCatWith(c.id); }}));
    // Grid de "Nuestras categorías" del home: "Ver todos" siempre primero.
    const homeCatAll=[{id:'__all__',isAll:true,isCat:false,label:'Ver todos',slotId:'',img:'',open:()=>self.goCatalog()}].concat(categories.map(c=>({...c,isAll:false,isCat:true})));
    const homeCatMobileLimit=12;
    const homeCatShowAll=s.homeCatExpanded||homeCatAll.length<=homeCatMobileLimit;
    const homeCatGridClass='ec-cat-grid'+(homeCatShowAll?' ec-cat-grid-expanded':'');
    const homeCatHasMore=!homeCatShowAll;
    const maxNavCats=8;
    const navCatShowAll=s.navCatExpanded||categories.length<=maxNavCats;
    const navCategories=navCatShowAll?categories:categories.slice(0,maxNavCats);
    if(!navCatShowAll) navCategories.push({id:'__more',label:'Más categorías',open:()=>self.setState({navCatExpanded:true}),openNav:()=>self.setState({navCatExpanded:true})});
    let catalog=s.filter==='todos'?decoded:decoded.filter(p=>p.category===s.filter);
    const catSq=(s.searchQuery||'').trim().toLowerCase();
    if(catSq) catalog=catalog.filter(p=>p.name.toLowerCase().includes(catSq)||(p.shortDesc||'').toLowerCase().includes(catSq)||self.catLabel(p.category).toLowerCase().includes(catSq));
    const allChipDefs=[{id:'todos',label:'Todo'}].concat(catsSorted.map(c=>({id:c.id,label:c.label})));
    const maxChips=8;
    const chipsShowAll=s.chipsExpanded||allChipDefs.length<=maxChips;
    const chipDefs=chipsShowAll?allChipDefs:allChipDefs.slice(0,maxChips-1);
    const chips=chipDefs.map(c=>({id:c.id,label:c.label,style:self.chipStyle(c.id===s.filter),set:()=>self.setFilter(c.id)}));
    if(!chipsShowAll) chips.push({id:'__more',label:'+'+(allChipDefs.length-chipDefs.length),style:self.chipStyle(false),set:()=>self.setState({chipsExpanded:true})});
    decoded.forEach(p=>{ p.open=()=>self.openProduct(p.id); p.quickAdd=()=>self.quickAdd(p.id); });

    // selected product (color photo fallback)
    let selectedProduct=null;
    if(s.productId){ const base=byId(s.productId); if(base){ const hasColors=base.colors.length>0; const col=hasColors?(s.detailColor||base.colors[0]):null; const hasScents=base.scents.length>0; const sc=hasScents?(s.detailScent||base.scents[0]):null; const selStock=self.stockFor(base.id,col,sc); const rawPhotos=self.photosFor(base,col); const photoItems=(rawPhotos.length?rawPhotos:[{id:'placeholder',url:self.NO_PHOTO_IMG}]).map(ph=>({slot:'ec-photo-'+ph.id,src:ph.url,isVideo:false,isPhoto:true})); const videoItems=base.videoUrl?[{slot:'ec-video-'+base.id,src:base.videoUrl,isVideo:true,isPhoto:false}]:[]; const photos=photoItems.concat(videoItems).map((ph,idx)=>{ if(!ph.isVideo) return ph; const active=s.videoActivated&&s.galleryIndex===idx; return {...ph,playing:active,notPlaying:!active,play:()=>self.playVideo(ph.slot)}; }); const gi=Math.min(Math.max(0,s.galleryIndex),photos.length-1); const cur=photos[gi]; self._galLen=photos.length; selectedProduct={...base,selColor:col,selScent:sc,hasScents,hasColors,gallerySlot:cur.slot,gallerySrc:cur.src,galleryPhotos:photos,galleryShift:'translateX(-'+(gi*100)+'%)',galleryHasNav:photos.length>1,galleryDots:photos.map((_,i)=>({style:'width:'+(i===gi?'22px':'7px')+';height:7px;border-radius:999px;border:none;cursor:pointer;padding:0;transition:all .3s ease;background:'+(i===gi?'#232220':'rgba(35,34,32,.25)'),go:()=>self.setGallery(i)})),galleryPrev:()=>self.galleryStep(-1,photos.length),galleryNext:()=>self.galleryStep(1,photos.length),stockLabel:selStock>5?'En stock':(selStock>0?('Últimas '+selStock+' unidades'):'Sin stock'),stockColor:selStock>5?'#6a665e':(selStock>0?'#a8742e':'#b3261e'),addLabel:selStock<=0?'Sin stock':'Agregar al carrito',colorOptions:base.colors.map(n=>{ const cstk=self.colorStock(base,n); return {name:n,hex:self.hex(n,base),cstk,style:self.swatchStyle(self.hex(n,base),n===col)+(cstk<=0?'opacity:.4;':''),set:()=>self.setDetailColor(n)}; }).sort((a,b)=>(a.cstk<=0?1:0)-(b.cstk<=0?1:0)),scentOptions:base.scents.map(n=>{ const st=self.stockFor(base.id,col,n); return {name:n,st,label:st>0?n:(n+' · sin stock'),style:self.scentChipStyle(n===sc)+(st<=0?'opacity:.45;':''),set:()=>self.setDetailScent(n)}; }).sort((a,b)=>(a.st<=0?1:0)-(b.st<=0?1:0))}; } }
    const relatedProducts=selectedProduct?decoded.filter(p=>p.category===selectedProduct.category&&p.id!==selectedProduct.id).slice(0,12).map(p=>({id:p.id,name:p.name,priceFmt:p.priceFmt,slot:p.catImgSlot,src:p.catImgSrc,open:()=>self.openProduct(p.id)})):[];
    const hasRelated=relatedProducts.length>0;

    const lines=self.buildLines();
    const cartCount=self.cartCount();
    const subtotal=lines.reduce((a,l)=>a+l.total,0);
    const shipping=s.fulfillment==='envio'?(s.config.shipping||0):0;
    const total=subtotal+shipping;

    // admin products
    const pq=(s.prodSearch||'').toLowerCase().trim();
    let prodList=decoded;
    if(pq) prodList=prodList.filter(p=>p.name.toLowerCase().includes(pq)||self.catLabel(p.category).toLowerCase().includes(pq));
    if(s.prodCatFilter!=='todas') prodList=prodList.filter(p=>p.category===s.prodCatFilter);
    const adminProducts=prodList.map(p=>{
      const uiKeys=(p.colors&&p.colors.length)?p.colors:[''];
      const missing=uiKeys.filter(c=>self.filledPhotos(p,c||null).length===0).map(c=>c||'general');
      const warn=missing.length>0;
      const isEditing=s.editingProductId===p.id;
      const d=isEditing?s.productDraft:null;
      // While editing, colors/aromas/stock render from the local draft (nothing written to
      // Supabase until "Guardar cambios"). Collapsed/non-editing rows keep reading the live product.
      const vColorEntries=isEditing?d.colors:(p.colors||[]).map(name=>({orig:name,name,hex:(p.colorHex&&p.colorHex[name])||''}));
      const vScents=isEditing?d.scents:p.scents;
      const vCstock=isEditing?d.cstock:p.cstock;
      const vScented=vScents.length>0;
      const vColorKeys=vColorEntries.length?vColorEntries.map(c=>c.name):[''];
      const draftColorTotal=(cs,color,scented)=>{ if(scented){ const m=cs[color]||{}; return vScents.reduce((a,sc)=>a+(m[sc]||0),0); } return (typeof cs[color]==='number')?cs[color]:0; };
      return {...p, scentCount:vScents.length, isEditing, notEditing:!isEditing,
        cardBorder:warn?'rgba(214,138,46,.4)':'rgba(35,34,32,.07)', cardAccent:warn?'#e0922e':'transparent',
        warn, warnMsg: warn?('Falta foto: '+missing.join(', ')):'',
        expanded:!!s.expanded[p.id], expandLabel:s.expanded[p.id]?'Cancelar':'Editar', onToggleExpand:()=>self.toggleExpand(p.id),
        name:isEditing?d.name:p.name, category:isEditing?d.category:p.category, price:isEditing?d.price:p.price, sku:isEditing?d.sku:p.sku,
        shortDesc:isEditing?d.shortDesc:(p.shortDesc||''), longDesc:isEditing?d.longDesc:(p.longDesc||''),
        onName:e=>self.setDraftField('name',e.target.value), onCategory:e=>self.setDraftField('category',e.target.value), onPrice:e=>self.setDraftField('price',e.target.value), onSku:e=>self.setDraftField('sku',e.target.value),
        onShortDesc:e=>self.setDraftField('shortDesc',e.target.value), onLongDesc:e=>self.setDraftField('longDesc',e.target.value),
        hasVideo:!!p.videoUrl, hasNoVideo:!p.videoUrl,
        onUploadVideo:e=>{ const f=e.target.files&&e.target.files[0]; if(f) self.uploadProductVideo(p.id,f); e.target.value=''; },
        onRemoveVideo:()=>self.removeProductVideo(p.id),
        aromaRows:vScents.map(n=>({name:n,onRemove:()=>self.draftRemoveAroma(n)})), aromaNoRows:vScents.length===0,
        aromaResults:s.aromas.filter(a=>vScents.indexOf(a)<0&&a.toLowerCase().includes((s.aromaSearch||'').toLowerCase())).map(a=>({name:a,add:()=>self.draftAssignAroma(a)})),
        aromaCanCreate:!!(s.aromaSearch||'').trim()&&!s.aromas.some(a=>a.toLowerCase()===(s.aromaSearch||'').trim().toLowerCase()),
        onCreateAroma:()=>self.createAndAssignAroma(),
        onDelete:()=>self.deleteProduct(p.id),
        hasColors:(p.colors||[]).length>0,
        onUploadMain:e=>{ const f=e.target.files&&e.target.files[0]; if(f) self.uploadProductPhoto(p.id,null,f); e.target.value=''; },
        onClearMain:()=>self.removeStoragePhoto(p.id,null),
        variantRows:vColorKeys.map((c,ci)=>{ const color=c||null; const entry=vColorEntries[ci];
          return { key:c, name:color||'Stock', hasColor:!!color, noColor:!color, hex:color?(entry&&entry.hex)||self.hex(color,p):'#B6B1A8', scented:vScented, simple:!vScented,
          colorTotal:isEditing?draftColorTotal(vCstock,color||'',vScented):self.colorStock(p,color||''),
          canRemove:!!color&&vColorKeys.length>1, onRename:e=>self.renameDraftColor(ci,e.target.value), onHex:e=>self.setDraftColorHex(ci,e.target.value), onRemove:()=>self.removeDraftColor(ci),
          onMinus:()=>self.draftAdjustVariant(color||'',null,-1), onPlus:()=>self.draftAdjustVariant(color||'',null,1), onInput:e=>self.draftSetVariant(color||'',null,e.target.value),
          photos:(p.photos||[]).filter(ph=>color?ph.color_name===color:!ph.color_name).map(ph=>({id:ph.id,slotId:'ec-vph-'+ph.id,url:ph.url,onRemove:()=>self.removeStoragePhotoById(ph.id),onCrop:()=>self.openCropEditor(ph)})),
          onUploadPhoto:e=>{ const f=e.target.files&&e.target.files[0]; if(f) self.uploadProductPhoto(p.id,color,f); e.target.value=''; },
          onRemovePhoto:()=>self.removeStoragePhoto(p.id,color),
          scentRows:(vScented?vScents:[]).map(sc=>({name:sc,qty:(vCstock[color||'']&&vCstock[color||''][sc])||0,onMinus:()=>self.draftAdjustVariant(color||'',sc,-1),onPlus:()=>self.draftAdjustVariant(color||'',sc,1),onInput:e=>self.draftSetVariant(color||'',sc,e.target.value)})) }; }),
        colorDraft:s.draftColorInput||'', onColorDraft:self.onDraftColorInput, colorHexDraft:s.draftColorHex||'#B6B1A8', onColorHexDraft:self.onDraftColorHex, onAddColor:self.addDraftColor,
        onSaveDraft:self.saveProductDraft, onCancelDraft:()=>self.cancelEditProduct(p.id)
      };
    });
    const catOptions=s.categories.map(c=>({id:c.id,label:c.label}));
    const catsForGroups=s.categories.slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const adminGroups=catsForGroups.map(c=>{
      const items=adminProducts.filter(p=>p.category===c.id).sort((a,b)=>(a.sku||'').localeCompare(b.sku||'',undefined,{numeric:true,sensitivity:'base'})||a.name.localeCompare(b.name));
      const collapsed=s.catGroupCollapsed[c.id]!==false;
      return { id:c.id, label:c.label, count:items.length, products:items, collapsed, expanded:!collapsed,
        onToggle:()=>self.setState({catGroupCollapsed:{...s.catGroupCollapsed,[c.id]:!collapsed}}),
        arrow:collapsed?'▸':'▾' };
    }).filter(g=>g.count>0);

    // admin categories
    const catArrowStyle=dis=>'background:'+(dis?'#F4F2EC':'#F0EEE9')+';color:'+(dis?'#cfc8bc':'#232220')+';border:none;cursor:'+(dis?'default':'pointer')+';border-radius:6px;width:26px;height:18px;font-size:9px;line-height:1;padding:0;transition:all .2s';
    const catsSortedForOrder=s.categories.slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const adminCategories=catsSortedForOrder.map((c,ci,arr)=>({id:c.id,label:c.label,slotId:'ec-cat-'+c.id,img:c.photoUrl||self.NO_PHOTO_IMG,count:s.products.filter(p=>p.category===c.id).length,
      onUp:()=>self.moveCategory(c.id,-1), onDown:()=>self.moveCategory(c.id,1), upStyle:catArrowStyle(ci===0), downStyle:catArrowStyle(ci===arr.length-1),
      onUploadPhoto:e=>{ const f=e.target.files&&e.target.files[0]; if(f) self.uploadCategoryPhoto(c.id,f); e.target.value=''; },
      onRemovePhoto:()=>self.removeCategoryPhoto(c.id),
      onLabel:e=>self.setCatLabel(c.id,e.target.value),onDelete:()=>self.deleteCategory(c.id)}));

    // admin aromas
    const aromaList=s.aromas.map(name=>{ const usedIn=s.products.filter(p=>(p.scents||[]).indexOf(name)>=0).length; const blocked=usedIn>0; const editing=s.aromaEditName===name; return {name,usedIn,editing,viewing:!editing,draft:(s.aromaEdits[name]!=null?s.aromaEdits[name]:name),onEdit:()=>self.startAromaEdit(name),onDraft:e=>self.setAromaEdit(name,e.target.value),onSave:()=>self.saveAromaName(name),onCancel:()=>self.cancelAromaEdit(name),onDelete:()=>self.deleteAroma(name),delStyle:'background:none;border:1px solid rgba(35,34,32,.14);color:'+(blocked?'#d8d2c8':'#b3ada3')+';cursor:'+(blocked?'not-allowed':'pointer')+';border-radius:8px;width:34px;height:34px;font-size:14px;flex-shrink:0;transition:all .2s;display:flex;align-items:center;justify-content:center'+(blocked?'':';')}; });

    // sales filtering/sorting
    const code=seq=>'#'+String(seq).padStart(2,'0');
    let salesView=s.sales.slice();
    const q=(s.vSearch||'').trim().toLowerCase();
    if(q) salesView=salesView.filter(o=>o.customer.toLowerCase().includes(q)||code(o.seq).toLowerCase().includes(q)||String(o.seq).includes(q));
    if(s.vPay!=='todos') salesView=salesView.filter(o=>o.payStatus===s.vPay);
    if(s.vDel!=='todos') salesView=salesView.filter(o=>o.delivery===s.vDel);
    if(s.vType!=='todos') salesView=salesView.filter(o=>o.channel===s.vType);
    if(s.vSort==='recientes') salesView.sort((a,b)=>b.seq-a.seq);
    else if(s.vSort==='antiguas') salesView.sort((a,b)=>a.seq-b.seq);
    else if(s.vSort==='mayor') salesView.sort((a,b)=>b.total-a.total);
    else if(s.vSort==='menor') salesView.sort((a,b)=>a.total-b.total);
    const adminSales=salesView.map(o=>({ id:o.seq, data:{code:code(o.seq),channel:o.channel,customer:o.customer,totalFmt:self.fmt(o.total),date:o.date,payStatus:o.payStatus,delivery:o.delivery,method:o.method,cancelled:o.cancelled,items:o.items}, onField:(field,val)=>self.setSaleField(o.seq,field,val), onDetail:()=>self.openSaleDetail(o.seq), onCancel:()=>self.cancelSale(o.seq), onUndo:()=>self.undoCancel(o.seq), onEditItems:()=>self.openSaleEdit(o.seq) }));
    const unseen=s.sales.filter(o=>!o.seen&&!o.cancelled).length;

    // sale detail
    const sd=s.saleDetailSeq!=null?s.sales.find(x=>x.seq===s.saleDetailSeq):null;
    let saleDetail={code:'',channelLabel:'',channelStyle:'',date:'',customer:'',items:[],totalFmt:'',hasAddress:false,address:'',hasNotes:false,notes:''};
    if(sd){ saleDetail={code:code(sd.seq),channelLabel:sd.channel==='online'?'Online':'Presencial',channelStyle:'display:inline-flex;align-items:center;font-size:11px;letter-spacing:.04em;border-radius:999px;padding:4px 11px;'+(sd.channel==='online'?'background:#E1E7EE;color:#3a5878':'background:#E6E2D8;color:#6a5c3e'),date:sd.date,customer:sd.customer,totalFmt:self.fmt(sd.total),hasAddress:!!sd.address,address:sd.address,hasNotes:!!sd.notes,notes:sd.notes,items:sd.items.map(i=>({name:i.name+(i.scent?(' '+i.scent):''),colorName:i.color||'',colorHex:i.color?self.hex(i.color,self.getProduct(i.id)):'',hasColor:!!i.color,qty:i.qty,unitFmt:self.fmt(i.price),subFmt:self.fmt(i.price*i.qty),slotId:'ec-prod-'+i.id,img:self.photoUrlFor(self.getProduct(i.id)||{id:i.id})}))}; }

    // sale builder (popup)
    const sp=s.salePick; const spProd=sp.id?self.getProduct(sp.id):null; const spScented=spProd?self.isScented(spProd):false;
    const spColor=sp.color||(spProd?(spProd.colors[0]||''):'');
    const spScent=spScented?(sp.scent||spProd.scents[0]):null;
    const sq=(s.saleSearch||'').toLowerCase().trim();
    const saleProductCards=decoded.filter(p=>!sq||p.name.toLowerCase().includes(sq)||self.catLabel(p.category).toLowerCase().includes(sq)).map(p=>({id:p.id,name:p.name,priceFmt:p.priceFmt,categoryLabel:p.categoryLabel,slotId:p.slotId,img:p.img,stock:p.stock,soldOut:p.stock<=0,pick:()=>self.pickSaleProduct(p.id)}));
    const salePickColors=spProd?(spProd.colors||[]).map(c=>({id:c,label:c,stock:self.colorStock(spProd,c),hex:self.hex(c,spProd),selected:c===spColor,ring:c===spColor?'2px':'0px',pick:()=>self.onSalePickColorVal(c)})):[];
    const salePickScents=spScented?spProd.scents.map(c=>({id:c,label:c+' ('+self.stockFor(spProd.id,spColor,c)+')'})):[];
    const spAvail=spProd?self.stockFor(sp.id,spColor,spScented?spScent:null):0;
    const saleItems=s.saleDraft.items.map((it,idx)=>{ const p=self.getProduct(it.id); return {name:p.name,meta:(it.scent||''),colorName:it.color||'',colorHex:it.color?self.hex(it.color,p):'',hasColor:!!it.color,qty:it.qty,slotId:'ec-prod-'+it.id,img:self.photoUrlFor(p),lineFmt:self.fmt(p.price*it.qty),remove:()=>self.removeSaleItem(idx)}; });
    const saleTotal=s.saleDraft.items.reduce((a,it)=>{ const p=self.getProduct(it.id); return a+p.price*it.qty; },0);

    // sale edit (existing sale)
    const seEditing=s.saleEditSeq!=null;
    const seSale=seEditing?s.sales.find(x=>x.seq===s.saleEditSeq):null;
    const saleEditItems=s.saleEditItems.map((it,idx)=>{ const p=self.getProduct(it.id); return {name:p.name,meta:(it.scent||''),colorName:it.color||'',colorHex:it.color?self.hex(it.color,p):'',hasColor:!!it.color,qty:it.qty,slotId:'ec-prod-'+it.id,img:self.photoUrlFor(p),lineFmt:self.fmt(p.price*it.qty),remove:()=>self.removeSaleEditItem(idx),inc:()=>self.setSaleEditQty(idx,1),dec:()=>self.setSaleEditQty(idx,-1)}; });
    const saleEditTotal=s.saleEditItems.reduce((a,it)=>{ const p=self.getProduct(it.id); return a+p.price*it.qty; },0);

    // El Oficio (home) — numbered steps
    const oficio={eyebrow:s.oficio.eyebrow,title:s.oficio.title,body:s.oficio.body,steps:s.oficio.steps.map((st,i)=>({title:st.title,desc:st.desc,n:String(i+1).padStart(2,'0')}))};
    const oficioImg=s.oficioPhotoUrl||self.NO_PHOTO_IMG;

    // destacados
    const starStyle=on=>'background:'+(on?'#232220':'#fff')+';color:'+(on?'#e7c66b':'#b8b2a8')+';border:1px solid '+(on?'#232220':'rgba(35,34,32,.16)')+';cursor:pointer;border-radius:999px;width:40px;height:40px;font-size:18px;flex-shrink:0;transition:all .2s';
    const arrowStyle=dis=>'background:'+(dis?'#F4F2EC':'#F0EEE9')+';color:'+(dis?'#cfc8bc':'#232220')+';border:none;cursor:'+(dis?'default':'pointer')+';border-radius:6px;width:26px;height:18px;font-size:9px;line-height:1;padding:0;transition:all .2s';
    const featuredItems=decoded.filter(p=>p.featured).sort((a,b)=>(a.featuredPos??1e9)-(b.featuredPos??1e9)).map((p,i,arr)=>({...p,salesUnits:self.salesUnits(p.id),pos:i+1,starIcon:'★',starStyle:starStyle(true),onFeatured:()=>self.toggleFeatured(p.id),onUp:()=>self.moveFeatured(p.id,-1),onDown:()=>self.moveFeatured(p.id,1),upStyle:arrowStyle(i===0),downStyle:arrowStyle(i===arr.length-1)}));
    const restItems=decoded.filter(p=>!p.featured).map(p=>({...p,salesUnits:self.salesUnits(p.id)})).sort((a,b)=>b.salesUnits-a.salesUnits).map(p=>({...p,starIcon:'☆',starStyle:starStyle(false),onFeatured:()=>self.toggleFeatured(p.id)}));

    const tabsDef=[['productos','Productos'],['categorias','Categorías'],['aromas','Aromas'],['ventas','Ventas'],['destacados','Destacados'],['inicio','Inicio (El Oficio)']];
    const adminTabs=tabsDef.map(([k,l])=>({key:k,label:l,go:()=>self.goAdminTab(k),style:self.tabStyle(s.adminTab===k),showBadge:k==='ventas'&&unseen>0,badge:unseen}));
    const cf=s.confirm;

    return {
      isAdmin:s.view==='admin', isStore:s.view!=='admin',
      adminAuthed:s.view==='admin'&&s.authRole==='admin', adminNeedsLogin:s.view==='admin'&&s.authRole!=='admin',
      authEmail:s.authEmail, authPassword:s.authPassword, authError:s.authError, onAuthEmail:self.onAuthEmail, onAuthPassword:self.onAuthPassword, doLogin:self.doLogin, doLogout:self.doLogout,
      isHome:s.view==='home', isCatalog:s.view==='catalog', isProduct:s.view==='product'&&!!selectedProduct, isCheckout:s.view==='checkout', isConfirm:s.view==='confirm'&&!!s.order, isAbout:s.view==='about', isContact:s.view==='contact', isNotFound:s.view==='notfound',
      cfg:s.config,
      goHome:self.goHome, goCatalog:self.goCatalog, goAdmin:self.goAdmin, verProceso:self.verProceso, verContacto:self.verContacto,
      openCart:self.openCart, closeCart:self.closeCart, cartCount, cartBumpAnim:(s.cartBump%2===0?'ecBumpA':'ecBumpB')+' .45s ease',
      navMounted:s.navMounted, openNav:self.openNav, closeNav:self.closeNav, navHome:self.navHome, navCatalog:self.navCatalog, navProceso:self.navProceso, navContacto:self.navContacto, goSearch:self.goSearch,
      heroSlides, heroShift, heroDots, heroHasNav, heroPrev:self.heroPrev, heroNext:self.heroNext, categories, navCategories,
      homeCatTiles:homeCatAll, homeCatGridClass, homeCatHasMore, onLoadMoreCats:()=>self.setState({homeCatExpanded:true}),
      catalogProducts:catalog, catalogCount:catalog.length, catalogNoResults:catalog.length===0, searchQuery:s.searchQuery, onSearchQuery:e=>self.setState({searchQuery:e.target.value}), chips, backToCatalog:self.backToCatalog, selectedProduct, relatedProducts, hasRelated, detailQty:s.detailQty, incDetail:self.incDetail, decDetail:self.decDetail, addDetail:self.addDetail,
      cartLines:lines, cartEmpty:cartCount===0, cartHasItems:cartCount>0, cartSubtotalFmt:self.fmt(subtotal), cartTotalFmt:self.fmt(total),
      shippingFmt:self.fmt(s.config.shipping||0), shippingLabel:shipping>0?self.fmt(shipping):'Gratis',
      cartMounted:s.cartMounted, overlayAnim:s.cartOpen?'ecOverlayIn .3s ease both':'ecOverlayIn .3s ease both reverse', drawerAnim:s.cartOpen?'ecSlideIn .35s cubic-bezier(.4,0,.1,1) both':'ecSlideOut .3s ease both',
      goCatalogFromCart:self.goCatalogFromCart, goCheckout:self.goCheckout,
      form:s.form, onNombre:self.onNombre, onApellido:self.onApellido, onTelefono:self.onTelefono, onEmail:self.onEmail, onDireccion:self.onDireccion,
      isRetiro:s.fulfillment==='retiro', isEnvio:s.fulfillment==='envio', isTransfer:s.payment==='transferencia', isEfectivo:s.payment==='efectivo',
      retiroCardStyle:self.fulCardStyle(s.fulfillment==='retiro'), envioCardStyle:self.fulCardStyle(s.fulfillment==='envio'), transferCardStyle:self.fulCardStyle(s.payment==='transferencia'), efectivoCardStyle:self.fulCardStyle(s.payment==='efectivo'),
      selRetiro:self.selRetiro, selEnvio:self.selEnvio, selTransfer:self.selTransfer, selEfectivo:self.selEfectivo,
      placeOrder:self.placeOrder, order:s.order, sendReceipt:self.sendReceipt, backToShop:self.backToShop,
      adminTabs, tabProductos:s.adminTab==='productos', tabCategorias:s.adminTab==='categorias', tabAromas:s.adminTab==='aromas', tabVentas:s.adminTab==='ventas', tabDestacados:s.adminTab==='destacados', tabInicio:s.adminTab==='inicio',
      oficio,
      oficioImg,
      waLink:'https://wa.me/'+String((s.config&&s.config.whatsapp)||'').replace(/\D/g,''),
      instagramUrl:'https://www.instagram.com/esencia_concreta_/',
      oficioEditing:s.oficioEditing, oficioNotEditing:!s.oficioEditing, startEditOficio:self.startEditOficio, cancelEditOficio:self.cancelEditOficio, saveOficioDraft:self.saveOficioDraft,
      ofEyebrow:s.oficioEditing?s.oficioDraft.eyebrow:s.oficio.eyebrow,
      ofTitle:s.oficioEditing?s.oficioDraft.title:s.oficio.title,
      ofBody:s.oficioEditing?s.oficioDraft.body:s.oficio.body,
      onOfEyebrow:e=>self.setOficioDraftField('eyebrow',e.target.value), onOfTitle:e=>self.setOficioDraftField('title',e.target.value), onOfBody:e=>self.setOficioDraftField('body',e.target.value),
      ofSteps:(s.oficioEditing?s.oficioDraft.steps:s.oficio.steps).map((st,i)=>({title:st.title,desc:st.desc,n:String(i+1).padStart(2,'0'),onTitle:e=>self.setOficioDraftStep(i,'title',e.target.value),onDesc:e=>self.setOficioDraftStep(i,'desc',e.target.value)})),
      onUploadOficioPhoto:e=>{ const f=e.target.files&&e.target.files[0]; if(f) self.uploadOficioPhoto(f); e.target.value=''; },
      onRemoveOficioPhoto:()=>self.removeOficioPhoto(),
      saleEditOpen:seEditing, saleEditItems, saleEditHasItems:s.saleEditItems.length>0, saleEditTotalFmt:self.fmt(saleEditTotal), saleEditCode:seSale?code(seSale.seq):'', saleEditCustomer:seSale?seSale.customer:'', closeSaleEdit:self.closeSaleEdit, addSaleEditItem:self.addSaleEditItem, saveSaleEdit:self.saveSaleEdit,
      adminProducts, adminGroups, adminProductCount:s.products.length, catOptions,
      prodSearch:s.prodSearch, onProdSearch:e=>self.setState({prodSearch:e.target.value}),
      prodCatFilter:s.prodCatFilter, onProdCatFilter:e=>self.setState({prodCatFilter:e.target.value}),
      prodCatOptions:[{id:'todas',label:'Todas las categorías'}].concat(s.categories.map(c=>({id:c.id,label:c.label}))),
      prodAdding:s.prodAdding, prodAddBtnLabel:s.prodAdding?'Cerrar':'+ Agregar producto', prodAddBtnStyle:self.pillBtn(s.prodAdding),
      np:s.newProduct, onNPName:e=>self.setNP({name:e.target.value}), onNPPrice:e=>self.setNP({price:e.target.value}), onNPCat:e=>self.setNP({category:e.target.value}), onNPStock:e=>self.setNP({stock:e.target.value}), onNPDesc:e=>self.setNP({shortDesc:e.target.value}), onNPSku:e=>self.setNP({sku:e.target.value}), toggleProdAdding:self.toggleProdAdding, addProduct:self.addProduct,
      onNPColorDraft:e=>self.setNP({colorDraft:e.target.value}), onNPColorHex:e=>self.setNP({colorDraftHex:e.target.value}), addNPColor:self.addNPColor,
      npColorChips:s.newProduct.colorsList.map((c,i)=>({name:c.name,hex:c.hex,onRemove:()=>self.removeNPColor(i)})),
      onNPAromaDraft:e=>self.setNP({aromaDraft:e.target.value}), addNPAroma:()=>self.addNPAroma(),
      npAromaChips:s.newProduct.aromasList.map((a,i)=>({name:a,onRemove:()=>self.removeNPAroma(i)})),
      npAromaResults:s.aromas.filter(a=>s.newProduct.aromasList.indexOf(a)<0&&a.toLowerCase().includes((s.newProduct.aromaDraft||'').toLowerCase())).map(a=>({name:a,add:()=>self.addNPAroma(a)})),
      npAromaCanCreate:!!(s.newProduct.aromaDraft||'').trim()&&!s.aromas.some(a=>a.toLowerCase()===(s.newProduct.aromaDraft||'').trim().toLowerCase()),
      onNPPhoto:self.onNPPhoto,
      npStockSimple:self.npComboList(s.newProduct).length<=1,
      npStockGrid:self.npComboList(s.newProduct).length>1?self.npComboList(s.newProduct).map(cb=>{ const key=cb.color+'|'+(cb.aroma||''); const label=(cb.color||'General')+(cb.aroma?(' · '+cb.aroma):''); return {label,qty:s.newProduct.stockMap[key]||'',onChange:e=>self.setNPStockCombo(key,e.target.value)}; }):[],
      aromaSearch:s.aromaSearch||'', onAromaSearch:self.onAromaSearch,
      hasInactiveProducts:s.inactiveProducts.length>0, inactiveProductsOpen:s.inactiveProductsOpen, inactiveProductsArrow:s.inactiveProductsOpen?'▾':'▸', toggleInactiveProducts:self.toggleInactiveProducts,
      inactiveProducts:s.inactiveProducts.map(p=>({name:p.name,sku:p.sku||'sin SKU',onReactivate:()=>self.reactivateProduct(p.id)})),
      hasInactiveCategories:s.inactiveCategories.length>0, inactiveCategoriesOpen:s.inactiveCategoriesOpen, inactiveCategoriesArrow:s.inactiveCategoriesOpen?'▾':'▸', toggleInactiveCategories:self.toggleInactiveCategories,
      inactiveCategories:s.inactiveCategories.map(c=>({label:c.label,onReactivate:()=>self.reactivateCategory(c.id)})),
      hasInactiveAromas:s.inactiveAromas.length>0, inactiveAromasOpen:s.inactiveAromasOpen, inactiveAromasArrow:s.inactiveAromasOpen?'▾':'▸', toggleInactiveAromas:self.toggleInactiveAromas,
      inactiveAromasList:s.inactiveAromas.map(name=>({name,onReactivate:()=>self.reactivateAroma(name)})),
      cropModalOpen:!!s.cropModal, cropUrl:s.cropModal?s.cropModal.url:'', cropHasOriginal:!!(s.cropModal&&s.cropModal.originalUrl),
      cropRect:s.cropModal?{left:s.cropModal.rect.x+'%',top:s.cropModal.rect.y+'%',width:s.cropModal.rect.w+'%',height:s.cropModal.rect.h+'%'}:{left:'0%',top:'0%',width:'0%',height:'0%'},
      closeCropEditor:self.closeCropEditor, applyCrop:self.applyCrop, restoreOriginal:self.restoreOriginal,
      adminCategories, adminCatCount:s.categories.length, catAdding:s.catAdding, catAddBtnLabel:s.catAdding?'Cerrar':'+ Agregar categoría', catAddBtnStyle:self.pillBtn(s.catAdding), ncat:s.newCat, onNCatLabel:e=>self.setNCat({label:e.target.value}), toggleCatAdding:self.toggleCatAdding, addCategory:self.addCategory,
      aromaList, aromaCount:s.aromas.length, newAroma:s.newAroma, onNewAroma:self.setNewAroma, addAroma:self.addAroma,
      cfgEditing:s.cfgEditing, cfgNotEditing:!s.cfgEditing, startEditCfg:self.startEditCfg, cancelEditCfg:self.cancelEditCfg, saveCfgDraft:self.saveCfgDraft,
      cfgShippingFmt:self.fmt(s.config.shipping||0),
      cfgDraftShipping:s.cfgEditing?s.cfgDraft.shipping:'', onCfgDraftShipping:e=>self.setCfgDraftField('shipping',e.target.value),
      cfgDraftTitular:s.cfgEditing?s.cfgDraft.titular:'', onCfgDraftTitular:e=>self.setCfgDraftField('titular',e.target.value),
      cfgDraftAlias:s.cfgEditing?s.cfgDraft.alias:'', onCfgDraftAlias:e=>self.setCfgDraftField('alias',e.target.value),
      cfgDraftWhatsapp:s.cfgEditing?s.cfgDraft.whatsapp:'', onCfgDraftWhatsapp:e=>self.setCfgDraftField('whatsapp',e.target.value),
      cfgDraftCbu:s.cfgEditing?s.cfgDraft.cbu:'', onCfgDraftCbu:e=>self.setCfgDraftField('cbu',e.target.value),
      cfgDraftNotifyEmails:s.cfgEditing?s.cfgDraft.notifyEmails:'', onCfgDraftNotifyEmails:e=>self.setCfgDraftField('notifyEmails',e.target.value),
      adminSales, salesTotal:s.sales.length, hasSales:adminSales.length>0, noSales:adminSales.length===0,
      saleAdding:s.saleAdding, saleAddBtnLabel:s.saleAdding?'Cerrar':'+ Registrar venta presencial', saleAddBtnStyle:self.pillBtn(s.saleAdding), toggleSaleAdding:self.toggleSaleAdding,
      salePick:sp, spActive:!!spProd, spInactive:!spProd, spName:spProd?spProd.name:'—', spPriceFmt:spProd?spProd.priceFmt:'—', spImg:spProd?self.photoUrlFor(spProd):'', spSlot:spProd?('ec-prod-'+spProd.id):'ec-sale-pick',
      saleProductCards, saleSearch:s.saleSearch, onSaleSearch:e=>self.setState({saleSearch:e.target.value}), salePickHasColors:salePickColors.length>1, salePickColors, salePickHasScents:spScented, salePickScents, salePickColorVal:spColor, salePickScentVal:spScent, salePickQty:sp.qty,
      salePickStockLabel:spProd?('Disponible: '+spAvail+' de la variante elegida'):'—',
      clearSalePick:self.clearSalePick, onSalePickScent:self.onSalePickScent, onSalePickQty:self.onSalePickQty, incSalePickQty:self.incSalePickQty, decSalePickQty:self.decSalePickQty, addSaleItem:self.addSaleItem,
      saleItems, saleHasItems:s.saleDraft.items.length>0, saleTotalFmt:self.fmt(saleTotal), saleDraft:s.saleDraft,
      onSaleNombre:e=>self.setSaleDraft({nombre:e.target.value}), onSaleApellido:e=>self.setSaleDraft({apellido:e.target.value}),
      onSalePayStatus:e=>self.setSaleDraft({payStatus:e.target.value}), onSaleMethod:e=>self.setSaleDraft({method:e.target.value}), onSaleDelivery:e=>self.setSaleDraft({delivery:e.target.value}),
      registerSale:self.registerSale, closeSaleAdding:self.toggleSaleAdding,
      vSearch:s.vSearch, vPay:s.vPay, vDel:s.vDel, vType:s.vType, vSort:s.vSort, onVSearch:self.onVSearch, onVPay:self.onVPay, onVDel:self.onVDel, onVType:self.onVType, onVSort:self.onVSort,
      saleDetailOpen:!!sd, saleDetail, closeSaleDetail:self.closeSaleDetail,
      destacados:featuredItems, featuredItems, featuredCount:featuredItems.length, noFeatured:featuredItems.length===0, restItems,
      confirmOpen:!!cf, confirmData:cf?{title:cf.title,message:cf.message,yesLabel:cf.yesLabel||'Confirmar',yesStyle:(cf.danger?'background:#b3261e;color:#fff;':'background:#232220;color:#FAF9F6;')+'border:none;cursor:pointer;border-radius:999px;padding:11px 24px;font-size:14px'}:{title:'',message:'',yesLabel:'',yesStyle:''}, confirmYes:self.confirmYes, confirmNo:self.confirmNo,
      stop:self.stop, toast:s.toast
    };
  } };
};
