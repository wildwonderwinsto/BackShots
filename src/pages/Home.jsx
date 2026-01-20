import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to your proxied website
    sessionStorage.setItem('query', 'https://winstonwebsitess.onrender.com');
    navigate('/indev');
  }, [navigate]);

  return null; // Or a loading spinner
};

export default Home;