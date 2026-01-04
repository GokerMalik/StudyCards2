import { loadCards, loadDecks, loadCollections, saveCards, saveDecks, saveCollections } from './storage';
import { Card, Deck, Collection } from './models';

type CardIndexEntry = {
  deckIds: Set<string>;
  collectionIds: Set<string>;
};

export type CardIndex = Map<string, CardIndexEntry>;

function ensureIndexEntry(index: CardIndex, cardId: string): CardIndexEntry {
  let entry = index.get(cardId);
  if (!entry) {
    entry = { deckIds: new Set<string>(), collectionIds: new Set<string>() };
    index.set(cardId, entry);
  }
  return entry;
}

export function buildCardIndex(decks: Deck[], collections: Collection[]): CardIndex {
  const index: CardIndex = new Map();
  decks.forEach(deck => {
    deck.cardIds.forEach(cardId => {
      ensureIndexEntry(index, cardId).deckIds.add(deck.id);
    });
  });
  collections.forEach(collection => {
    collection.cardIds.forEach(cardId => {
      ensureIndexEntry(index, cardId).collectionIds.add(collection.id);
    });
  });
  return index;
}

function getReferencedCardIds(index: CardIndex): Set<string> {
  const referenced = new Set<string>();
  index.forEach((entry, cardId) => {
    if (entry.deckIds.size > 0 || entry.collectionIds.size > 0) {
      referenced.add(cardId);
    }
  });
  return referenced;
}

function pruneOrphanedCards(cards: Card[], decks: Deck[], collections: Collection[]) {
  const index = buildCardIndex(decks, collections);
  const referenced = getReferencedCardIds(index);
  const updatedCards = cards.filter(card => referenced.has(card.id));
  const removed = updatedCards.length !== cards.length;
  return { updatedCards, removed };
}

async function loadAllData() {
  const [cards, decks, collections] = await Promise.all([
    loadCards(),
    loadDecks(),
    loadCollections(),
  ]);
  return { cards, decks, collections };
}

function addUniqueId(list: string[], id: string) {
  return list.includes(id) ? list : [...list, id];
}

export async function addCardToDeck(deckId: string, newCard: Card) {
  const { cards, decks, collections } = await loadAllData();
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return { cards, decks, collections };

  const hasCard = cards.some(card => card.id === newCard.id);
  const updatedCards = hasCard ? cards : [...cards, newCard];
  const updatedDecks = decks.map(d => (
    d.id === deckId ? { ...d, cardIds: addUniqueId(d.cardIds, newCard.id) } : d
  ));

  await saveCards(updatedCards);
  await saveDecks(updatedDecks);

  return { cards: updatedCards, decks: updatedDecks, collections };
}

export async function linkCardToDeck(deckId: string, cardId: string) {
  const { cards, decks, collections } = await loadAllData();
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return { cards, decks, collections };

  const updatedDecks = decks.map(d => (
    d.id === deckId ? { ...d, cardIds: addUniqueId(d.cardIds, cardId) } : d
  ));

  await saveDecks(updatedDecks);

  return { cards, decks: updatedDecks, collections };
}

export async function updateCard(cardId: string, updates: Partial<Card>) {
  const cards = await loadCards();
  const updatedCards = cards.map(card => (
    card.id === cardId ? { ...card, ...updates } : card
  ));
  await saveCards(updatedCards);
  return updatedCards;
}

export async function moveCardBetweenDecks(cardId: string, fromDeckId: string, toDeckId: string) {
  const { cards, decks, collections } = await loadAllData();
  const updatedDecks = decks.map(deck => {
    if (deck.id === fromDeckId) {
      return { ...deck, cardIds: deck.cardIds.filter(id => id !== cardId) };
    }
    if (deck.id === toDeckId) {
      return { ...deck, cardIds: addUniqueId(deck.cardIds, cardId) };
    }
    return deck;
  });

  await saveDecks(updatedDecks);

  return { cards, decks: updatedDecks, collections };
}

export async function removeCardFromDeck(deckId: string, cardId: string) {
  const { cards, decks, collections } = await loadAllData();
  const updatedDecks = decks.map(deck => (
    deck.id === deckId ? { ...deck, cardIds: deck.cardIds.filter(id => id !== cardId) } : deck
  ));
  const { updatedCards, removed } = pruneOrphanedCards(cards, updatedDecks, collections);

  await saveDecks(updatedDecks);
  if (removed) {
    await saveCards(updatedCards);
  }

  return { cards: updatedCards, decks: updatedDecks, collections };
}

export async function removeCardFromCollection(collectionId: string, cardId: string) {
  const { cards, decks, collections } = await loadAllData();
  const updatedCollections = collections.map(collection => (
    collection.id === collectionId
      ? { ...collection, cardIds: collection.cardIds.filter(id => id !== cardId) }
      : collection
  ));
  const { updatedCards, removed } = pruneOrphanedCards(cards, decks, updatedCollections);

  await saveCollections(updatedCollections);
  if (removed) {
    await saveCards(updatedCards);
  }

  return { cards: updatedCards, decks, collections: updatedCollections };
}

export async function removeDeck(deckId: string) {
  return removeDecks([deckId]);
}

export async function removeDecks(deckIds: string[]) {
  const { cards, decks, collections } = await loadAllData();
  const deckIdSet = new Set(deckIds);
  const updatedDecks = decks.filter(deck => !deckIdSet.has(deck.id));
  const { updatedCards, removed } = pruneOrphanedCards(cards, updatedDecks, collections);

  await saveDecks(updatedDecks);
  if (removed) {
    await saveCards(updatedCards);
  }

  return { cards: updatedCards, decks: updatedDecks, collections };
}

export async function removeCollection(collectionId: string) {
  const { cards, decks, collections } = await loadAllData();
  const updatedCollections = collections.filter(collection => collection.id !== collectionId);
  const { updatedCards, removed } = pruneOrphanedCards(cards, decks, updatedCollections);

  await saveCollections(updatedCollections);
  if (removed) {
    await saveCards(updatedCards);
  }

  return { cards: updatedCards, decks, collections: updatedCollections };
}
