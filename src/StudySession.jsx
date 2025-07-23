import React, { useState, useEffect, useRef } from 'react';
import { loadDecks, loadCards, saveCards, loadCollections, loadCategories } from './storage';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function StudySession({ deckId, collectionId, onSessionComplete }) {
  const [deck, setDeck] = useState(null);
  const [collection, setCollection] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [queue, setQueue] = useState([]); // Now: [{cardId, direction}]
  const [answered, setAnswered] = useState([]); // Now: [{cardId, direction}]
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [completed, setCompleted] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [lastWrongCardId, setLastWrongCardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({});
  const sessionStatsRef = useRef(sessionStats);
  const [decks, setDecks] = useState([]);
  const [categories, setCategories] = useState([]);
  const inputRef = useRef(null);
  const statsInitialized = useRef(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const cards = await loadCards();
      setAllCards(cards);
      const decksData = await loadDecks();
      setDecks(decksData);
      const categoriesData = await loadCategories();
      setCategories(categoriesData);
      if (collectionId) {
        const collections = await loadCollections();
        const col = collections.find(c => c.id === collectionId);
        setCollection(col);
        setDeck(null);
        if (col) {
          const cardQueue = col.cardIds.map(cardId => {
            const deck = decksData.find(d => d.cardIds.includes(cardId));
            let direction = 'front_to_back';
            if (deck) {
              if (deck.studyMode === 'ask_frontside') direction = 'back_to_front';
              if (deck.studyMode === 'ask_both') direction = Math.random() < 0.5 ? 'front_to_back' : 'back_to_front';
            }
            return { cardId, direction };
          });
          setQueue(shuffle(cardQueue));
        }
      } else if (deckId) {
        const deck = decksData.find(d => d.id === deckId);
        setDeck(deck);
        setCollection(null);
        if (deck) {
          let cardQueue = deck.cardIds.map(cardId => {
            let direction = 'front_to_back';
            if (deck.studyMode === 'ask_frontside') direction = 'back_to_front';
            if (deck.studyMode === 'ask_both') direction = Math.random() < 0.5 ? 'front_to_back' : 'back_to_front';
            return { cardId, direction };
          });
          setQueue(shuffle(cardQueue));
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [deckId, collectionId]);

  // Track stats for this session (only initialize once per session)
  useEffect(() => {
    if (collectionId && collection && !statsInitialized.current) {
      const stats = {};
      collection.cardIds.forEach(id => {
        stats[id] = { total: 0, correct: 0 };
      });
      setSessionStats(stats);
      statsInitialized.current = true;
    } else if (deckId && deck && !statsInitialized.current) {
      const stats = {};
      deck.cardIds.forEach(id => {
        stats[id] = { total: 0, correct: 0 };
      });
      setSessionStats(stats);
      statsInitialized.current = true;
    }
  }, [deckId, deck, collectionId, collection]);

  // Reset statsInitialized when deckId changes
  useEffect(() => {
    statsInitialized.current = false;
  }, [deckId, collectionId]);

  useEffect(() => {
    sessionStatsRef.current = sessionStats;
  }, [sessionStats]);

  useEffect(() => {
    if (!awaitingContinue && inputRef.current) {
      inputRef.current.focus();
    }
  }, [awaitingContinue, queue.length]);

  useEffect(() => {
    if (!awaitingContinue) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [awaitingContinue]);

  // On session complete, update card stats in storage
  useEffect(() => {
    if (!completed) return;
    async function updateStats() {
      const now = new Date().toISOString();
      const cards = await loadCards();
      const stats = sessionStatsRef.current;
      console.log('Session complete! Logging stats:', stats);
      console.log('Card IDs in session:', cardIds);
      const updatedCards = cards.map(card => {
        if (stats[card.id]) {
          return {
            ...card,
            totalAnswered: (card.totalAnswered || 0) + stats[card.id].total,
            correctAnswered: (card.correctAnswered || 0) + stats[card.id].correct,
            lastCorrect:
              (stats[card.id].correct > 0)
                ? now
                : card.lastCorrect || '',
          };
        }
        return card;
      });
      console.log('Updated cards to save:', updatedCards);
      await saveCards(updatedCards);
      if (onSessionComplete) onSessionComplete();
    }
    updateStats();
    // eslint-disable-next-line
  }, [completed]);

  if (loading) return <Box mt={4} textAlign="center"><Typography>Loading session...</Typography></Box>;
  if (collectionId && !collection) return <Box mt={4} textAlign="center"><Typography>Collection not found.</Typography></Box>;
  if (deckId && !deck) return <Box mt={4} textAlign="center"><Typography>Deck not found.</Typography></Box>;
  const cardIds = collectionId && collection ? collection.cardIds : deck && deck.cardIds;
  if (!cardIds || !cardIds.length) return <Box mt={4} textAlign="center"><Typography>No cards in this {collectionId ? 'collection' : 'deck'}.</Typography></Box>;

  // Use queue of {cardId, direction}
  const current = queue[0];
  const currentCard = current ? allCards.find((c) => c.id === current.cardId) : null;
  const currentDirection = current ? current.direction : 'front_to_back';

  // For collection study, get deck and category for current card
  let deckInfo = null;
  let categoryInfo = null;
  if (collectionId && currentCard) {
    deckInfo = decks.find(d => d.cardIds.includes(currentCard.id));
    if (deckInfo) {
      categoryInfo = categories.find(c => c.id === deckInfo.categoryId);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentCard || awaitingContinue) return;
    // Update session stats for this card
    setSessionStats(prev => {
      const updated = {
        ...prev,
        [currentCard.id]: {
          total: (prev[currentCard.id]?.total || 0) + 1,
          correct: (prev[currentCard.id]?.correct || 0) + (checkAnswer(input, currentCard, currentDirection) ? 1 : 0)
        }
      };
      sessionStatsRef.current = updated;
      return updated;
    });
    if (checkAnswer(input, currentCard, currentDirection)) {
      setFeedback('Correct!');
      setAnswered([...answered, { cardId: current.cardId, direction: currentDirection }]);
      const newQueue = queue.slice(1);
      if (newQueue.length === 0) {
        setCompleted(true);
      }
      setQueue(newQueue);
      setInput('');
      setFeedback('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    } else {
      setFeedback(`Try again! Card will reappear. Correct answer: "${getExpectedAnswer(currentCard, currentDirection)}"`);
      setAwaitingContinue(true);
      setLastWrongCardId(current);
    }
  };

  const handleContinue = () => {
    // Re-queue card at a random position (not first)
    const newQueue = queue.slice(1);
    const insertAt = Math.floor(Math.random() * (newQueue.length + 1));
    newQueue.splice(insertAt, 0, lastWrongCardId);
    setQueue(newQueue);
    setInput('');
    setFeedback('');
    setAwaitingContinue(false);
    setLastWrongCardId(null);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const handlePass = () => {
    // Re-queue card at a random position (not first), do not update stats
    const newQueue = queue.slice(1);
    const insertAt = Math.floor(Math.random() * (newQueue.length + 1));
    newQueue.splice(insertAt, 0, current);
    setQueue(newQueue);
    setInput('');
    setFeedback('');
    setAwaitingContinue(false);
    setLastWrongCardId(null);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  function checkAnswer(input, card, direction) {
    if (!card) return false;
    if (direction === 'front_to_back') {
      return input.trim().toLowerCase() === card.back.trim().toLowerCase();
    } else {
      return input.trim().toLowerCase() === card.front.trim().toLowerCase();
    }
  }

  function getExpectedAnswer(card, direction) {
    if (!card) return '';
    return direction === 'front_to_back' ? card.back : card.front;
  }

  if (completed) {
    return (
      <Box mt={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Card sx={{ minWidth: 350, maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h5" gutterBottom>Session complete!</Typography>
            <Typography>You answered all cards correctly.</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Card sx={{ minWidth: 350, maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {deck ? `Study Session: ${deck.name}` : collection ? `Study Session: ${collection.name}` : 'Study Session'}
          </Typography>
          {collectionId && currentCard && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Deck: {deckInfo ? deckInfo.name : 'Unknown'} | Category: {categoryInfo ? categoryInfo.name : 'Unknown'}
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Box mb={2}>
            <Typography variant="subtitle1" color="text.secondary">
              {currentDirection === 'front_to_back' ? 'Front:' : 'Back:'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {currentCard && (currentDirection === 'front_to_back' ? currentCard.front : currentCard.back)}
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit} display="flex" gap={1} alignItems="center" mb={2}>
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              disabled={awaitingContinue}
              size="small"
              label="Your Answer"
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" color="primary" disabled={awaitingContinue}>
              Submit
            </Button>
            <Button type="button" variant="outlined" color="secondary" onClick={handlePass} disabled={awaitingContinue}>
              Pass
            </Button>
          </Box>
          {feedback && (
            <Box mt={1} mb={1}>
              <Typography color={feedback.startsWith('Correct!') ? 'success.main' : 'error.main'}>
                {feedback}
              </Typography>
            </Box>
          )}
          {awaitingContinue && (
            <Box mt={1} mb={1} textAlign="center">
              <Button onClick={handleContinue} variant="outlined" startIcon={<ReplayIcon />}>Continue</Button>
              <Typography variant="caption" color="text.secondary" display="block">(Or press Enter)</Typography>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Cards remaining: {queue.length}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
} 