const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDaysSince(dateString: string | undefined, now: Date) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;
  const utcThen = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((utcNow - utcThen) / MS_PER_DAY);
  return diffDays > 0 ? diffDays : 0;
}

export function getPositiveWeight(daysSince: number) {
  return Math.min(daysSince + 1, 10);
}

export function getNegativeWeight(daysSince: number) {
  return Math.min((daysSince + 1) * 0.7, 10);
}

type CardLike = {
  totalAnswered?: number;
  correctAnswered?: number;
  totalReward?: number;
  totalAttemptWeight?: number;
  lastSeen?: string;
  lastCorrect?: string;
};

export function getCardScore(card: CardLike) {
  const total = card.totalAnswered || 0;
  if (!total) return 0;
  const baseWeight = getCardBaseWeight(card);
  const attemptWeight = getCardAttemptWeight(card) + baseWeight;
  const correctWeight = typeof card.totalReward === 'number'
    ? card.totalReward
    : total * getPositiveWeight(0);
  if (!attemptWeight) return 0;
  return correctWeight / attemptWeight;
}

export function getCardAttemptWeight(card: CardLike) {
  const total = card.totalAnswered || 0;
  if (!total) return 0;
  return typeof card.totalAttemptWeight === 'number'
    ? card.totalAttemptWeight
    : total * getPositiveWeight(0);
}

export function getCardBaseWeight(card: CardLike) {
  const correct = card.correctAnswered || 0;
  return Math.max(10 - correct, 0);
}

export function getCardAttemptWeightLabel(card: CardLike) {
  const weight = getCardAttemptWeight(card);
  if (!Number.isFinite(weight)) return 'n/a';
  const baseWeight = getCardBaseWeight(card);
  if (baseWeight > 0) {
    return `${weight.toFixed(2)} + ${baseWeight}`;
  }
  return weight.toFixed(2);
}

export function getCardDayLabel(card: CardLike) {
  const lastSeenRef = card.lastSeen || card.lastCorrect || '';
  const daysSince = getDaysSince(lastSeenRef, new Date());
  const dayValue = daysSince + 1;
  return dayValue > 99 ? '99+' : String(dayValue);
}

export function getCardScoreLabel(card: CardLike) {
  const total = card.totalAnswered || 0;
  if (!total) return 'n/a';
  const score = getCardScore(card);
  return Number.isFinite(score) ? score.toFixed(2) : 'n/a';
}
