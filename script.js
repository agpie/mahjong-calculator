const MULTIPLIERS = {
  menQing: 2,
  daDiao: 2,
  zhuoWuKui: 2,
  yiTiaoLong: 2,
  qiDui: 4,
  qingYiSe: 8
};

const SEATS = ["east", "south", "west", "north"];

const players = SEATS.map(seat => ({
  seat,
  label: seat.charAt(0).toUpperCase() + seat.slice(1),
  score: 0,
  isZhuang: false
}));

function resetScores() {
  players.forEach(p => p.score = 0);
}

function getPlayer(seat) {
  return players.find(p => p.seat === seat);
}

function getZhuang() {
  return players.find(p => p.isZhuang);
}

function getNormals() {
  return players.filter(p => !p.isZhuang);
}

function pay(from, to, amount) {
  if (!from || !to || amount <= 0) return;
  from.score -= amount;
  to.score += amount;
}

function readState() {
  return {
    winnerSeat: document.querySelector('input[name="winner"]:checked')?.value,
    zhuangSeat: document.querySelector('input[name="zhuang"]:checked')?.value,
    tileSource: document.querySelector('input[name="tileSource"]:checked')?.value, // "none" = zi mo
    multipliers: [...document.querySelectorAll('input[name="multiplier"]:checked')].map(i => i.value),
    mingGang: Number(document.querySelector('input[name="mingGang"]').value) || 0,
    anGang: Number(document.querySelector('input[name="anGang"]').value) || 0
  };
}

function determineWinCase(winner, zhuang, discarder) {
  const isZiMo = !discarder;
  const winnerIsZhuang = winner.isZhuang;

  if (isZiMo && !winnerIsZhuang) return 1; // Normal Zi Mo
  if (isZiMo && winnerIsZhuang) return 2;  // Zhuang Zi Mo
  if (!isZiMo && !winnerIsZhuang && !discarder.isZhuang) return 3;
  if (!isZiMo && !winnerIsZhuang && discarder.isZhuang) return 4;
  if (!isZiMo && winnerIsZhuang) return 5;

  throw new Error("Invalid win case");
}

function applyBaseHand(caseId, winner, zhuang, discarder) {
  switch (caseId) {

    case 1: // Normal Zi Mo (Total 16)
      getNormals().forEach(p => { if (p !== winner) pay(p, winner, 4); });
      pay(zhuang, winner, 8);
      return 16;

    case 2: // Zhuang Zi Mo (Total 24)
      getNormals().forEach(p => pay(p, winner, 8));
      return 24;

    case 3: // Normal wins from normal (10)
      pay(discarder, winner, 10);
      return 10;

    case 4: // Normal wins from zhuang (12)
      pay(zhuang, winner, 12);
      return 12;

    case 5: // Zhuang wins from normal (16)
      pay(discarder, winner, 16);
      return 16;
  }
}

function applyMultipliers(baseScore, multipliers) {
  let factor = 1;
  multipliers.forEach(m => {
    factor *= MULTIPLIERS[m] || 1;
  });
  return baseScore * factor;
}

function applyMingGang(caseId, winner, zhuang, discarder, count) {
  if (count === 0) return;

  const totalPerGang = {
    1: 8,
    2: 12,
    3: 8,
    4: 8,
    5: 12
  }[caseId];

  const total = totalPerGang * count;

  switch (caseId) {
    case 1:
      getNormals().forEach(p => { if (p !== winner) pay(p, winner, 2 * count); });
      pay(zhuang, winner, 4 * count);
      break;

    case 2:
      getNormals().forEach(p => pay(p, winner, 4 * count));
      break;

    case 3:
      pay(discarder, winner, total);
      break;

    case 4:
      pay(zhuang, winner, total);
      break;

    case 5:
      pay(discarder, winner, total);
      break;
  }
}

function applyAnGang(caseId, winner, zhuang, discarder, count) {
  if (count === 0) return;
  applyMingGang(caseId, winner, zhuang, discarder, count * 2);
}

function recalculateRound() {
  resetScores();
  const resultDiv = document.getElementById("result");
  const state = readState();

  if (!state.winnerSeat || !state.zhuangSeat || !state.tileSource) {
    resultDiv.innerHTML = "Please complete all selections";
    return;
  }

  players.forEach(p => p.isZhuang = (p.seat === state.zhuangSeat));

  const winner = getPlayer(state.winnerSeat);
  const zhuang = getZhuang();
  const discarder = state.tileSource === "none" ? null : getPlayer(state.tileSource);

  if (discarder && discarder === winner) {
    resultDiv.innerHTML = "Winner cannot discard their own tile";
    return;
  }

  const caseId = determineWinCase(winner, zhuang, discarder);

  // Base hand
  const baseScore = applyBaseHand(caseId, winner, zhuang, discarder);

  // Multipliers
  const finalHandScore = applyMultipliers(baseScore, state.multipliers);

  // Adjust winner score difference caused by multiplier
  const extra = finalHandScore - baseScore;
  if (extra > 0) {
    // Multiply proportionally across existing base payments
    players.forEach(p => {
      if (p !== winner && p.score < 0) {
        const share = Math.abs(p.score) / baseScore;
        const delta = Math.round(extra * share);
        pay(p, winner, delta);
      }
    });
  }

  // Gangs
  applyMingGang(caseId, winner, zhuang, discarder, state.mingGang);
  applyAnGang(caseId, winner, zhuang, discarder, state.anGang);

  // Output
  resultDiv.innerHTML = `
    <h3>Result</h3>
    <ul>
      ${players.map(p => `<li>${p.label}: ${p.score}</li>`).join("")}
    </ul>
  `;
}

document.querySelectorAll("input").forEach(i =>
  i.addEventListener("change", recalculateRound)
);
