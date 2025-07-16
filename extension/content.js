console.log('🎬 TitleTesterPro extension loaded on YouTube Studio');

class YouTubeStudioAnalytics {
  constructor() {
    this.isConnected = false;
    this.userId = null;
    this.setupMessageListener();
    this.startAnalyticsCollection();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'UPDATE_TITLE':
          this.updateVideoTitle(request.videoId, request.newTitle);
          break;
        case 'COLLECT_ANALYTICS':
          this.collectAnalytics(request.videoId);
          break;
        case 'GET_STATUS':
          sendResponse({ connected: this.isConnected, userId: this.userId });
          break;
      }
    });
  }

  async updateVideoTitle(videoId, newTitle) {
    try {
      const titleInput = document.querySelector('input[aria-label="Title"]') || 
                        document.querySelector('#textbox[placeholder*="title" i]') ||
                        document.querySelector('textarea[aria-label="Title"]');
      
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
        document.execCommand('insertText', false, newTitle);
        
        const saveButton = document.querySelector('button[aria-label="Save"]') ||
                          document.querySelector('button:contains("Save")') ||
                          document.querySelector('#save-button');
        
        if (saveButton) {
          saveButton.click();
          
          chrome.runtime.sendMessage({
            type: 'TITLE_UPDATE_COMPLETE',
            data: { videoId, newTitle, success: true }
          });
        }
      } else {
        throw new Error('Title input not found');
      }
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'TITLE_UPDATE_COMPLETE',
        data: { videoId, newTitle, success: false, error: error.message }
      });
    }
  }

  collectAnalytics(videoId) {
    try {
      const analyticsData = this.extractAnalyticsFromPage();
      
      if (analyticsData) {
        chrome.runtime.sendMessage({
          type: 'ANALYTICS_DATA',
          data: {
            videoId,
            ...analyticsData,
            timestamp: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('Failed to collect analytics:', error);
    }
  }

  extractAnalyticsFromPage() {
    const viewsElement = document.querySelector('[data-e2e-locator="views-metric"]') ||
                        document.querySelector('span:contains("views")') ||
                        this.findElementByText('views');
    
    const impressionsElement = document.querySelector('[data-e2e-locator="impressions-metric"]') ||
                              document.querySelector('span:contains("impressions")') ||
                              this.findElementByText('impressions');
    
    const ctrElement = document.querySelector('[data-e2e-locator="ctr-metric"]') ||
                      document.querySelector('span:contains("CTR")') ||
                      this.findElementByText('CTR');

    const views = this.parseNumber(viewsElement?.textContent);
    const impressions = this.parseNumber(impressionsElement?.textContent);
    const ctr = this.parsePercentage(ctrElement?.textContent);

    if (views !== null && impressions !== null) {
      return {
        views,
        impressions,
        ctr: ctr || (impressions > 0 ? (views / impressions) * 100 : 0),
        averageViewDuration: this.extractViewDuration()
      };
    }

    return null;
  }

  findElementByText(text) {
    const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }

  parseNumber(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.,]/g, '');
    const number = parseFloat(cleaned.replace(/,/g, ''));
    return isNaN(number) ? null : number;
  }

  parsePercentage(text) {
    if (!text) return null;
    const match = text.match(/([\d.]+)%/);
    return match ? parseFloat(match[1]) : null;
  }

  extractViewDuration() {
    const durationElement = document.querySelector('[data-e2e-locator="watch-time-metric"]') ||
                           this.findElementByText('watch time');
    
    if (durationElement) {
      const timeText = durationElement.textContent;
      const match = timeText.match(/(\d+):(\d+)/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
    return 0;
  }

  startAnalyticsCollection() {
    setInterval(() => {
      const currentUrl = window.location.href;
      const videoIdMatch = currentUrl.match(/\/video\/([^\/\?]+)/);
      
      if (videoIdMatch) {
        this.collectAnalytics(videoIdMatch[1]);
      }
    }, 30000);
  }
}

if (window.location.hostname === 'studio.youtube.com') {
  new YouTubeStudioAnalytics();
}
