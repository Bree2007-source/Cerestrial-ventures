const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_HOST = API_BASE_URL.replace(/\/api$/, '');

export { API_BASE_URL, API_HOST };
export default API_BASE_URL;
