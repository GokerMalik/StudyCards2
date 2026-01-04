import React, { useState, useEffect } from 'react';
import { loadCategories, saveCategories, loadDecks } from './storage';
import { removeDecks } from './cardManager';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

export default function CategoryList({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadCategories().then(setCategories);
  }, []);

  // Add new category
  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    const newCat = {
      id: 'cat_' + Date.now(),
      name: newCategory.trim(),
    };
    const updated = [...categories, newCat];
    await saveCategories(updated);
    setCategories(updated);
    setNewCategory('');
  };

  // Delete category (open confirmation dialog)
  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;

    // Remove the category
    const updatedCategories = categories.filter(cat => cat.id !== id);
    await saveCategories(updatedCategories);
    setCategories(updatedCategories);

    // Remove all decks in this category and prune orphaned cards
    const allDecks = await loadDecks();
    const decksToDelete = allDecks.filter(deck => deck.categoryId === id);
    if (decksToDelete.length > 0) {
      await removeDecks(decksToDelete.map(deck => deck.id));
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  // Start renaming
  const startRename = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  // Save rename
  const handleRename = async (id) => {
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, name: editingName.trim() } : cat
    );
    await saveCategories(updated);
    setCategories(updated);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" mt={4}>
      <Card sx={{ minWidth: 350, maxWidth: 1200, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Categories
          </Typography>
          <List>
            {categories.map(cat => (
              <ListItem key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {editingId === cat.id ? (
                  <>
                    <TextField
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(cat.id)}
                      size="small"
                      autoFocus
                      sx={{ mr: 1 }}
                    />
                    <Button onClick={() => handleRename(cat.id)} color="success" size="small" startIcon={<SaveIcon />}>Save</Button>
                    <Button onClick={() => setEditingId(null)} color="inherit" size="small" startIcon={<CancelIcon />}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button variant="text" onClick={() => onSelectCategory(cat.id)} sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none' }}>
                      {cat.name}
                    </Button>
                    <Button onClick={() => startRename(cat)} color="primary" size="small" startIcon={<EditIcon />} />
                    <Button onClick={() => handleDelete(cat.id)} color="error" size="small" startIcon={<DeleteIcon />} />
                  </>
                )}
              </ListItem>
            ))}
          </List>
          <Box mt={2} display="flex" gap={1}>
            <TextField
              placeholder="New category name"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              size="small"
              sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={handleAdd} disabled={!newCategory.trim()}>
              Add
            </Button>
          </Box>
          <Dialog open={!!confirmDeleteId} onClose={cancelDelete}>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this category? Decks will be removed and their cards unlinked, and only deleted if they are not used elsewhere.
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
