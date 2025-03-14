
interface AnalyticsEvent {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}

class Analytics {
  trackEvent(type: string, data: Record<string, any>) {
    const event: AnalyticsEvent = {
      type,
      data,
      timestamp: new Date()
    };
    
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }

  trackPageView(path: string) {
    this.trackEvent('pageview', { path });
  }

  trackStreamEngagement(streamId: number, action: 'join' | 'leave' | 'chat' | 'like') {
    this.trackEvent('stream_engagement', { streamId, action });
  }
}

export const analytics = new Analytics();
