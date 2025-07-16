document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const connectBtn = document.getElementById('connectBtn');
  const syncBtn = document.getElementById('syncBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const lastSyncEl = document.getElementById('lastSync');
  
  function updateStatus(connected, userId = null) {
    if (connected) {
      statusEl.className = 'status connected';
      statusEl.innerHTML = '<div class="status-dot"></div><span>Connected</span>';
      connectBtn.textContent = 'Disconnect';
      syncBtn.disabled = false;
    } else {
      statusEl.className = 'status disconnected';
      statusEl.innerHTML = '<div class="status-dot"></div><span>Disconnected</span>';
      connectBtn.textContent = 'Connect to TitleTesterPro';
      syncBtn.disabled = true;
    }
  }
  
  chrome.storage.local.get(['userId', 'lastSync'], (result) => {
    updateStatus(!!result.userId, result.userId);
    if (result.lastSync) {
      lastSyncEl.textContent = `Last sync: ${new Date(result.lastSync).toLocaleTimeString()}`;
    }
  });
  
  connectBtn.addEventListener('click', async () => {
    const { userId } = await chrome.storage.local.get(['userId']);
    
    if (userId) {
      await chrome.storage.local.remove(['userId']);
      updateStatus(false);
    } else {
      chrome.tabs.create({ url: 'http://localhost:3000/extension-setup' });
    }
  });
  
  syncBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.includes('studio.youtube.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'COLLECT_ANALYTICS' });
      
      await chrome.storage.local.set({ lastSync: Date.now() });
      lastSyncEl.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
    } else {
      alert('Please navigate to YouTube Studio to sync analytics');
    }
  });
  
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });
});
