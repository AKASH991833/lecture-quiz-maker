/* lecture-quiz-maker — extractive + generative quiz engine, 100% on-device.
   Splits notes into sentences, scores key sentences by term frequency,
   builds MCQs (definition cloze), true/false (negation/number swaps) and flashcards.
   HONEST: extractive NLP, no LLM — questions come from the text itself. */
(function(){
'use strict';
const STOP=new Set('a an the and or but if then else when while of at by for with about into through during before after above below to from up down in out on off over under again further once here there all any both each few more most other some such no nor not only own same so than too very can will just should now is are was were be been being have has had having do does did doing would could ought i you he she it we they them his her its our their this that these those am as us'.split(' '));
function tokenize(s){return (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[]).filter(w=>!STOP.has(w))}
function splitSentences(text){
  return text.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+["']?|\S[^.!?]*$/g)
    .map(s=>s.trim()).filter(s=>s.split(' ').length>=5&&s.split(' ').length<=60);
}
function keywords(corpus,topN){
  const df={},tf={};
  corpus.forEach(s=>{const seen=new Set();tokenize(s).forEach(w=>{tf[w]=(tf[w]||0)+1;if(!seen.has(w)){df[w]=(df[w]||0)+1;seen.add(w)}})});
  return Object.keys(tf).filter(w=>tf[w]>=2&&(df[w]||0)>=1)
    .sort((a,b)=>tf[b]*(1+Math.log(1+(df[b]||0)))-tf[a]*(1+Math.log(1+(df[a]||0)))).slice(0,topN||400);
}
function sentScore(s,kw){const toks=tokenize(s);if(!toks.length)return 0;const set=new Set(kw);let hit=0;toks.forEach(w=>{if(set.has(w))hit++});return hit/Math.sqrt(toks.length)}
function pickDistractors(word,kw,count){
  const cand=kw.filter(w=>w!==word&&Math.abs(w.length-word.length)<=4&&!w.includes(word)&&!word.includes(w));
  const out=[];const shuffled=cand.sort(()=>Math.random()-0.5);
  for(const w of shuffled){if(out.length>=count)break;if(!out.some(o=>o[0]===w[0]&&Math.abs(o.length-w.length)<=1))out.push(w)}
  while(out.length<count){const w=kw[Math.floor(Math.random()*kw.length)];if(w&&w!==word&&!out.includes(w))out.push(w);else if(out.length>=count)break}
  return out;
}
function makeMCQ(s,kw){
  const toks=tokenize(s);
  const candidates=toks.filter(w=>kw.includes(w)&&w.length>=4);
  if(!candidates.length)return null;
  const answer=candidates.sort((a,b)=>(kw.indexOf(a)-kw.indexOf(b)))[0];
  const re=new RegExp('\\b'+answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  if(!re.test(s))return null;
  const distractors=pickDistractors(answer,kw,3);
  if(distractors.length<3)return null;
  const options=[answer,...distractors].sort(()=>Math.random()-0.5);
  return {type:'mcq',question:s.replace(re,'_____'),options,answer,hint:'Fill the blank with the missing term from the notes.',source:s};
}
function makeTF(s){
  let q=s,ans=true,why='The statement matches the notes.';
  const neg=s.match(/\b(is|are|was|were|has|have|can|could|will|would|do|does)\s+not\b/i);
  const num=s.match(/\b(\d+(?:\.\d+)?)\s*(%|percent|times|years?|days?|hours?|minutes?|people|users)?\b/);
  if(neg&&Math.random()<0.6){q=s.replace(new RegExp(neg[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),neg[1]);ans=false;why='The notes say "'+neg[0]+'" — the statement drops the "not".'}
  else if(num&&Math.random()<0.7){const v=parseFloat(num[1]);const nv=v>=10?v*2:v+Math.ceil(Math.random()*3)+1;q=s.replace(new RegExp(num[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),String(nv)+(num[2]?' '+num[2]:''));ans=false;why='The notes say "'+num[0]+'", not "'+nv+(num[2]?' '+num[2]:'')+'".'}
  else if(Math.random()<0.5){const m=s.match(/\b(is|are|was|were|has|have|can|will|do|does)\b/i);if(m){q=s.replace(/\b(is|are|was|were|has|have|can|will|do|does)\b/i,'$1 not');ans=false;why='A "not" was added — the notes state the opposite.'}}
  return {type:'tf',question:q,answer:ans,hint:why,source:s};
}
function makeFlash(s,kw){
  const toks=tokenize(s).filter(w=>kw.includes(w)&&w.length>=4);
  if(!toks.length)return null;
  const term=toks[0];
  const re=new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  if(!re.test(s))return null;
  return {type:'flash',front:'What does the notes say about "'+term+'"?',back:s,term};
}
window.QuizEngine={
  generate(text,counts){
    const sents=splitSentences(text);
    if(sents.length<3)return{error:'Need at least 3 full sentences to build a quiz. Paste more notes.'};
    const kw=keywords(sents,400);
    const scored=sents.map(s=>({s,score:sentScore(s,kw)})).sort((a,b)=>b.score-a.score);
    const key=scored.slice(0,Math.max(12,counts.mcq+counts.tf+counts.flash)).map(x=>x.s);
    const qs=[];const used=new Set();
    const take=fn=>{for(const s of key){if(used.has(s))continue;const q=fn(s);if(q){used.add(s);return q}}return null};
    const usedAns=new Set();
    for(let i=0;i<counts.mcq;i++){const q=take(s=>{const q=makeMCQ(s,kw);if(q&&usedAns.has(q.answer))return null;if(q)usedAns.add(q.answer);return q});if(q)qs.push(q)}
    for(let i=0;i<counts.tf;i++){const q=take(makeTF);if(q)qs.push(q)}
    const cards=[];
    const takeCard=()=>{for(const s of key){if(used.has(s))continue;const c=makeFlash(s,kw);if(c){used.add(s);return c}}
      for(const s of key){const c=makeFlash(s,kw);if(c&&!cards.some(x=>x.back===c.back))return c}
      return null};
    for(let i=0;i<counts.flash;i++){const c=takeCard();if(c)cards.push(c)}
    return {questions:qs,flashcards:cards,stats:{sentences:sents.length,keywords:kw.length,keySentences:key.length}};
  },
  tokenize,splitSentences,keywords
};
})();
