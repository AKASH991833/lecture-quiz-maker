module.exports=async(page)=>{
  await page.select('#sample-sel','history');
  await page.click('#generate');
  await page.waitForFunction(()=>document.querySelectorAll('.q-card').length>=5,{timeout:15000});
  const n=await page.$$eval('.q-card',e=>e.length);
  // answer every question (first option)
  const answered=await page.evaluate(()=>{
    let c=0;
    document.querySelectorAll('.q-card').forEach(card=>{const b=card.querySelector('.opt');if(b){b.click();c++}});
    return c;
  });
  await page.waitForSelector('#score-card:not(.hidden)',{timeout:15000});
  const score=await page.$eval('#score-num',e=>e.textContent);
  const fb=await page.$$eval('.q-fb:not(.hidden)',e=>e.length);
  const cards=await page.$$eval('.flash',e=>e.length);
  if(cards<1)throw new Error('no flashcards');
  await page.click('.flash');
  const flipped=await page.$eval('.flash',e=>e.classList.contains('flipped'));
  if(!flipped)throw new Error('flashcard did not flip');
  return `${n} questions, ${answered} answered, score=${score}, ${fb} explanations, ${cards} flashcards flip ok`;
};
