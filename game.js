'use strict';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'unoCasinoTable_v1';
const freshState = () => ({
  started:false, names:['Player 1','Player 2'], cards:[10,10],
  loans:[[],[]], loansUsed:[0,0], round:1, roller:null, phase:'start',
  jackpot:0, cooldown:0, bets:[{higher:0,lower:0},{higher:0,lower:0}],
  lastDice:[], history:[], lastWinner:null, gameOver:false, jackpotRound:false
});
let state = freshState();
let rolling = false;

function save(){ try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){} }
function totalBets(){return state.bets.reduce((sum,b)=>sum+b.higher+b.lower,0);}
function cp(){return totalBets();}
function optionFor(i){return state.bets[i].higher?'higher':state.bets[i].lower?'lower':null;}
function playerBet(i){return state.bets[i].higher+state.bets[i].lower;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addHistory(message){state.history.unshift(`R${state.round}: ${message}`);state.history=state.history.slice(0,24);}
function toast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),2300);}
function face(n){return ['','⚀','⚁','⚂','⚃','⚄','⚅'][n];}
function rollDie(max){return Math.floor(Math.random()*max)+1;}
function showModal(content){$('modalContent').innerHTML=content;$('modalBackdrop').classList.remove('hidden');}
function closeModal(){$('modalBackdrop').classList.add('hidden');}
function cardFan(count,colour){
  const visible=Math.min(count,12);
  let html='';
  for(let i=0;i<visible;i++){
    const angle=visible===1?0:(i-(visible-1)/2)*3.2;
    const lift=Math.abs(i-(visible-1)/2)*1.1;
    html+=`<span class="fan-card ${colour}-fan" style="--rot:${angle}deg;--lift:${lift}px"></span>`;
  }
  if(count>visible)html+=`<span class="fan-more">+${count-visible}</span>`;
  return html;
}
function miniCards(count,colour){
  return Array.from({length:Math.min(count,9)},()=>`<span class="mini-card ${colour}-card"></span>`).join('')+(count>9?`<span class="mini-extra">+${count-9}</span>`:'');
}
function playerStats(i){
  const prefix=i===0?'gold':'ruby', loans=state.loans[i];
  $(prefix+'NameLabel').textContent=state.names[i].toUpperCase();
  $(prefix+'Balance').textContent=state.cards[i];
  $(prefix+'LoansUsed').textContent=`${state.loansUsed[i]} / 3`;
  $(''+prefix+'Debt').textContent=`${loans.length*3} cards`;
  $(prefix+'LoanList').innerHTML=loans.length?loans.map((loan,index)=>{
    const due=loan.due<=0;
    return `<div class="loan-entry ${due?'due':''}"><span>Loan ${index+1}: 3 cards</span><b>${due?'DUE':loan.due+' rounds'}</b></div>`;
  }).join(''):'<span class="muted tiny">No active loans</span>';
  $(prefix+'LoanButton').disabled=state.loansUsed[i]>=3||state.gameOver;
  $(prefix+'LoanButton').textContent=state.loansUsed[i]>=3?'All loans used':'Borrow 3 cards';
}
function render(){
  $('setupScreen').classList.toggle('hidden',state.started);
  $('gameScreen').classList.toggle('hidden',!state.started);
  $('roundBadge').textContent=state.started?`ROUND ${state.round}`:'SETUP';
  if(!state.started)return;
  $('roundNumber').textContent=state.round;
  const phaseNames={start:'Starting roll',bet:'Place wagers',ready:'Ready to roll',done:'Round complete',over:'Game over'};
  $('phaseLabel').textContent=phaseNames[state.phase]||'Jackpot round';
  $('turnLabel').textContent=state.roller===null?'Roll to determine who starts':`${state.names[state.roller]} rolls and places first`;
  $('rollerLabel').textContent='Roller: '+(state.roller===null?'—':state.names[state.roller]);
  $('jackpotValue').innerHTML=`${state.jackpot} <small>cards</small>`;
  $('boardTotal').innerHTML=`${cp()} <small>cards</small>`;
  $('cooldownLabel').textContent=state.cooldown>0?`Cooldown · ${state.cooldown} round(s) left`:'Available';
  $('diceTitle').textContent=state.jackpotRound?'RED-GOLD DICE':'STANDARD DICE';
  $('dieOne').classList.toggle('red-die',state.jackpotRound);
  $('dieTwo').classList.toggle('red-die',state.jackpotRound);
  $('goldHigherCount').textContent=state.bets[0].higher;
  $('goldLowerCount').textContent=state.bets[0].lower;
  $('rubyLowerCount').textContent=state.bets[1].lower;
  $('rubyHigherCount').textContent=state.bets[1].higher;
  $('goldHigherCards').innerHTML=miniCards(state.bets[0].higher,'gold');
  $('goldLowerCards').innerHTML=miniCards(state.bets[0].lower,'gold');
  $('rubyLowerCards').innerHTML=miniCards(state.bets[1].lower,'ruby');
  $('rubyHigherCards').innerHTML=miniCards(state.bets[1].higher,'ruby');
  $('goldHandFan').innerHTML=cardFan(state.cards[0],'gold');
  $('rubyHandFan').innerHTML=cardFan(state.cards[1],'ruby');
  playerStats(0);playerStats(1);
  $('historyList').innerHTML=state.history.length?state.history.map(x=>`<span class="history-item">${escapeHtml(x)}</span>`).join(''):'No rounds played yet.';
  const bothPlaced=playerBet(0)>0&&playerBet(1)>0;
  $('rollButton').disabled=rolling||state.phase==='done'||state.phase==='over'||(state.phase!=='start'&&!bothPlaced);
  $('rollButton').textContent=state.phase==='start'?'Roll to choose starter':state.phase==='done'?'Round complete':state.phase==='over'?'Game over':state.jackpotRound?'Roll jackpot dice':'Roll dice';
  $('clearBetsButton').disabled=rolling||state.phase==='start'||state.phase==='done'||state.phase==='over';
  $('clearBetsButton').classList.toggle('hidden',state.phase==='done'||state.phase==='over');
  $('nextRoundButton').classList.toggle('hidden',state.phase!=='done');
  $('nextRoundButton').textContent=state.cooldown>0?'Next round →':'Next round →';
  $('roundNote').textContent=state.phase==='start'?'Both players roll once. Highest result chooses the first turn.':
    state.phase==='bet'?'The roller places first. The other player can see that choice before placing.':
    state.phase==='done'?'Round settled. Check balances and loan deadlines, then continue.':
    state.phase==='over'?'Game over. One player has run out of cards after using all three loans.':
    state.jackpotRound?'Jackpot round: choose opposite options, then roll the red-gold die.':
    'Both bets are placed. Tap Roll dice to settle the round.';
  document.querySelectorAll('[data-bet-player]').forEach(button=>{
    const i=Number(button.dataset.betPlayer),opt=button.dataset.option,step=Number(button.dataset.step);
    const other=opt==='higher'?'lower':'higher';
    const isFirst=state.roller===i;
    const firstBet=state.roller===null?null:playerBet(state.roller);
    const isSecondWaiting=state.phase==='bet'&&state.roller!==i&&firstBet===0;
    let disabled=rolling||state.phase!=='bet'||state.phase==='done'||state.phase==='over';
    if(step>0&&state.bets[i][other]>0)disabled=true;
    if(step>0&&state.cards[i]<=0)disabled=true;
    if(step<0&&state.bets[i][opt]<=0)disabled=true;
    // The second player cannot act until the roller has placed the first wager.
    if(isSecondWaiting)disabled=true;
    // In a jackpot round, bets must be on opposite options.
    if(state.jackpotRound&&step>0){
      const firstOption=optionFor(state.roller);
      if(i!==state.roller&&firstOption&&opt===firstOption)disabled=true;
    }
    button.disabled=disabled;
  });
  $('goldLoanButton').disabled=state.loansUsed[0]>=3||state.gameOver;
  $('rubyLoanButton').disabled=state.loansUsed[1]>=3||state.gameOver;
  if(state.lastDice.length){
    const max=state.jackpotRound?3:6;
    $('dieOne').textContent=state.jackpotRound?['','⚀','⚁','⚂'][state.lastDice[0]]:face(state.lastDice[0]);
    $('dieTwo').textContent=state.lastDice[1]?(state.jackpotRound?['','⚀','⚁','⚂'][state.lastDice[1]]:face(state.lastDice[1])):'—';
  }else{$('dieOne').textContent='⚀';$('dieTwo').textContent='⚁';}
}
function startGame(){
  const cards=Math.max(2,Math.min(200,Number.parseInt($('startingCards').value,10)||10));
  state=freshState();state.started=true;
  state.names=[$('nameGold').value.trim()||'Player 1',$('nameRuby').value.trim()||'Player 2'];
  state.cards=[cards,cards];state.phase='start';
  addHistory(`Game started with ${cards} cards each`);
  save();render();
}
function placeBet(i,opt,step){
  if(state.phase!=='bet'||rolling)return;
  const other=opt==='higher'?'lower':'higher';
  if(step>0&&state.bets[i][other]>0){toast('Each player can bet on HIGHER or LOWER, not both.');return;}
  if(step>0&&state.cards[i]<1){toast('Not enough cards.');return;}
  if(step>0&&i!==state.roller&&playerBet(state.roller)===0){toast('The roller must place their bet first.');return;}
  if(step>0&&state.jackpotRound&&i!==state.roller&&optionFor(state.roller)===opt){toast('Jackpot bets must use opposite options.');return;}
  if(step>0){
    state.cards[i]-=1;
    state.bets[i][opt]+=1;
  }else if(state.bets[i][opt]>0){
    state.bets[i][opt]-=1;
    state.cards[i]+=1;
  }
  // Matching choices immediately move the staked cards into the jackpot.
  if(!state.jackpotRound && playerBet(0)>0 && playerBet(1)>0 && optionFor(0)===optionFor(1)){
    const transferred=totalBets();
    state.jackpot+=transferred;
    state.bets=[{higher:0,lower:0},{higher:0,lower:0}];
    state.jackpotRound=true;
    addHistory(`Same option chosen — ${transferred} cards added to jackpot (${state.jackpot} total)`);
    $('diceResult').textContent='Same option: jackpot triggered! Place opposite bets.';
    toast('JACKPOT ROUND!');
  }
  save();render();
}
function clearBets(){
  if(rolling||state.phase!=='bet')return;
  for(let i=0;i<2;i++)state.cards[i]+=playerBet(i);
  state.bets=[{higher:0,lower:0},{higher:0,lower:0}];save();render();
}
function animateDice(a,b,red){
  $('dieOne').classList.toggle('red-die',red);$('dieTwo').classList.toggle('red-die',red);
  $('dieOne').textContent=red?['','⚀','⚁','⚂'][a]:face(a);
  $('dieTwo').textContent=red?['','⚀','⚁','⚂'][b]:face(b);
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function roll(){
  if(rolling)return;
  if(state.phase==='start'){
    rolling=true;render();
    let a=rollDie(6),b=rollDie(6);animateDice(a,b,false);$('diceResult').textContent=`${a} vs ${b}`;
    await wait(700);
    while(a===b){$('diceResult').textContent='Tie — rolling again…';await wait(500);a=rollDie(6);b=rollDie(6);animateDice(a,b,false);$('diceResult').textContent=`${a} vs ${b}`;await wait(550);}
    state.lastDice=[a,b];state.roller=a>b?0:1;state.phase='bet';state.jackpotRound=false;
    addHistory(`${state.names[state.roller]} won the opening roll and bets first`);
    $('diceResult').textContent=`${state.names[state.roller]} starts (${a}–${b})`;
    rolling=false;save();render();return;
  }
  if(state.phase!=='bet'||playerBet(0)===0||playerBet(1)===0){toast('Both players must place a bet first.');return;}
  rolling=true;render();
  const red=state.jackpotRound,max=red?3:6;
  let a=rollDie(max),b=rollDie(max);animateDice(a,b,red);$('diceResult').textContent=`${a} → ${b}`;
  await wait(650);
  while(a===b){$('diceResult').textContent='Same number — reroll both dice';await wait(700);a=rollDie(max);b=rollDie(max);animateDice(a,b,red);$('diceResult').textContent=`${a} → ${b}`;await wait(650);}
  state.lastDice=[a,b];
  const winningOption=b>a?'higher':'lower';
  const matching=optionFor(0)===optionFor(1);
  if(matching&&!state.jackpotRound){
    // Same-choice wagers become jackpot cards; no bonus is paid.
    const transferred=totalBets();
    state.jackpot+=transferred;
    state.cards[0]+=0;state.cards[1]+=0;
    state.bets=[{higher:0,lower:0},{higher:0,lower:0}];
    state.jackpotRound=true;state.phase='bet';
    // Keep the same roller/first bettor for the jackpot hand.
    addHistory(`Same option chosen — ${transferred} cards added to jackpot (${state.jackpot} total)`);
    $('diceResult').textContent='Same option: jackpot triggered!';
    $('roundNote').textContent='Jackpot triggered. Place opposite bets for the red-gold dice round.';
    rolling=false;save();render();return;
  }
  const winner=state.bets.findIndex(bet=>bet[winningOption]>0);
  settleRound(winner,red,winningOption,a,b);
  rolling=false;save();render();
}
function settleRound(winner,isJackpot,winningOption,a,b){
  const loser=1-winner;
  const board=totalBets();
  // Wagers have already been removed from the balances as they were placed.
  state.cards[winner]+=board;
  let bonus=0;
  if(isJackpot){
    state.cards[winner]+=state.jackpot;
    addHistory(`${state.names[winner]} won jackpot: ${board} board cards + ${state.jackpot} jackpot cards`);
    state.jackpot=0;state.jackpotRound=false;state.cooldown=2;
  }else{
    bonus=Math.max(0,board-2);
    // Bonus is transferred from the losing player's card balance.
    const paid=Math.min(state.cards[loser],bonus);
    state.cards[loser]-=paid;state.cards[winner]+=paid;
    addHistory(`${state.names[winner]} won ${winningOption}: ${board} board cards + ${paid} bonus (CP ${board})`);
  }
  state.bets=[{higher:0,lower:0},{higher:0,lower:0}];
  state.lastWinner=winner;state.roller=winner;state.phase='done';
  ageLoans();
  checkGameOver();
  $('diceResult').textContent=`${a} → ${b} · ${state.names[winner]} wins`;
  if(state.gameOver){state.phase='over';}
  save();
}
function ageLoans(){
  for(let i=0;i<2;i++){
    const remaining=[];
    for(const loan of state.loans[i]){
      loan.due-=1;
      if(loan.due<=0){
        // Deadline default: remove the 3 borrowed cards plus 1-card late fee.
        state.cards[i]=Math.max(0,state.cards[i]-4);
        addHistory(`${state.names[i]} missed a loan deadline: 4 cards removed (3 repayment + 1 fee)`);
      }else remaining.push(loan);
    }
    state.loans[i]=remaining;
  }
}
function checkGameOver(){
  for(let i=0;i<2;i++){
    if(state.cards[i]<=0&&state.loansUsed[i]>=3){
      state.gameOver=true;
      addHistory(`${state.names[i]} is out: 0 cards and all 3 loans used`);
      return;
    }
  }
}
function nextRound(){
  if(state.phase!=='done')return;
  if(state.cooldown>0)state.cooldown=Math.max(0,state.cooldown-1);
  state.round+=1;state.phase='bet';state.jackpotRound=false;
  state.bets=[{higher:0,lower:0},{higher:0,lower:0}];
  state.lastDice=[];state.roller=state.lastWinner;
  $('diceResult').textContent='New round — roller places first.';
  save();render();
}
function takeLoan(i){
  if(state.loansUsed[i]>=3||state.gameOver)return;
  state.cards[i]+=3;state.loansUsed[i]+=1;state.loans[i].push({due:3});
  addHistory(`${state.names[i]} borrowed 3 cards (loan ${state.loansUsed[i]}/3)`);
  save();render();toast(`${state.names[i]} received 3 cards. Repay within 3 rounds.`);
}
function repayLoan(i){
  if(!state.loans[i].length){toast('No outstanding loan.');return;}
  if(state.cards[i]<3){toast('You need 3 cards to repay this loan.');return;}
  showModal(`<h2>Repay a loan?</h2><p>${escapeHtml(state.names[i])} will return exactly 3 cards. Choose the oldest outstanding loan first.</p><div class="modal-actions"><button class="btn primary" id="confirmRepay">Repay 3 cards</button><button class="btn ghost" id="cancelRepay">Cancel</button></div>`);
  $('confirmRepay').onclick=()=>{
    state.cards[i]-=3;state.loans[i].shift();addHistory(`${state.names[i]} repaid a 3-card loan`);
    closeModal();save();render();toast('Loan repaid.');
  };
  $('cancelRepay').onclick=closeModal;
}
function newGame(){
  showModal(`<h2>Start a new game?</h2><p>This will replace the currently saved game on this iPad.</p><div class="modal-actions"><button class="btn primary" id="confirmNew">New game</button><button class="btn ghost" id="cancelNew">Keep playing</button></div>`);
  $('confirmNew').onclick=()=>{localStorage.removeItem(SAVE_KEY);state=freshState();closeModal();$('setupScreen').classList.remove('hidden');$('gameScreen').classList.add('hidden');$('roundBadge').textContent='SETUP';};
  $('cancelNew').onclick=closeModal;
}
function rules(){
  showModal(`<h2>How to play</h2>
  <p><b>Starting:</b> Each player gets the agreed starting card count. Both roll a standard six-sided die; highest starts, ties reroll.</p>
  <p><b>Normal round:</b> The roller places first on HIGHER or LOWER. The other player sees that choice, then places on either option. Each player can bet on only one option. The roller rolls twice: second roll higher means HIGHER wins; lower means LOWER wins; a tie rerolls both.</p>
  <p><b>Same option:</b> If both choose the same option, their wagered cards immediately move into the jackpot and a jackpot round begins. No bonus is paid on initiation.</p>
  <p><b>Jackpot:</b> Players bet on opposite options. The red-gold die has two 1s, two 2s and two 3s; roll twice and compare. Winner takes the board and jackpot, with no bonus. Jackpot then cools down for two completed rounds.</p>
  <p><b>Bonus:</b> CP is the total cards on the board. Winner receives CP − 2 cards from the loser. The app transfers only what the loser currently has available if they cannot cover the full bonus.</p>
  <p><b>Loans:</b> Each player may borrow three times per game, receiving 3 cards each time. Repay exactly 3 cards within 3 completed rounds. When a deadline expires, 4 cards are removed (3 borrowed + 1 fee). If a player has 0 cards after using all 3 loans, they lose.</p>
  <p class="tiny muted">The bonus-shortfall rule and the treatment of a jackpot trigger during cooldown are implementation assumptions; adjust them in game.js if your house rules differ.</p>`);
}
function resume(){
  try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if(!saved||!saved.started)return false;state=saved;render();return true;}catch(e){return false;}
}
document.querySelectorAll('[data-bet-player]').forEach(button=>button.addEventListener('click',()=>placeBet(Number(button.dataset.betPlayer),button.dataset.option,Number(button.dataset.step))));
$('startGameButton').addEventListener('click',startGame);
$('continueButton').addEventListener('click',()=>{if(!resume())toast('No saved game found.');});
$('rollButton').addEventListener('click',roll);
$('clearBetsButton').addEventListener('click',clearBets);
$('nextRoundButton').addEventListener('click',nextRound);
$('goldLoanButton').addEventListener('click',()=>takeLoan(0));
$('rubyLoanButton').addEventListener('click',()=>takeLoan(1));
$('rulesButton').addEventListener('click',rules);
$('newGameButton').addEventListener('click',newGame);
$('modalClose').addEventListener('click',closeModal);
$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
if(localStorage.getItem(SAVE_KEY))$('continueButton').classList.remove('hidden');
render();
