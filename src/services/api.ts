// API service for real-time data from MySQL
// For ngrok/remote usage, set `VITE_API_BASE` to your public backend URL (e.g. "https://xxxx.ngrok-free.app/api")
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : "http://localhost:3000/api");

// Helper to get stored auth token
const getToken = (): string | null => localStorage.getItem('auth_token');

// Helper to get client IP address from browser
const getClientIP = async (): Promise<string> => {
  try {
    // Try multiple methods to get client IP
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return data.ip || '';
    }
  } catch (error) {
    console.warn('Failed to get client IP from ipify:', error);
  }

  try {
    // Fallback to ip-api.com
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return data.query || '';
    }
  } catch (error) {
    console.warn('Failed to get client IP from ip-api:', error);
  }

  return '';
};

// Helper to get user agent
const getUserAgent = (): string => {
  return navigator.userAgent || 'Unknown';
};

// Helper to make authenticated requests
const authHeaders = (token?: string): HeadersInit => {
  const t = token || getToken();
  return t ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` } : { 'Content-Type': 'application/json' };
};

export const API_SERVICE = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      return data;
    },
    register: async (name: string, email: string, password: string, role: string) => {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      return data;
    },
    me: async (token: string) => {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) return null;
      return response.json();
    },
  },

  // Auctions
  auctions: {
    getActive: async (limit = 20, offset = 0) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/active?limit=${limit}&offset=${offset}`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching active auctions:', error);
        return [];
      }
    },
    getById: async (id: number | string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/${id}`);
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching auction:', error);
        return null;
      }
    },
    getImages: async (auctionId: number | string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/${auctionId}/images`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching auction images:', error);
        return [];
      }
    },
    getByCategory: async (categoryId: number | string, limit = 20, offset = 0) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/category/${categoryId}?limit=${limit}&offset=${offset}`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching auctions by category:', error);
        return [];
      }
    },
    getBySeller: async (sellerId: number | string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/seller/${sellerId}`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching seller auctions:', error);
        return [];
      }
    },
    getAllAdmin: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/admin/all`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching all auctions:', error);
        return [];
      }
    },
    create: async (auctionData: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/create`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(auctionData),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create auction (${response.status})`);
      } catch (error) {
        console.error('Error creating auction:', error);
        throw error;
      }
    },
    updateStatus: async (id: number, status: string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/${id}/status`, {
          method: 'PUT',
          headers: authHeaders(token),
          body: JSON.stringify({ status }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update auction (${response.status})`);
      } catch (error) {
        console.error('Error updating auction:', error);
        throw error;
      }
    },
    uploadImage: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    },
    uploadMultipleImages: async (files: File[]) => {
      try {
        const formData = new FormData();
        files.forEach((file, index) => {
          formData.append(`images`, file);
        });
        const response = await fetch(`${API_BASE}/upload-multiple`, {
          method: 'POST',
          body: formData,
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload images');
      } catch (error) {
        console.error('Error uploading multiple images:', error);
        throw error;
      }
    },
  },

  // Bids
  bids: {
    getAll: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/bids`, { headers: authHeaders(token) });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching all bids:', error);
        return [];
      }
    },
    getByAuction: async (auctionId: number | string) => {
      try {
        const response = await fetch(`${API_BASE}/bids/auction/${auctionId}`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching bids:', error);
        return [];
      }
    },
    getHighestBid: async (auctionId: number | string) => {
      try {
        const response = await fetch(`${API_BASE}/bids/highest/${auctionId}`);
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching highest bid:', error);
        return null;
      }
    },
    placeBid: async (auctionId: number, bidAmount: number, token: string) => {
      try {
        // Get client IP and user agent for fraud detection
        const [clientIP, userAgent] = await Promise.all([
          getClientIP(),
          Promise.resolve(getUserAgent())
        ]);

        const response = await fetch(`${API_BASE}/bids/place`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ 
            auctionId, 
            bidAmount,
            clientIP,
            userAgent
          }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to place bid (${response.status})`);
      } catch (error) {
        console.error('Error placing bid:', error);
        throw error;
      }
    },
    placeLockedBid: async (auctionId: number, bidAmount: number, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/bids/place-locked`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ auctionId, bidAmount }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to place locked bid (${response.status})`);
      } catch (error) {
        console.error('Error placing locked bid:', error);
        throw error;
      }
    },
    checkProxyAllowed: async (auctionId: number | string) => {
      try {
        const response = await fetch(`${API_BASE}/bids/proxy-allowed/${auctionId}`);
        if (response.ok) return response.json();
        return { proxyBiddingAllowed: false, message: 'Unable to check proxy bidding status' };
      } catch (error) {
        console.error('Error checking proxy bidding status:', error);
        return { proxyBiddingAllowed: false, message: 'Unable to check proxy bidding status' };
      }
    },
  },

  // Analytics
  analytics: {
    getStats: async () => {
      try {
        const response = await fetch(`${API_BASE}/analytics/stats`);
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
      }
    },
    getTrends: async (days = 30) => {
      try {
        const response = await fetch(`${API_BASE}/analytics/trends?days=${days}`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching trends:', error);
        return [];
      }
    },
    getBidActivity: async () => {
      try {
        const response = await fetch(`${API_BASE}/analytics/bid-activity`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching bid activity:', error);
        return [];
      }
    },
    getCategories: async () => {
      try {
        const response = await fetch(`${API_BASE}/analytics/categories`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },
    getTopAuctions: async (limit = 8) => {
      try {
        const response = await fetch(`${API_BASE}/analytics/top-auctions?limit=${limit}`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching top auctions:', error);
        return [];
      }
    },
    getLiveBids: async (limit = 10) => {
      try {
        const response = await fetch(`${API_BASE}/analytics/live-bids?limit=${limit}`);
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch live bids (${response.status})`);
      } catch (error) {
        console.error('Error fetching live bids:', error);
        throw error;
      }
    },
  },

  // Categories
  categories: {
    getAll: async () => {
      try {
        const response = await fetch(`${API_BASE}/categories`);
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },
  },

  // Users (Admin)
  users: {
    getCredits: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/credits`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching credits:', error);
        return null;
      }
    },
    getAvailableCredits: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/available-credits`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching available credits:', error);
        return null;
      }
    },
    getCreditSummary: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/credit-summary`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching credit summary:', error);
        return null;
      }
    },
    getAllUsers: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/admin/all`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    getNotifications: async (userId: number | string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/notifications/${userId}`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    getBidHistory: async (userId: number | string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/bid-history/${userId}`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return [];
      } catch (error) {
        console.error('Error fetching bid history:', error);
        return [];
      }
    },
    assignCredits: async (userId: number, amount: number, reason: string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/admin/assign-credits`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ userId, amount, reason }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign credits');
      } catch (error) {
        console.error('Error assigning credits:', error);
        throw error;
      }
    },
    deductCredits: async (userId: number, amount: number, reason: string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/users/admin/deduct-credits`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ userId, amount, reason }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to deduct credits');
      } catch (error) {
        console.error('Error deducting credits:', error);
        throw error;
      }
    },
    getWonAuctions: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/user/won`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return { auctions: [], count: 0 };
      } catch (error) {
        console.error('Error fetching won auctions:', error);
        return { auctions: [], count: 0 };
      }
    },
    getLostAuctions: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/user/lost`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return { auctions: [], count: 0 };
      } catch (error) {
        console.error('Error fetching lost auctions:', error);
        return { auctions: [], count: 0 };
      }
    },
    getAdminWinners: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/auctions/admin/winners`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return { winners: [], count: 0 };
      } catch (error) {
        console.error('Error fetching winners:', error);
        return { winners: [], count: 0 };
      }
    },
  },
  ai: {
    generateDescription: async (title: string, category: string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/generate-description`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ title, category }),
        });
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate description');
      } catch (error) {
        console.error('Error calling AI:', error);
        throw error;
      }
    },
    getBidSuggestion: async (data: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/bid-suggestion`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        });
        if (response.ok) return response.json();
        return null; // Fallback handled gracefully in UI
      } catch (error) {
        console.error('Error getting AI suggestion:', error);
        return null;
      }
    },
    getBiddingAnalysis: async (data: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/bidding-analysis`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error getting bidding analysis:', error);
        return null;
      }
    },
    getWinningProbability: async (data: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/winning-probability`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error getting winning probability:', error);
        return null;
      }
    },
    getWinningProbabilityLLM: async (data: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/winning-probability-llm`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error getting LLM winning probability:', error);
        return null;
      }
    },
    getAuctionIntelligence: async (data: any, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/auction-intelligence`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error getting auction intelligence:', error);
        return null;
      }
    }
  },

  // Fraud Detection
  fraud: {
    getFraudSummary: async (token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/fraud-summary`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return { summary: [], count: 0 };
      } catch (error) {
        console.error('Error fetching fraud summary:', error);
        return { summary: [], count: 0 };
      }
    },
    getFraudAnalysis: async (auctionId: number | string, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/fraud-analysis/${auctionId}`, {
          headers: authHeaders(token),
        });
        if (response.ok) return response.json();
        return null;
      } catch (error) {
        console.error('Error fetching fraud analysis:', error);
        return null;
      }
    },
    validateBid: async (auctionId: number, bidderId: number, bidAmount: number, token: string) => {
      try {
        const response = await fetch(`${API_BASE}/ai/validate-bid`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ auctionId, bidderId, bidAmount }),
        });
        if (response.ok) return response.json();
        return { isValid: false, reason: 'Validation failed', riskLevel: 'unknown' };
      } catch (error) {
        console.error('Error validating bid:', error);
        return { isValid: false, reason: 'Validation error', riskLevel: 'unknown' };
      }
    }
  }
};
