import React, { useState, useEffect } from 'react';

function HomePage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/data')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to the AI Résumé Sorter!</p>
      <p><strong>Message from backend:</strong> {message}</p>
    </div>
  );
}

export default HomePage; 