/* Competencias iniciales: las concesiones de origen no consumen elecciones de clase. */
const CreationSkills=(()=>{'use strict';
const id=k=>({'animal handling':'animal','sleight of hand':'sleight'}[k]||k);
const all=()=>Rules.skills.map(([k])=>k);
const label=k=>Rules.skills.find(([key])=>key===k)?.[1]||k;
function variant(d){
 if(d.raceId==='custom-lineage-base-TCE')return {title:'Rasgo variable del linaje',options:[['skills','Una habilidad a elección'],['other','Visión en la oscuridad (sin habilidad)']]};
 if(/^half-elf-variant-.*-SCAG$/.test(d.raceId||''))return {title:'Rasgo del semielfo variante',options:[['skills','Versatilidad: dos habilidades'],['perception','Sentidos agudos: Percepción'],['other','Otro rasgo de esta variante (sin habilidad)']]};
 if(d.raceId==='gith-githyanki-MTF')return {title:'Maestría decadente',options:[['skills','Una habilidad a elección'],['other','Una herramienta a elección (registrala en notas)']]};
 return null;
}
function plan(d){
 const fixed=[],groups=[],v=variant(d);
 for(const [kind,row]of [['race',Campaign.race(d)],['background',Campaign.background(d)]]){
  if(!row)continue;
  let grants=row.skillProficiencies||[];
  // Las marcas reemplazan Versatilidad / Amenazador, aunque el catálogo heredó la fila base.
  if(kind==='race'&&/^(half-elf|half-orc)-variant-mark-/.test(row.id))grants=[];
  if(kind==='race'&&v)grants=d.raceSkillMode==='skills'?[{any:row.id.startsWith('half-elf')?2:1}]:d.raceSkillMode==='perception'?[{perception:true}]:[];
  grants.forEach((grant,i)=>{
   for(const [key,value]of Object.entries(grant))if(value===true&&all().includes(id(key)))fixed.push({id:id(key),source:row.name});
   const add=(suffix,count,from)=>groups.push({id:kind+'-'+row.id+'-'+i+'-'+suffix,title:row.name,count,from});
   if(grant.any)add('any',grant.any,all());
   if(grant.choose)add('choose',grant.choose.count||1,grant.choose.from.map(id));
  });
 }
 const fixedIds=[...new Set(fixed.map(x=>x.id))];
 let replacements=fixed.length-fixedIds.length;
 const c=ClassData.classes[d.classId];
 groups.push({id:'class',title:c.name+' · habilidades de clase',count:c.skills.count??(c.id==='bard'?3:0),from:(c.skills.from||all()).map(id)});
 // Si todas las opciones de un rasgo ya fueron concedidas, no bloquear el creador:
 // esas elecciones también se convierten en reemplazos del mismo tipo.
 const reserved=new Set(fixedIds);
 for(const g of groups){
  const available=g.from.filter(k=>!reserved.has(k));
  g.originalCount=g.count;g.count=Math.min(g.count,available.length);replacements+=g.originalCount-g.count;
  [...new Set(picks(d,g))].filter(k=>available.includes(k)).slice(0,g.count).forEach(k=>reserved.add(k));
 }
 if(replacements)groups.push({id:'replacement',title:'Reemplazos por competencias repetidas',count:replacements,from:all()});
 return {fixed,fixedIds,groups,variant:v};
}
const picks=(d,g)=>g.id==='class'?(d.skills||[]):(d.originSkills?.[g.id]||[]);
function reconcile(d){
 const p=plan(d),used=new Set(p.fixedIds),next={};
 for(const g of p.groups){const chosen=[...new Set(picks(d,g))].filter(k=>g.from.includes(k)&&!used.has(k)).slice(0,g.count);chosen.forEach(k=>used.add(k));if(g.id==='class')d.skills=chosen;else next[g.id]=chosen;}
 d.originSkills=next;d.extraSkills=[...new Set(d.extraSkills||[])].filter(k=>all().includes(k)&&!used.has(k));return d;
}
function total(d){const p=plan(d);return [...new Set([...p.fixedIds,...p.groups.flatMap(g=>picks(d,g)),...(d.extraSkills||[])])];}
function validate(d){
 const p=plan(d),used=new Set(p.fixedIds);
 if(p.variant&&!p.variant.options.some(([k])=>k===d.raceSkillMode))throw Error('Elegí el rasgo de tu linaje antes de continuar.');
 for(const g of p.groups){const chosen=picks(d,g);if(chosen.length!==g.count)throw Error(g.title+': elegí '+g.count+' habilidad(es). Tenés '+chosen.length+'.');for(const k of chosen){if(!g.from.includes(k))throw Error('Esa habilidad no pertenece a '+g.title+'.');if(used.has(k))throw Error(label(k)+' ya está concedida por otra fuente. Elegí una distinta.');used.add(k);}}
 for(const k of d.extraSkills||[]){if(!all().includes(k)||used.has(k))throw Error('Revisá las competencias adicionales: hay una inválida o repetida.');used.add(k);}
 return true;
}
return {plan,picks,reconcile,total,validate,label,variant};
})();
if(typeof globalThis!=='undefined')globalThis.CreationSkills=CreationSkills;
