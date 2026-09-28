/* Equipo y defensa inicial: hechos de las versiones de 2014. */
const Equipment=(()=>{'use strict';
const D=EquipmentData,item=id=>D.items[id],cid=s=>s.classId||'bard',sub=s=>s.classSubclass||s.subclass||'',mod=n=>Math.floor((Number(n)-10)/2),sg=n=>n>=0?'+'+n:String(n);
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
function proficient(s,type){
 const c=cid(s),sc=sub(s),race=Campaign.race(s),traits=race?.traits||[],base=D.classes[c].armor.map(x=>typeof x==='string'?x:x.proficiency);
 if(s.equipmentDefense?.proficiencyOverride)return true;
 if(base.includes(type))return true;
 if(['light','medium'].includes(type)&&(traits.includes('Dwarven Armor Training')||traits.includes('Martial Prodigy')||sc==='warlock-the-hexblade'||(c==='bard'&&Number(s.level)>=3&&['bard-college-of-valor','bard-college-of-swords'].includes(sc))))return true;
 if(type==='shield'&&(sc==='warlock-the-hexblade'||c==='bard'&&Number(s.level)>=3&&sc==='bard-college-of-valor'))return true;
 if(type==='heavy'&&c==='cleric'&&['life','nature','tempest','war','forge','order','twilight'].some(n=>sc==='cleric-'+n+'-domain'))return true;
 if(type==='heavy'&&c==='artificer'&&Number(s.level)>=3&&sc==='artificer-armorer')return true;
 return false;
}
function optionAllowed(d,prefix,g,key){
 if(!prefix.startsWith('class-cleric'))return true;
 if(g===0&&key==='b')return (Campaign.race(d)?.traits||[]).includes('Dwarven Combat Training')||['tempest','war','death','twilight'].some(n=>sub(d)==='cleric-'+n+'-domain');
 if(g===1&&key==='c')return proficient(d,'heavy');
 return true;
}
const typeNames={weaponSimple:'Arma sencilla',weaponSimpleMelee:'Arma sencilla cuerpo a cuerpo',weaponMartial:'Arma marcial',weaponMartialMelee:'Arma marcial cuerpo a cuerpo',instrumentMusical:'Instrumento musical',toolArtisan:'Herramientas de artesano',setGaming:'Juego',focusSpellcastingArcane:'Foco arcano',focusSpellcastingDruidic:'Foco druídico',focusSpellcastingHoly:'Símbolo sagrado'};
function tokenName(t){return t.item?(t.qty>1?t.qty+' × ':'')+(t.name||item(t.item).name):t.type?(t.qty>1?t.qty+' × ':'')+typeNames[t.type]:t.secondary?'Equipo del gremio secundario':t.gold+' po';}
function templateOptions(d,secondary=false){return CampaignData.backgrounds.filter(x=>D.backgrounds[x.id]&&!D.backgrounds[x.id].template&&!D.backgrounds[x.id].secondary&&Campaign.enabled(d,x)&&(!secondary||x.source==='GGR'));}
function build(d){
 const choices=d.equipmentChoices||{},inventory=new Map(),sections=[],pending=[];let gold=0;
 const add=(id,qty,source,name)=>{const data=item(id);if(data.contents){data.contents.forEach(x=>add(x.item,x.qty*qty,source+' · '+data.name));return;}const key=id+'|'+(name||'');let row=inventory.get(key);if(!row){row={id:'initial-'+hash(key),equipmentId:id,name:name||data.name,qty:0,category:data.category,weight:data.weight??null,location:'Con el personaje',notes:data.notes||'',origins:[]};inventory.set(key,row);}row.qty+=qty;if(!row.origins.includes(source))row.origins.push(source);};
 function section(title,prefix,rows){const fields=[];for(const [g,row]of rows.entries()){
  const optionKeys=Object.keys(row).filter(k=>k!=='_'),key=prefix+'-'+g;let opt=null;
  if(optionKeys.length){const allowed=optionKeys.filter(k=>optionAllowed(d,prefix,g,k));opt=allowed.includes(choices[key])?choices[key]:allowed[0];fields.push({key,title:'Opción '+(g+1),value:opt,options:optionKeys.map(k=>({id:k,label:row[k].map(tokenName).join(' + '),disabled:!allowed.includes(k)}))});}
  for(const [branch,tokens]of [['_',row._||[]],...(opt?[[opt,row[opt]]]:[])])for(const [i,t]of tokens.entries()){
   if(t.gold)gold+=t.gold;
   if(t.item)add(t.item,t.qty||1,title,t.name);
   if(t.type)for(let n=0;n<(t.qty||1);n++){const tk=key+'-'+branch+'-'+i+'-'+n,from=D.types[t.type],value=from.includes(choices[tk])?choices[tk]:from[0];fields.push({key:tk,title:typeNames[t.type]+(t.qty>1?' '+(n+1):''),value,options:from.map(id=>({id,label:item(id).name}))});add(value,1,title);}
  }
 }sections.push({title,prefix,fields,fixed:rows.flatMap(r=>(r._||[]).filter(t=>t.item).map(tokenName))});}
 if(d.equipmentMode!=='manual'){
  section('Clase · '+ClassData.classes[cid(d)].name,'class-'+cid(d),D.classes[cid(d)].groups);
  const bg=D.backgrounds[d.backgroundId];
  if(bg){
   if(bg.template){const chosen=templateOptions(d).find(x=>x.id===d.equipmentTemplate);if(chosen)section('Trasfondo · '+chosen.name,'background-'+chosen.id,D.backgrounds[chosen.id].groups);else pending.push('Elegí el paquete de equipo de tu trasfondo personalizado.');}
   else section('Trasfondo · '+Campaign.background(d).name,'background-'+d.backgroundId,bg.groups);
   if(bg.secondary){const chosen=templateOptions(d,true).find(x=>x.id===d.equipmentSecondary);if(chosen)section('Gremio secundario · '+chosen.name,'secondary-'+chosen.id,D.backgrounds[chosen.id].groups);else pending.push('Elegí el gremio secundario de tu agente dimir.');}
  }else if(d.background)pending.push('El trasfondo escrito a mano requiere registrar su equipo y oro en los campos adicionales.');
 }
 const rows=[...inventory.values()].map(x=>({...x,notes:[x.notes,'Origen: '+x.origins.join('; ')].filter(Boolean).join('\n')}));
 return {inventory:rows,gold:d.equipmentMode==='manual'?0:gold,sections,pending};
}
function defense(s){
 const cfg=s.equipmentDefense||{},inv=s.inventory||[],equipped=id=>inv.find(x=>x.id===id&&x.qty>0),armorRow=equipped(cfg.armorId),shieldRow=equipped(cfg.shieldId),armor=item(armorRow?.equipmentId)?.armor,shield=item(shieldRow?.equipmentId)?.armor?.type==='shield'?shieldRow:null;
 const worn=armor&&armor.type!=='shield'?armor:null,m=Object.fromEntries(Object.entries(s.abilities).map(([k,v])=>[k,mod(v)])),c=cid(s),sc=sub(s),race=Campaign.race(s),warnings=[];let candidates=[];
 if(worn){const dex=worn.dex?(worn.cap===null?m.dex:Math.min(m.dex,worn.cap)):0;candidates.push({id:'armor',label:armorRow.name,value:worn.base+dex,formula:String(worn.base)+(worn.dex?' '+sg(dex)+' DES'+(worn.cap!==null?' (máx. +'+worn.cap+')':''):' (sin DES)')});}
 else candidates.push({id:'normal',label:'Sin armadura',value:10+m.dex,formula:'10 '+sg(m.dex)+' DES'});
 if(!worn&&c==='barbarian')candidates.push({id:'barbarian',label:'Defensa sin armadura de bárbaro',value:10+m.dex+m.con,formula:'10 '+sg(m.dex)+' DES '+sg(m.con)+' CON'});
 if(!worn&&!shield&&c==='monk')candidates.push({id:'monk',label:'Defensa sin armadura de monje',value:10+m.dex+m.wis,formula:'10 '+sg(m.dex)+' DES '+sg(m.wis)+' SAB'});
 if(!worn&&sc==='sorcerer-draconic-bloodline')candidates.push({id:'draconic',label:'Resistencia dracónica',value:13+m.dex,formula:'13 '+sg(m.dex)+' DES'});
 if(race?.id==='loxodon-base-GGR')candidates.push({id:'loxodon',label:'Armadura natural de loxodón',value:12+m.con,formula:'12 '+sg(m.con)+' CON'});
 const best=candidates.reduce((a,b)=>a.value>=b.value?a:b),chosen=candidates.find(x=>x.id===cfg.formula)||best,bonuses=[];
 if(shield)bonuses.push({label:'Escudo',value:2});
 if(race?.id==='warforged-base-ERLW')bonuses.push({label:'Protección integrada',value:1});
 if(s.raceId==='simic-hybrid-base-GGR'&&Number(s.level)>=5&&cfg.simicCarapace&&worn?.type!=='heavy')bonuses.push({label:'Caparazón simic',value:1});
 if(worn&&Object.values(s.classChoices||{}).flat().includes('defense-PHB'))bonuses.push({label:'Estilo Defensa',value:1});
 if(cfg.bonus)bonuses.push({label:'Otros bonos confirmados',value:Number(cfg.bonus)});
 if(worn&&!proficient(s,worn.type)||shield&&!proficient(s,'shield'))warnings.push('Falta competencia con la armadura o el escudo: desventaja en pruebas, salvaciones y ataques con FUE/DES; no podés lanzar conjuros. Si un rasgo te la concede, registrá esa excepción.');
 if(worn?.stealth)warnings.push('Esta armadura impone desventaja en Sigilo.');
 const speedPenalty=worn?.strength>Number(s.abilities.str)&&!s.raceId?.startsWith('dwarf-')?10:0;
 if(speedPenalty)warnings.push('No alcanzás FUE '+worn.strength+': esta armadura reduce tu velocidad en 10 pies.');
 if(c==='druid'&&(worn&&!['leather-armor','padded-armor','studded-leather-armor','hide-armor'].includes(armorRow.equipmentId)||shield&&shield.equipmentId!=='wooden-shield'))warnings.push('Los druidas de 2014 no usan armaduras ni escudos de metal. Revisá el material con tu DM.');
 if(c==='monk'&&(worn||shield))warnings.push('Defensa sin armadura de monje requiere no llevar armadura ni escudo.');
 if(s.raceId==='warforged-base-ERLW'&&worn)warnings.push('Forjado: incorporar o retirar esta armadura tarda 1 hora y exige competencia.');
 return {total:chosen.value+bonuses.reduce((a,b)=>a+b.value,0),base:chosen,bonuses,formula:chosen.formula+bonuses.map(b=>' '+sg(b.value)+' '+b.label).join(''),candidates,warnings,speedPenalty,armor:armorRow,shield};
}
function prepare(d){
 const b=build(d);d.equipmentChoices=d.equipmentChoices||{};for(const sec of b.sections)for(const f of sec.fields)d.equipmentChoices[f.key]=f.value;
 d.equipmentDefense=d.equipmentDefense||{formula:'auto',bonus:0,simicCarapace:false,proficiencyOverride:false};
 const cfg=d.equipmentDefense,available=b.inventory.filter(x=>item(x.equipmentId)?.armor),body=available.filter(x=>item(x.equipmentId).armor.type!=='shield'),shields=available.filter(x=>item(x.equipmentId).armor.type==='shield');
 if(cfg.shieldId===undefined||cfg.shieldId&&!shields.some(x=>x.id===cfg.shieldId))cfg.shieldId=proficient(d,'shield')?(shields[0]?.id||''):'';
 if(cfg.armorId===undefined||cfg.armorId&&!body.some(x=>x.id===cfg.armorId)){
  const options=['',...body.filter(x=>proficient(d,item(x.equipmentId).armor.type)).map(x=>x.id)];cfg.armorId=options.reduce((best,id)=>defense({...d,inventory:b.inventory,equipmentDefense:{...cfg,armorId:id}}).total>defense({...d,inventory:b.inventory,equipmentDefense:{...cfg,armorId:best}}).total?id:best,'');
 }
 return {...b,defense:defense({...d,inventory:b.inventory})};
}
function validate(s){
 if(s.equipmentDefense!==undefined){const d=s.equipmentDefense;if(!d||typeof d!=='object'||Array.isArray(d)||!['armorId','shieldId'].every(k=>typeof d[k]==='string'&&d[k].length<=100)||!['auto','normal','armor','barbarian','monk','draconic','loxodon'].includes(d.formula)||!Number.isInteger(d.bonus)||d.bonus < -20||d.bonus>30||typeof d.simicCarapace!=='boolean'||typeof d.proficiencyOverride!=='boolean')throw Error('Configuración de equipo y CA inválida.');for(const [key,shield]of [['armorId',false],['shieldId',true]]){const row=s.inventory?.find(x=>x.id===d[key]);if(row&&(!item(row.equipmentId)?.armor||(item(row.equipmentId).armor.type==='shield')!==shield))throw Error('El objeto equipado no es una armadura o escudo válido.');}}
 if(Array.isArray(s.inventory))for(const x of s.inventory){if(x.equipmentId!==undefined&&!item(x.equipmentId))throw Error('Referencia de equipo desconocida.');if(x.origins!==undefined&&(!Array.isArray(x.origins)||x.origins.length>50||x.origins.some(y=>typeof y!=='string'||y.length>300)))throw Error('Origen de equipo inválido.');}
}
function validateDraft(d){const b=prepare(d);if(b.pending.length&&d.backgroundId)throw Error(b.pending[0]);if(!Number.isInteger(Number(d.gold))||Number(d.gold)<0||Number(d.gold)>99999999)throw Error('Ingresá un saldo o un oro adicional válido.');if(d.equipmentDefense){const view={...d,inventory:b.inventory};validate(view);if(d.raceId==='warforged-base-ERLW'&&b.defense.armor&&!proficient(d,item(b.defense.armor.equipmentId).armor.type))throw Error('Un forjado solo puede incorporar armaduras con las que tenga competencia.');}return b;}
return {item,build,prepare,defense,validate,validateDraft,proficient,templateOptions,typeNames};
})();
if(typeof globalThis!=='undefined')globalThis.Equipment=Equipment;
