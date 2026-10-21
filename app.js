/* lecture-quiz-maker UI */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let quiz=null,answers={},revealed={},cardFlip={};
const SAMPLES={
biology:'Photosynthesis is the process by which plants convert sunlight into energy. Plants absorb carbon dioxide through tiny pores called stomata. The Calvin cycle produces glucose from carbon dioxide and water. Chlorophyll gives plants their green color and absorbs light energy. Most plants release oxygen as a byproduct of photosynthesis. The process occurs in the chloroplasts of plant cells. Light reactions take place in the thylakoid membranes. ATP and NADPH are produced during the light reactions. Photosynthesis produces about 70 percent of atmospheric oxygen. Without photosynthesis, most life on Earth would not exist.',
history:'The French Revolution began in 1789 and lasted about ten years. The storming of the Bastille happened on July 14, 1789. King Louis XVI was executed by guillotine in 1793. The revolution ended the monarchy and established a republic in France. The Declaration of the Rights of Man was adopted in August 1789. Maximilien Robespierre led the Reign of Terror from 1793 to 1794. Around 17,000 people were executed during the Terror. Napoleon Bonaparte seized power in a coup in 1799. The revolution spread ideas of liberty and equality across Europe. Feudal privileges were abolished during the early years of the revolution.',
computing:'An algorithm is a step-by-step procedure for solving a problem. Binary search runs in logarithmic time because it halves the search space. A hash table provides average constant-time lookup using a hash function. Recursion is when a function calls itself with smaller inputs. Big O notation describes the worst-case growth rate of an algorithm. Merge sort divides the array and merges sorted halves in n log n time. A stack follows last-in-first-out order for push and pop. Dynamic programming stores solutions to overlapping subproblems. Dijkstras algorithm finds shortest paths in weighted graphs. Modern CPUs execute billions of instructions per second.'
};
function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function counts(){return{mcq:+$('n-mcq').value,tf:+$('n-tf').value,flash:+$('n-flash').value}}
function generate(){
  const text=$('notes').value.trim();
  if(text.length<80){pkToast('Paste at least a few sentences of notes first');return}
  const r=QuizEngine.generate(text,counts());
  if(r.error){pkToast(r.error);return}
  quiz=r;answers={};revealed={};cardFlip={};
  $('gen-stats').innerHTML=`<span class="pill ok">${r.questions.length} questions</span> <span class="pill warn">${r.flashcards.length} flashcards</span> <span class="hint">from ${r.stats.sentences} sentences, ${r.stats.keywords} key terms</span>`;
  renderQuiz();renderCards();
  $('quiz-sec').classList.remove('hidden');$('cards-sec').classList.remove('hidden');$('score-card').classList.add('hidden');
  $('quiz-sec').scrollIntoView({behavior:'smooth'});
}
function renderQuiz(){
  $('quiz-list').innerHTML=quiz.questions.map((q,i)=>{
    if(q.type==='mcq')return `<div class="card q-card" data-q="${i}">
      <p class="q-text"><span class="q-num">Q${i+1}</span>${esc(q.question)}</p>
      <div class="opt-list">${q.options.map(o=>`<button class="opt" data-q="${i}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <p class="q-fb hidden" id="fb-${i}"></p></div>`;
    return `<div class="card q-card" data-q="${i}">
      <p class="q-text"><span class="q-num">Q${i+1}</span>${esc(q.question)}</p>
      <div class="opt-list"><button class="opt" data-q="${i}" data-o="true">True</button><button class="opt" data-q="${i}" data-o="false">False</button></div>
      <p class="q-fb hidden" id="fb-${i}"></p></div>`;
  }).join('');
  document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(+b.dataset.q,b.dataset.o));
}
function answer(i,opt){
  const q=quiz.questions[i];if(answers[i]!==undefined)return;
  const correct=q.type==='mcq'?opt===q.answer:(opt==='true')===q.answer;
  answers[i]={opt,correct};
  const card=document.querySelector(`.q-card[data-q="${i}"]`);
  card.querySelectorAll('.opt').forEach(b=>{
    const val=b.dataset.o;
    const isRight=q.type==='mcq'?val===q.answer:(val==='true')===q.answer;
    if(isRight)b.classList.add('opt-right');
    else if(val===opt)b.classList.add('opt-wrong');
    b.disabled=true;
  });
  const fb=$('fb-'+i);fb.classList.remove('hidden');
  fb.className='q-fb '+(correct?'fb-ok':'fb-bad');
  fb.innerHTML=(correct?'<strong>Correct.</strong> ':'<strong>Not quite.</strong> ')+esc(q.hint)+' <span class="hint">Source: "'+esc(q.source.slice(0,90))+(q.source.length>90?'…':'')+'"</span>';
  const total=Object.keys(answers).length;
  if(total===quiz.questions.length){
    const score=Object.values(answers).filter(a=>a.correct).length;
    $('score-num').textContent=score+' / '+total;
    $('score-note').textContent=score===total?'Perfect score — the notes stuck.':score>=total*0.7?'Solid. Review the ones you missed below.':'Worth another read of the notes, then regenerate.';
    $('score-card').classList.remove('hidden');
    $('score-card').scrollIntoView({behavior:'smooth'});
  }
}
function renderCards(){
  $('card-list').innerHTML=quiz.flashcards.map((c,i)=>`<div class="flash ${cardFlip[i]?'flipped':''}" data-c="${i}" role="button" tabindex="0">
    <div class="flash-in"><div class="flash-f"><p>${esc(c.front)}</p><span class="hint">Tap to flip</span></div>
    <div class="flash-b"><p>${esc(c.back)}</p></div></div></div>`).join('');
  document.querySelectorAll('.flash').forEach(f=>{f.onclick=()=>{const i=+f.dataset.c;cardFlip[i]=!cardFlip[i];f.classList.toggle('flipped')}});
}
function exportQuiz(){
  if(!quiz)return;
  let md='# Lecture Quiz\n\n';
  quiz.questions.forEach((q,i)=>{
    md+=`**Q${i+1}.** ${q.question}\n\n`;
    if(q.type==='mcq')q.options.forEach(o=>{md+=`- [ ] ${o}${o===q.answer?' ✓':''}\n`});
    else md+=`- [ ] True${q.answer===true?' ✓':''}\n- [ ] False${q.answer===false?' ✓':''}\n`;
    md+=`\n_${q.hint}_\n\n`;
  });
  if(quiz.flashcards.length){md+='## Flashcards\n\n';quiz.flashcards.forEach(c=>{md+=`- **${c.front}** — ${c.back}\n`})}
  pkDownload('lecture-quiz.md',md,'text/markdown');
  pkToast('Quiz downloaded as Markdown');
}
document.addEventListener('DOMContentLoaded',()=>{
  $('sample-sel').onchange=e=>{if(e.target.value){$('notes').value=SAMPLES[e.target.value];$('notes').dispatchEvent(new Event('input'))}};
  $('notes').addEventListener('input',()=>{$('wc').textContent=$('notes').value.trim()?($('notes').value.trim().split(/\s+/).length+' words'):''});
  $('generate').onclick=generate;
  $('export').onclick=exportQuiz;
  $('retry').onclick=()=>{answers={};revealed={};renderQuiz();$('score-card').classList.add('hidden');window.scrollTo({top:$('quiz-sec').offsetTop-80,behavior:'smooth'})};
});
})();
