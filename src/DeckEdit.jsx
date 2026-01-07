import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { loadDecks, saveDecks, loadCategories, loadCards } from './storage';
import { addCardToDeck, linkCardToDeck, moveCardBetweenDecks, removeCardFromDeck, updateCard } from './cardManager';
import { getCardAttemptWeightLabel, getCardDayLabel, getCardScoreLabel } from './scoreUtils';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UndoIcon from '@mui/icons-material/Undo';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function DeckTargetPicker({ value, onChange, onConfirm, onCancel, actionLabel, actionIcon, decks, getDeckLabel }) {
  return (
    <>
      <TextField
        select
        SelectProps={{ native: true }}
        value={value}
        onChange={onChange}
        size="small"
        sx={{ mr: 1, minWidth: 180 }}
      >
        <option value="">Select deck...</option>
        {decks.map(deck => (
          <option key={deck.id} value={deck.id}>
            {getDeckLabel(deck)}
          </option>
        ))}
      </TextField>
      <Button onClick={onConfirm} color="primary" size="small" startIcon={actionIcon} disabled={!value}>{actionLabel}</Button>
      <Button onClick={onCancel} color="inherit" size="small">Cancel</Button>
    </>
  );
}

export default function DeckEdit({ deckId }) {
  const [allDecks, setAllDecks] = useState([]);
  const [deck, setDeck] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [name, setName] = useState('');
  const [studyMode, setStudyMode] = useState('ask_backside');
  const [categoryId, setCategoryId] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingFront, setEditingFront] = useState('');
  const [editingBack, setEditingBack] = useState('');
  const [movingCardId, setMovingCardId] = useState(null);
  const [moveTargetDeck, setMoveTargetDeck] = useState('');
  const [cloningCardId, setCloningCardId] = useState(null);
  const [cloneTargetDeck, setCloneTargetDeck] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const decks = await loadDecks();
      const deck = decks.find(d => d.id === deckId);
      setAllDecks(decks);
      setDeck(deck);
      setName(deck ? deck.name : '');
      setStudyMode(deck ? deck.studyMode : 'ask_backside');
      setCategoryId(deck ? deck.categoryId : '');
      setCategories(await loadCategories());
      setAllCards(await loadCards());
    }
    fetchData();
  }, [deckId]);

  // Save changes to deck
  const saveDeck = async (updates) => {
    const updatedDeck = { ...deck, ...updates };
    const updatedDecks = allDecks.map(d => d.id === deck.id ? updatedDeck : d);
    await saveDecks(updatedDecks);
    setAllDecks(updatedDecks);
    setDeck(updatedDeck);
  };

  const handleNameChange = async (e) => {
    setName(e.target.value);
    await saveDeck({ name: e.target.value });
  };

  const handleStudyModeChange = async (e) => {
    setStudyMode(e.target.value);
    await saveDeck({ studyMode: e.target.value });
  };

  const handleCategoryChange = async (e) => {
    setCategoryId(e.target.value);
    await saveDeck({ categoryId: e.target.value });
  };

  // Get cards for this deck
  const cards = useMemo(() => {
    if (!deck) return [];
    return deck.cardIds.map(id => allCards.find(c => c.id === id)).filter(Boolean);
  }, [deck, allCards]);

  // Add new card
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    const newCard = {
      id: 'card_' + Date.now(),
      front: newFront.trim(),
      back: newBack.trim(),
      totalAnswered: 0,
      correctAnswered: 0,
      totalReward: 0,
      totalAttemptWeight: 0,
    };
    const { cards: updatedCards, decks: updatedDecks } = await addCardToDeck(deck.id, newCard);
    setAllCards(updatedCards);
    setAllDecks(updatedDecks);
    setDeck(updatedDecks.find(d => d.id === deck.id) || null);
    setNewFront('');
    setNewBack('');
  };

  // Delete card
  const handleDeleteCard = (cardId) => {
    setConfirmDeleteId(cardId);
  };

  const confirmDelete = async () => {
    const cardId = confirmDeleteId;
    setConfirmDeleteId(null);
    const { cards: updatedCards, decks: updatedDecks } = await removeCardFromDeck(deck.id, cardId);
    setAllCards(updatedCards);
    setAllDecks(updatedDecks);
    setDeck(updatedDecks.find(d => d.id === deck.id) || null);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  // Start editing card
  const handleEditCard = (card) => {
    setEditingCardId(card.id);
    setEditingFront(card.front);
    setEditingBack(card.back);
  };

  // Save edited card
  const handleSaveEdit = async (cardId) => {
    const updatedCards = await updateCard(cardId, { front: editingFront, back: editingBack });
    setAllCards(updatedCards);
    setEditingCardId(null);
    setEditingFront('');
    setEditingBack('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditingFront('');
    setEditingBack('');
  };

  // Start moving card
  const handleStartMoveCard = (cardId) => {
    setMovingCardId(cardId);
    setMoveTargetDeck('');
    setCloningCardId(null);
    setCloneTargetDeck('');
  };

  // Confirm move card
  const handleConfirmMoveCard = async (cardId) => {
    if (!moveTargetDeck) return;
    const { decks: updatedDecks } = await moveCardBetweenDecks(cardId, deck.id, moveTargetDeck);
    setAllDecks(updatedDecks);
    setDeck(updatedDecks.find(d => d.id === deck.id) || null);
    setMovingCardId(null);
    setMoveTargetDeck('');
  };

  // Cancel move
  const handleCancelMoveCard = () => {
    setMovingCardId(null);
    setMoveTargetDeck('');
  };

  const handleStartCloneCard = (cardId) => {
    setCloningCardId(cardId);
    setCloneTargetDeck('');
    setMovingCardId(null);
    setMoveTargetDeck('');
  };

  const handleConfirmCloneCard = async (cardId) => {
    if (!cloneTargetDeck) return;
    const { decks: updatedDecks } = await linkCardToDeck(cloneTargetDeck, cardId);
    setAllDecks(updatedDecks);
    setDeck(updatedDecks.find(d => d.id === deck.id) || null);
    setCloningCardId(null);
    setCloneTargetDeck('');
  };

  const handleCancelCloneCard = () => {
    setCloningCardId(null);
    setCloneTargetDeck('');
  };

  // Reset statistics for a card
  const handleResetStats = async (cardId) => {
    if (!window.confirm('Reset statistics for this card?')) return;
    const updatedCards = await updateCard(cardId, { totalAnswered: 0, correctAnswered: 0, totalReward: 0, totalAttemptWeight: 0, lastCorrect: undefined, lastSeen: undefined });
    setAllCards(updatedCards);
  };

  // List of other decks for moving
  const otherDecks = useMemo(() => allDecks.filter(d => d.id !== deckId), [allDecks, deckId]);
  const getCategoryName = (deck) => {
    const cat = categories.find(c => c.id === deck.categoryId);
    return cat ? cat.name : 'Unknown';
  };
  const getDeckLabel = (deck) => `${getCategoryName(deck)}: ${deck.name}`;

  if (!deck) return <div>Deck not found.</div>;

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" mt={4}>
      <Card sx={{ minWidth: 600, maxWidth: 1200, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Edit Deck
          </Typography>
          <Box mb={2} display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Name"
              value={name}
              onChange={handleNameChange}
              size="small"
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="Study Mode"
              select
              value={studyMode}
              onChange={handleStudyModeChange}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ask_backside">Ask Backside</MenuItem>
              <MenuItem value="ask_frontside">Ask Frontside</MenuItem>
              <MenuItem value="ask_both">Ask Both</MenuItem>
            </TextField>
            <TextField
              label="Category"
              select
              value={categoryId}
              onChange={handleCategoryChange}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Cards in this Deck
          </Typography>
          {cards.length === 0 ? (
            <Typography color="text.secondary">No cards in this deck.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <List>
                {cards.map(card => (
                  <ListItem key={card.id} divider sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {editingCardId === card.id ? (
                      <>
                        <TextField
                          value={editingFront}
                          onChange={e => setEditingFront(e.target.value)}
                          size="small"
                          sx={{ mr: 1, minWidth: 100 }}
                        />
                        <TextField
                          value={editingBack}
                          onChange={e => setEditingBack(e.target.value)}
                          size="small"
                          sx={{ mr: 1, minWidth: 100 }}
                        />
                        <Button onClick={() => handleSaveEdit(card.id)} color="success" size="small" startIcon={<SaveIcon />}>Save</Button>
                        <Button onClick={handleCancelEdit} color="inherit" size="small" startIcon={<CancelIcon />}>Cancel</Button>
                      </>
                    ) : movingCardId === card.id ? (
                      <DeckTargetPicker
                        value={moveTargetDeck}
                        onChange={e => setMoveTargetDeck(e.target.value)}
                        onConfirm={() => handleConfirmMoveCard(card.id)}
                        onCancel={handleCancelMoveCard}
                        actionLabel="Move"
                        actionIcon={<SwapHorizIcon />}
                        decks={otherDecks}
                        getDeckLabel={getDeckLabel}
                      />
                    ) : cloningCardId === card.id ? (
                      <DeckTargetPicker
                        value={cloneTargetDeck}
                        onChange={e => setCloneTargetDeck(e.target.value)}
                        onConfirm={() => handleConfirmCloneCard(card.id)}
                        onCancel={handleCancelCloneCard}
                        actionLabel="Clone"
                        actionIcon={<ContentCopyIcon />}
                        decks={otherDecks}
                        getDeckLabel={getDeckLabel}
                      />
                    ) : (
                      <>
                        <Box sx={{ minWidth: 200, maxWidth: 400, flex: '0 1 400px' }}>
                          <Typography component="div" sx={{ fontWeight: 500 }}>
                            Front: {card.front}
                          </Typography>
                          <Typography component="div" sx={{ fontWeight: 500 }}>
                            Back: {card.back}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 1, minWidth: 240, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            Seen: {card.totalAnswered}, Correct: {card.correctAnswered}, Day: {getCardDayLabel(card)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            Total Weight: {getCardAttemptWeightLabel(card)}, Score: {getCardScoreLabel(card)}
                          </Typography>
                        </Box>
                        <Button onClick={() => handleEditCard(card)} color="primary" size="small" startIcon={<EditIcon />} sx={{ ml: 1 }} />
                        <Button onClick={() => handleResetStats(card.id)} color="warning" size="small" startIcon={<UndoIcon />} sx={{ ml: 1 }} />
                        <Button onClick={() => handleDeleteCard(card.id)} color="error" size="small" startIcon={<DeleteIcon />} sx={{ ml: 1 }} />
      <Dialog open={!!confirmDeleteId} onClose={cancelDelete}>
        <DialogTitle>Remove Card</DialogTitle>
        <DialogContent>
          Remove this card from this deck? It will be deleted only if it is not used elsewhere.
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error">Remove</Button>
        </DialogActions>
      </Dialog>
                        <Button onClick={() => handleStartMoveCard(card.id)} color="primary" size="small" startIcon={<SwapHorizIcon />} sx={{ ml: 1 }} />
                        <Button onClick={() => handleStartCloneCard(card.id)} color="primary" size="small" startIcon={<ContentCopyIcon />} sx={{ ml: 1 }} />
                      </>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          <Box mt={3} component="form" onSubmit={handleAddCard} display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <TextField
              placeholder="Front"
              value={newFront}
              onChange={e => setNewFront(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            />
            <TextField
              placeholder="Back"
              value={newBack}
              onChange={e => setNewBack(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            />
            <Button type="submit" variant="contained" disabled={!newFront.trim() || !newBack.trim()}>
              Add Card
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 
