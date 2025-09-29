import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { loadDecks, saveDecks, loadCategories, loadCards, saveCards, loadCollections, saveCollections } from './storage';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UndoIcon from '@mui/icons-material/Undo';

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

  if (!deck) return <div>Deck not found.</div>;

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
  const cards = deck.cardIds.map(id => allCards.find(c => c.id === id)).filter(Boolean);

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
    };
    const updatedCards = [...allCards, newCard];
    await saveCards(updatedCards);
    setAllCards(updatedCards);
    // Update deck's cardIds
    const updatedCardIds = [...deck.cardIds, newCard.id];
    await saveDeck({ cardIds: updatedCardIds });
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
    const updatedCards = allCards.filter(c => c.id !== cardId);
    await saveCards(updatedCards);
    setAllCards(updatedCards);
    // Remove from deck
    const updatedCardIds = deck.cardIds.filter(id => id !== cardId);
    await saveDeck({ cardIds: updatedCardIds });

    // Remove from all collections (workouts)
    const allCollections = await loadCollections();
    const updatedCollections = allCollections.map(col => ({
      ...col,
      cardIds: col.cardIds.filter(id => id !== cardId)
    }));
    await saveCollections(updatedCollections);
    setTimeout(() => {
      if (inputRef && inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
    setTimeout(() => {
      if (inputRef && inputRef.current) inputRef.current.focus();
    }, 0);
  };

  // Start editing card
  const handleEditCard = (card) => {
    setEditingCardId(card.id);
    setEditingFront(card.front);
    setEditingBack(card.back);
  };

  // Save edited card
  const handleSaveEdit = async (cardId) => {
    const updatedCards = allCards.map(c =>
      c.id === cardId ? { ...c, front: editingFront, back: editingBack } : c
    );
    await saveCards(updatedCards);
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
  };

  // Confirm move card
  const handleConfirmMoveCard = async (cardId) => {
    if (!moveTargetDeck) return;
    // Remove from current deck
    const updatedCardIds = deck.cardIds.filter(id => id !== cardId);
    await saveDeck({ cardIds: updatedCardIds });
    // Add to target deck
    const targetDeckIndex = allDecks.findIndex(d => d.id === moveTargetDeck);
    if (targetDeckIndex !== -1) {
      const targetDeck = allDecks[targetDeckIndex];
      const updatedTargetDeck = { ...targetDeck, cardIds: [...targetDeck.cardIds, cardId] };
      const updatedDecks = allDecks.map(d => d.id === moveTargetDeck ? updatedTargetDeck : d);
      await saveDecks(updatedDecks);
      setAllDecks(updatedDecks);
    }
    setMovingCardId(null);
    setMoveTargetDeck('');
  };

  // Cancel move
  const handleCancelMoveCard = () => {
    setMovingCardId(null);
    setMoveTargetDeck('');
  };

  // Reset statistics for a card
  const handleResetStats = async (cardId) => {
    if (!window.confirm('Reset statistics for this card?')) return;
    const updatedCards = allCards.map(c =>
      c.id === cardId ? { ...c, totalAnswered: 0, correctAnswered: 0, lastCorrect: undefined } : c
    );
    await saveCards(updatedCards);
    setAllCards(updatedCards);
  };

  // List of other decks for moving
  const otherDecks = allDecks.filter(d => d.id !== deckId);
  const getCategoryName = (deck) => {
    const cat = categories.find(c => c.id === deck.categoryId);
    return cat ? cat.name : 'Unknown';
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" mt={4}>
      <Card sx={{ minWidth: 600, maxWidth: 900, width: '100%' }}>
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
              SelectProps={{ native: true }}
              value={studyMode}
              onChange={handleStudyModeChange}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <option value="ask_backside">Ask Backside</option>
              <option value="ask_frontside">Ask Frontside</option>
              <option value="ask_both">Ask Both</option>
            </TextField>
            <TextField
              label="Category"
              select
              SelectProps={{ native: true }}
              value={categoryId}
              onChange={handleCategoryChange}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                  <ListItem key={card.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      <>
                        <TextField
                          select
                          SelectProps={{ native: true }}
                          value={moveTargetDeck}
                          onChange={e => setMoveTargetDeck(e.target.value)}
                          size="small"
                          sx={{ mr: 1, minWidth: 180 }}
                        >
                          <option value="">Select deck...</option>
                          {otherDecks.map(d => (
                            <option key={d.id} value={d.id}>
                              {getCategoryName(d)}: {d.name}
                            </option>
                          ))}
                        </TextField>
                        <Button onClick={() => handleConfirmMoveCard(card.id)} color="primary" size="small" startIcon={<SwapHorizIcon />} disabled={!moveTargetDeck}>Move</Button>
                        <Button onClick={handleCancelMoveCard} color="inherit" size="small">Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Box sx={{ minWidth: 100, fontWeight: 500 }} component="span">Front: {card.front}</Box>
                        <Box sx={{ minWidth: 100, fontWeight: 500 }} component="span">Back: {card.back}</Box>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 90 }}>
                          Seen: {card.totalAnswered}, Correct: {card.correctAnswered}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 120 }}>
                          Last Correct: {card.lastCorrect ? new Date(card.lastCorrect).toLocaleString() : 'Never'}
                        </Typography>
                        <Button onClick={() => handleEditCard(card)} color="primary" size="small" startIcon={<EditIcon />} sx={{ ml: 1 }} />
                        <Button onClick={() => handleResetStats(card.id)} color="warning" size="small" startIcon={<UndoIcon />} sx={{ ml: 1 }} />
                        <Button onClick={() => handleDeleteCard(card.id)} color="error" size="small" startIcon={<DeleteIcon />} sx={{ ml: 1 }} />
      <Dialog open={!!confirmDeleteId} onClose={cancelDelete}>
        <DialogTitle>Delete Card</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this card?
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
                        <Button onClick={() => handleStartMoveCard(card.id)} color="primary" size="small" startIcon={<SwapHorizIcon />} sx={{ ml: 1 }} />
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