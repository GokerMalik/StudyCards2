import CategoryList from './CategoryList';
import DeckList from './DeckList';
import React, { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { initializeSampleData } from './storage';
import StudySession from './StudySession';
import DeckEdit from './DeckEdit';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { loadCollections, saveCollections } from './storage';
import { loadCards } from './storage';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Divider from '@mui/material/Divider';
initializeSampleData();


function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckToEdit, setDeckToEdit] = useState(null);
  const [categories, setCategories] = useState([]);
  const [decks, setDecks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [newCollection, setNewCollection] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedDecks, setSelectedDecks] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [viewCollection, setViewCollection] = useState(null);
  const [allCards, setAllCards] = useState([]);

  useEffect(() => {
    // Load categories, decks, and collections for breadcrumbs and home
    (async () => {
      setCategories(await import('./storage').then(m => m.loadCategories()).then(p => p));
      setDecks(await import('./storage').then(m => m.loadDecks()).then(p => p));
      setCollections(await import('./storage').then(m => m.loadCollections()).then(p => p));
      setAllCards(await import('./storage').then(m => m.loadCards()).then(p => p));
    })();
  }, [selectedCategory, selectedDeck, deckToEdit]);

  // Get names for breadcrumbs
  const category = categories.find(c => c.id === selectedCategory);
  const deck = decks.find(d => d.id === selectedDeck || d.id === deckToEdit);

  // Breadcrumbs logic
  const breadcrumbs = [
    <Link key="categories" underline="hover" color="inherit" onClick={() => {
      setSelectedCategory(null);
      setSelectedDeck(null);
      setDeckToEdit(null);
      setViewCollection(null);
      setSelectedCollection(null);
    }} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <HomeIcon fontSize="small" sx={{ mb: '2px' }} /> Categories
    </Link>
  ];
  if (selectedCategory) {
    breadcrumbs.push(
      <Link key="category" underline="hover" color="inherit" onClick={() => {
        setSelectedDeck(null);
        setDeckToEdit(null);
      }} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <FolderIcon fontSize="small" sx={{ mb: '2px' }} /> {category ? category.name : '...'}
      </Link>
    );
  }
  if (deckToEdit) {
    breadcrumbs.push(
      <Typography key="deck" color="primary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MenuBookIcon fontSize="small" sx={{ mb: '2px' }} /> {deck ? deck.name : '...'}
      </Typography>
    );
  } else if (selectedDeck) {
    breadcrumbs.push(
      <Typography key="deck" color="primary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MenuBookIcon fontSize="small" sx={{ mb: '2px' }} /> {deck ? deck.name : '...'}
      </Typography>
    );
  }

  // Workouts section (collections)
  const renderWorkouts = () => (
    <Box sx={{ mb: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1} justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <FitnessCenterIcon color="primary" />
          <Typography variant="h6">Workouts</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)} sx={{ fontWeight: 500 }}>
          CREATE COLLECTION
        </Button>
      </Box>
      <Box>
        {collections.length === 0 ? (
          <Typography color="text.secondary">No collections yet.</Typography>
        ) : (
          <List>
            {collections.map(col => (
              <ListItem key={col.id} secondaryAction={
                <Box display="flex" gap={1}>
                  <Button onClick={() => setSelectedCollection(col.id)} color="success" size="small" startIcon={<PlayArrowIcon />}>Study</Button>
                  <Button onClick={() => handleDeleteCollection(col.id)} color="error" size="small" startIcon={<DeleteIcon />}>Delete</Button>
                </Box>
              }>
                <Typography sx={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setViewCollection(col.id)}>{col.name}</Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>CREATE COLLECTION</DialogTitle>
        <DialogContent>
          <TextField
            label="Collection Name"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Select Decks</Typography>
          <FormGroup>
            {categories.map(cat => (
              <Box key={cat.id} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">{cat.name}</Typography>
                {decks.filter(deck => deck.categoryId === cat.id).map(deck => (
                  <FormControlLabel
                    key={deck.id}
                    control={
                      <Checkbox
                        checked={selectedDecks.includes(deck.id)}
                        onChange={e => {
                          setSelectedDecks(prev =>
                            e.target.checked
                              ? [...prev, deck.id]
                              : prev.filter(id => id !== deck.id)
                          );
                        }}
                      />
                    }
                    label={deck.name}
                  />
                ))}
              </Box>
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkout} variant="contained" disabled={!workoutName.trim() || selectedDecks.length === 0}>CREATE</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Add collection (workout)
  const handleCreateWorkout = async () => {
    // Gather all cards from selected decks
    const allCardIds = decks
      .filter(deck => selectedDecks.includes(deck.id))
      .flatMap(deck => deck.cardIds);
    // Get card objects
    const selectedCards = allCards.filter(card => allCardIds.includes(card.id));
    let chosenCards;
    if (selectedCards.length <= 20) {
      chosenCards = selectedCards;
    } else {
      chosenCards = [...selectedCards].sort((a, b) => {
        // Calculate correct ratio for a and b
        const ratioA = a.totalAnswered === 0 ? 0 : a.correctAnswered / a.totalAnswered;
        const ratioB = b.totalAnswered === 0 ? 0 : b.correctAnswered / b.totalAnswered;
        // Lower ratio comes first
        if (ratioA < ratioB) return -1;
        if (ratioA > ratioB) return 1;
        return 0;
      }).slice(0, 20);
    }
    const newCol = { id: 'col_' + Date.now(), name: workoutName.trim(), cardIds: chosenCards.map(card => card.id) };
    const updated = [...collections, newCol];
    await saveCollections(updated);
    setCollections(updated);
    setWorkoutName('');
    setSelectedDecks([]);
    setCreateDialogOpen(false);
  };

  // Delete collection
  const handleDeleteCollection = async (id) => {
    if (!window.confirm('Delete this collection?')) return;
    const updated = collections.filter(col => col.id !== id);
    await saveCollections(updated);
    setCollections(updated);
  };

  // Collection view page
  const renderCollectionView = () => {
    const collection = collections.find(col => col.id === viewCollection);
    if (!collection) return null;
    const cards = collection.cardIds.map(id => decks.flatMap(deck => deck.cardIds).includes(id) ? allCards.find(c => c.id === id) : null).filter(Boolean);
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setViewCollection(null)} sx={{ mb: 2 }}>Back</Button>
        <Typography variant="h5" gutterBottom>{collection.name}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Cards in this workout:
        </Typography>
        {cards.length === 0 ? (
          <Typography color="text.secondary">No cards in this collection.</Typography>
        ) : (
          <List>
            {cards.map(card => (
              <ListItem key={card.id}>
                <Box sx={{ minWidth: 100, fontWeight: 500 }} component="span">Front: {card.front}</Box>
                <Box sx={{ minWidth: 100, fontWeight: 500, ml: 2 }} component="span">Back: {card.back}</Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, minWidth: 90 }}>
                  Seen: {card.totalAnswered}, Correct: {card.correctAnswered}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, minWidth: 120 }}>
                  Last Correct: {card.lastCorrect ? new Date(card.lastCorrect).toLocaleString() : 'Never'}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  };

  // Handler to reload cards after session complete
  const handleSessionComplete = async () => {
    setAllCards(await import('./storage').then(m => m.loadCards()).then(p => p));
  };

  return (
    <Box className="App" sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom>Study Cards</Typography>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, px: 2, py: 1, boxShadow: 1, display: 'inline-block' }}>
          <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 2 }}>
            {breadcrumbs}
          </Breadcrumbs>
        </Box>
      </Box>
      {viewCollection ? (
        renderCollectionView()
      ) : !selectedCategory && !selectedDeck && !deckToEdit && !selectedCollection && !viewCollection ? (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <CategoryList onSelectCategory={setSelectedCategory} />
          <Divider sx={{ my: 4 }} />
          {renderWorkouts()}
        </Box>
      ) : deckToEdit ? (
        <DeckEdit deckId={deckToEdit} />
      ) : !selectedDeck && selectedCollection ? (
        <StudySession collectionId={selectedCollection} onBackToDecks={() => setSelectedCollection(null)} onSessionComplete={handleSessionComplete} />
      ) : !selectedDeck ? (
        <DeckList categoryId={selectedCategory} onSelectDeck={setSelectedDeck} onEditDeck={setDeckToEdit} />
      ) : (
        <StudySession deckId={selectedDeck} onBackToDecks={() => setSelectedDeck(null)} onSessionComplete={handleSessionComplete} />
      )}
    </Box>
  );
}

export default App;
