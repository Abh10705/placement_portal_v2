const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.API_BASE_URL}`
  : 'https://placement-portal-v2-1-rgjy.onrender.com';

window.API_BASE_URL = API_BASE_URL;