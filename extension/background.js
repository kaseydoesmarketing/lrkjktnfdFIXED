let websocket = null;
let reconnectInterval = null;
let userId = null;

function connectWebSocket() {
  const wsUrl = 'ws://localhost:8080';
  
  try {
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('🔌 Connected to TitleTesterPro WebSocket');
      clearInterval(reconnectInterval);
      
      if (userId) {
        websocket.send(JSON.stringify({
          type: 'AUTH',
          data: { userId, extensionId: chrome.runtime.id },
          timestamp: Date.now()
        }));
      }
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    websocket.onclose = () => {
      console.log('🔌 WebSocket connection closed, attempting to reconnect...');
      scheduleReconnect();
    };
    
    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      scheduleReconnect();
    };
  } catch (error) {
    console.error('❌ Failed to connect WebSocket:', error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectInterval) return;
  
  reconnectInterval = setInterval(() => {
    if (!websocket || websocket.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
  }, 5000);
}

function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'AUTH_SUCCESS':
      console.log('✅ Extension authenticated successfully');
      break;
      
    case 'TITLE_UPDATE_COMMAND':
      forwardToContentScript(message.data);
      break;
      
    case 'HEARTBEAT':
      websocket.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
      break;
  }
}

function forwardToContentScript(data) {
  chrome.tabs.query({ url: 'https://studio.youtube.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'UPDATE_TITLE',
        videoId: data.videoId,
        newTitle: data.newTitle
      });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
  }
});

chrome.storage.local.get(['userId'], (result) => {
  if (result.userId) {
    userId = result.userId;
    connectWebSocket();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.userId) {
    userId = changes.userId.newValue;
    if (userId) {
      connectWebSocket();
    }
  }
});

setInterval(() => {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() }));
  }
}, 30000);
