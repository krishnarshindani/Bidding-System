// server/utils/validators.js
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateBidAmount = (bidAmount, minimumAmount) => {
  return bidAmount > minimumAmount;
};

export const validateAuctionData = (data) => {
  const errors = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  if (!data.startingPrice || data.startingPrice <= 0) {
    errors.startingPrice = 'Starting price must be greater than 0';
  }

  if (!data.categoryId || data.categoryId <= 0) {
    errors.categoryId = 'Valid category is required';
  }

  if (!data.auctionEndTime) {
    errors.auctionEndTime = 'End time is required';
  } else if (new Date(data.auctionEndTime) <= new Date()) {
    errors.auctionEndTime = 'End time must be in the future';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

export const validateUserData = (data) => {
  const errors = {};

  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.username || data.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!data.passwordHash || data.passwordHash.length < 6) {
    errors.passwordHash = 'Password must be at least 6 characters';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
