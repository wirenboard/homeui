import axios from 'axios';

export const request = axios.create({
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Accept-Language': localStorage.getItem('language') || 'ru',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
