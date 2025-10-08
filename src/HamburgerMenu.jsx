import React, { useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import { saveCategories, saveDecks, saveCards, loadCategories, loadDecks, loadCards } from './storage';

// Helper to download JSON in browser
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function HamburgerMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const fileInputRef = useRef(null);

  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLoad = async () => {
    handleClose();
    // If running in electron, ask main process via preload to show dialog
    if (window && window.electronAPI && window.electronAPI.openAndLoad) {
      try {
        const result = await window.electronAPI.openAndLoad();
        if (!result || result.canceled) {
          if (result && result.error) console.error('openAndLoad error', result.error);
          return;
        }
        const data = result.data;
        await saveCategories(data.categories || []);
        await saveDecks(data.decks || []);
        await saveCards(data.cards || []);
        window.location.reload();
      } catch (err) {
        console.error('Load failed', err);
      }
    } else {
      // Trigger hidden file input for web
      fileInputRef.current && fileInputRef.current.click();
    }
  };

  const onFileSelected = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      // Expecting { categories, decks, cards }
      await saveCategories(data.categories || []);
      await saveDecks(data.decks || []);
      await saveCards(data.cards || []);
      // Reload to update UI
      window.location.reload();
    } catch (err) {
      console.error('Failed to load file', err);
      alert('Failed to load JSON file: ' + err.message);
    }
  };

  const handleSaveAs = async () => {
    handleClose();
    // Get current data
    try {
      const data = {
        categories: await loadCategories(),
        decks: await loadDecks(),
        cards: await loadCards(),
      };
      if (window && window.electronAPI && window.electronAPI.saveAs) {
        const res = await window.electronAPI.saveAs(data);
        if (res && res.canceled === false) {
          alert('Saved');
        } else if (res && res.error) {
          alert('Save failed: ' + res.error);
        }
      } else {
        downloadJSON('data.json', data);
      }
    } catch (err) {
      console.error('Save failed', err);
      alert('Save failed: ' + err.message);
    }
  };

  return (
    <div className="hamburger-root">
      <IconButton aria-label="menu" onClick={handleOpen} size="large">
        <MenuIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleLoad}>Load Table</MenuItem>
        <MenuItem onClick={handleSaveAs}>Save Table as</MenuItem>
      </Menu>
      <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onFileSelected} />
    </div>
  );
}
