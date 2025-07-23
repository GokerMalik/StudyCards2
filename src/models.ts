// Data models for the flashcard app

export type Category = {
  id: string;
  name: string;
};

export type StudyMode = 'ask_backside' | 'ask_frontside' | 'ask_both';

export type Deck = {
  id: string;
  name: string;
  categoryId: string;
  studyMode: StudyMode;
  cardIds: string[];
};

export type Card = {
  id: string;
  front: string;
  back: string;
  totalAnswered: number;
  correctAnswered: number;
  lastCorrect?: string; // ISO date string or undefined
};

export type SessionCard = {
  cardId: string;
  direction: 'front_to_back' | 'back_to_front';
  answeredCorrectly: boolean;
};

export type StudySession = {
  deckId: string;
  cards: SessionCard[];
  currentCardIndex: number;
  completed: boolean;
  totalAnswered: number;
  totalCards: number;
};

export type Collection = {
  id: string;
  name: string;
  cardIds: string[];
}; 