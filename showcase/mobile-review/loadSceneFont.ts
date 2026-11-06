// CSS-connected FontFace objects retain a rejected promise after a network
// failure. Recreate only failed, requested CSS faces before the next load.
let retrySequence=0;
const familyName=(value:string)=>value.replace(/["']/g,'').trim().toLowerCase();
const rangeName=(value:string)=>value.replace(/\s/g,'').toUpperCase();
const weightRange=(value:string)=>value==='normal'?'400':value==='bold'?'700':value;
const includesWeight=(value:string,weight:number)=>{
 const values=weightRange(value).split(/\s+/).map(Number);
 return weight>=values[0]&&weight<=(values[1]??values[0]);
};
function includesText(range:string,text:string){
 return range.split(',').some(part=>{
  const value=part.trim().replace(/^U\+/i,''),[start,end]=value.includes('?')?[value.replace(/\?/g,'0'),value.replace(/\?/g,'F')]:value.split('-');
  const lo=parseInt(start,16),hi=parseInt(end??start,16);
  return Array.from(text).some(character=>{const point=character.codePointAt(0)!;return point>=lo&&point<=hi});
 });
}
function resetFailedFace(face:FontFace){
 const visit=(sheet:CSSStyleSheet):boolean=>{
  let rules:CSSRuleList;try{rules=sheet.cssRules}catch{return false}
  for(let index=0;index<rules.length;index++){
   const rule=rules[index];
   if(rule instanceof CSSImportRule&&rule.styleSheet&&visit(rule.styleSheet))return true;
   if(!(rule instanceof CSSFontFaceRule))continue;
   const style=rule.style;
   if(familyName(style.getPropertyValue('font-family'))!==familyName(face.family)||
      weightRange(style.getPropertyValue('font-weight')||'normal')!==weightRange(face.weight)||
      rangeName(style.getPropertyValue('unicode-range')||'U+0-10FFFF')!==rangeName(face.unicodeRange))continue;
   // A failed resource URL can also be negatively cached by the browser.
   // Replace one retry token, without accumulating parameters or new rules.
   const source=style.getPropertyValue('src').replace(/url\(\s*(["']?)(.*?)\1\s*\)/g,(_match,_quote,path:string)=>{
    const url=new URL(path,sheet.href??document.baseURI);url.searchParams.set('ax-font-retry',String(++retrySequence));return `url("${url.href}")`;
   });
   style.setProperty('src',source);
   const text=rule.cssText;sheet.deleteRule(index);sheet.insertRule(text,index);return true;
  }
  return false;
 };
 for(const sheet of Array.from(document.styleSheets))if(visit(sheet))return;
}
export async function loadSceneFont(family:string,weight:number,size:number,text:string){
 for(const face of Array.from(document.fonts)){
  if(face.status==='error'&&familyName(face.family)===familyName(family)&&includesWeight(face.weight,weight)&&includesText(face.unicodeRange,text))resetFailedFace(face);
 }
 await document.fonts.load(`${weight} ${size}px "${family}"`,text);
}
