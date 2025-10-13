import React, { useState, useEffect } from 'react';
import { loadDecks, saveDecks, loadCategories, loadCards, saveCards, loadCollections, saveCollections } from './storage';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export default function DeckList({ categoryId, onSelectDeck, onEditDeck }) {
  const [decks, setDecks] = useState([]);
  const [allDecks, setAllDecks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newDeck, setNewDeck] = useState('');
  const [movingId, setMovingId] = useState(null);
  const [moveCategory, setMoveCategory] = useState(categoryId);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadDecks().then(decks => {
      setAllDecks(decks);
      setDecks(decks.filter(deck => deck.categoryId === categoryId));
    });
    loadCategories().then(setCategories);
  }, [categoryId]);

  // Add new deck
  const handleAdd = async () => {
    if (!newDeck.trim()) return;
    const newD = {
      id: 'deck_' + Date.now(),
      name: newDeck.trim(),
      categoryId,
      studyMode: 'ask_backside',
      cardIds: [],
    };
    const updated = [...allDecks, newD];
    await saveDecks(updated);
    setAllDecks(updated);
    setDecks(updated.filter(deck => deck.categoryId === categoryId));
    setNewDeck('');
  };

  // Delete deck (open confirmation)
  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;

    // Find the deck to delete
    const deckToDelete = allDecks.find(deck => deck.id === id);
    // Remove the deck
    const updatedDecks = allDecks.filter(deck => deck.id !== id);
    await saveDecks(updatedDecks);
    setAllDecks(updatedDecks);
    setDecks(updatedDecks.filter(deck => deck.categoryId === categoryId));

    // Remove all cards belonging to this deck
    if (deckToDelete && deckToDelete.cardIds && deckToDelete.cardIds.length > 0) {
      const allCards = await loadCards();
      const updatedCards = allCards.filter(card => !deckToDelete.cardIds.includes(card.id));
      await saveCards(updatedCards);

      // Remove these cards from all collections (workouts)
      const allCollections = await loadCollections();
      const updatedCollections = allCollections.map(col => ({
        ...col,
        cardIds: col.cardIds.filter(cardId => !deckToDelete.cardIds.includes(cardId))
      }));
      await saveCollections(updatedCollections);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  // Start moving
  const startMove = (deck) => {
    setMovingId(deck.id);
    setMoveCategory(deck.categoryId);
  };

  // Save move
  const handleMove = async (id) => {
    const updated = allDecks.map(deck =>
      deck.id === id ? { ...deck, categoryId: moveCategory } : deck
    );
    await saveDecks(updated);
    setAllDecks(updated);
    setDecks(updated.filter(deck => deck.categoryId === categoryId));
    setMovingId(null);
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" mt={4}>
      <Card sx={{ minWidth: 350, maxWidth: 500 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Decks
          </Typography>
          <List>
            {decks.map(deck => (
              <ListItem key={deck.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {movingId === deck.id ? (
                  <>
                    <TextField
                      select
                      SelectProps={{ native: true }}
                      value={moveCategory}
                      onChange={e => setMoveCategory(e.target.value)}
                      size="small"
                      sx={{ mr: 1, minWidth: 120 }}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </TextField>
                    <Button onClick={() => handleMove(deck.id)} color="primary" size="small" startIcon={<SwapHorizIcon />}>Move</Button>
                    <Button onClick={() => setMovingId(null)} color="inherit" size="small">Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="text"
                      onClick={() => onEditDeck(deck.id)}
                      sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 500, color: 'primary.main', textDecoration: 'underline', textAlign: 'left', width: '100%' }}
                    >
                      {deck.name}
                    </Button>
                    <Button onClick={() => onSelectDeck(deck.id)} color="success" size="small" startIcon={<PlayArrowIcon />}>Study</Button>
                    <Button onClick={() => handleDelete(deck.id)} color="error" size="small" startIcon={<DeleteIcon />}>Delete</Button>
                    <Button onClick={() => startMove(deck)} color="primary" size="small" startIcon={<SwapHorizIcon />}>Move</Button>
                  </>
                )}
              </ListItem>
            ))}
          </List>
          <Box mt={2} display="flex" gap={1}>
            <TextField
              placeholder="New deck name"
              value={newDeck}
              onChange={e => setNewDeck(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              size="small"
              sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={handleAdd} disabled={!newDeck.trim()}>
              Add
            </Button>
          </Box>
          <Dialog open={!!confirmDeleteId} onClose={cancelDelete}>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this deck? This will remove all cards inside the deck and remove them from any collections.
            </DialogContent>
            <DialogActions>
              <Button onClick={cancelDelete} color="inherit">Cancel</Button>
              <Button onClick={confirmDelete} color="error">Delete</Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </Box>
  );
} 