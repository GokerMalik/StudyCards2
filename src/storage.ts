import { Category, Deck, Card, Collection } from './models';

// Add this for TypeScript to recognize electronAPI
declare global {
  interface Window {
    electronAPI?: {
      readData: () => Promise<{ categories: Category[]; decks: Deck[]; cards: Card[] }>;
      writeData: (data: { categories: Category[]; decks: Deck[]; cards: Card[] }) => Promise<any>;
    };
  }
}

// Storage keys
const CATEGORY_KEY = 'categories';
const DECK_KEY = 'decks';
const CARD_KEY = 'cards';
const COLLECTION_KEY = 'collections';

// Helper to check if running in Electron
const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

// Read all data (categories, decks, cards)
async function readAllData(): Promise<{ categories: Category[]; decks: Deck[]; cards: Card[]; collections?: Collection[] }> {
  if (isElectron()) {
    return await window.electronAPI!.readData();
  } else {
    return {
      categories: JSON.parse(localStorage.getItem(CATEGORY_KEY) || '[]'),
      decks: JSON.parse(localStorage.getItem(DECK_KEY) || '[]'),
      cards: JSON.parse(localStorage.getItem(CARD_KEY) || '[]'),
      collections: JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]'),
    };
  }
}

// Write all data
async function writeAllData(data: { categories: Category[]; decks: Deck[]; cards: Card[]; collections?: Collection[] }) {
  if (isElectron()) {
    await window.electronAPI!.writeData(data);
  } else {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(data.categories));
    localStorage.setItem(DECK_KEY, JSON.stringify(data.decks));
    localStorage.setItem(CARD_KEY, JSON.stringify(data.cards));
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(data.collections || []));
  }
}

// Category utilities
export async function saveCategories(categories: Category[]) {
  const data = await readAllData();
  data.categories = categories;
  await writeAllData(data);
}

export async function loadCategories(): Promise<Category[]> {
  const data = await readAllData();
  return data.categories;
}

// Deck utilities
export async function saveDecks(decks: Deck[]) {
  const data = await readAllData();
  data.decks = decks;
  await writeAllData(data);
}

export async function loadDecks(): Promise<Deck[]> {
  const data = await readAllData();
  return data.decks;
}

// Card utilities
export async function saveCards(cards: Card[]) {
  const data = await readAllData();
  data.cards = cards;
  await writeAllData(data);
}

export async function loadCards(): Promise<Card[]> {
  const data = await readAllData();
  return data.cards;
}

// Collection utilities
export async function saveCollections(collections: Collection[]) {
  const data = await readAllData();
  data.collections = collections;
  await writeAllData(data);
}

export async function loadCollections(): Promise<Collection[]> {
  const data = await readAllData();
  return data.collections || [];
}

// Sample data
const sampleCategories: Category[] = [
  { id: 'cat1', name: 'Spanish' },
  { id: 'cat2', name: 'French' },
];

const sampleCards: Card[] = [
  { id: 'card1', front: 'cat', back: 'gato', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card2', front: 'dog', back: 'perro', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card3', front: 'house', back: 'maison', totalAnswered: 0, correctAnswered: 0 },
  { id: 'card4', front: 'water', back: 'eau', totalAnswered: 0, correctAnswered: 0 },
];

const sampleDecks: Deck[] = [
  {
    id: 'deck1',
    name: 'Basic Animals',
    categoryId: 'cat1',
    studyMode: 'ask_backside',
    cardIds: ['card1', 'card2'],
  },
  {
    id: 'deck2',
    name: 'Basic Nouns',
    categoryId: 'cat2',
    studyMode: 'ask_both',
    cardIds: ['card3', 'card4'],
  },
];

export async function initializeSampleData() {
  const data = await readAllData();
  if (!data.categories.length) {
    await saveCategories(sampleCategories);
  }
  if (!data.decks.length) {
    await saveDecks(sampleDecks);
  }
  if (!data.cards.length) {
    await saveCards(sampleCards);
  }
} 