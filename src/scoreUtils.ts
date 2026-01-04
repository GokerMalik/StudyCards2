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

export function getRewardForDays(daysSince: number) {
  return Math.min(daysSince + 1, 10);
}

type CardLike = {
  totalAnswered?: number;
  correctAnswered?: number;
  totalReward?: number;
  lastSeen?: string;
  lastCorrect?: string;
};

export function getCardScore(card: CardLike, now: Date) {
  const total = card.totalAnswered || 0;
  if (!total) return 0;
  let totalReward = card.totalReward;
  if (typeof totalReward !== 'number') {
    const lastSeenRef = card.lastSeen || card.lastCorrect || '';
    const daysSince = getDaysSince(lastSeenRef, now);
    const rewardFactor = getRewardForDays(daysSince);
    totalReward = (card.correctAnswered || 0) * rewardFactor;
  }
  return totalReward / total;
}

export function getCardScoreLabel(card: CardLike, now = new Date()) {
  const total = card.totalAnswered || 0;
  if (!total) return 'n/a';
  const score = getCardScore(card, now);
  return Number.isFinite(score) ? score.toFixed(2) : 'n/a';
}
