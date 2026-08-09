const API_BASE_URL = (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '8080' ||
  window.location.port === '5000'
)
  ? 'http://127.0.0.1:5000'
  : 'https://placement-portal-v2-1-rgjy.onrender.com';

window.API_BASE_URL = API_BASE_URL;
console.log('Current API_BASE_URL:', window.API_BASE_URL);