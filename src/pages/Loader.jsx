import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Loader() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set the auto-load URL in sessionStorage
    if (!sessionStorage.getItem('query')) {
      sessionStorage.setItem('query', 'https://winstonwebsitess.onrender.com');
    }

    const handleMsg = (e) => {
      if (e.data?.action === 'navigate' && e.data?.to) {
        navigate(e.data.to);
      }
    };

    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [navigate]);

  return (
    <iframe
      src="/src/static/loader.html?ui=false"
      className="fixed top-0 left-0 w-screen h-screen border-none m-0 p-0 overflow-hidden z-9999"
    />
  );
}