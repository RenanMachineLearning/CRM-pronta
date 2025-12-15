import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>CRM SaaS - Frontend</h1>
      <p>Bem-vindo ao CRM SaaS!</p>
      <button onClick={() => setCount((count) => count + 1)}>
        Contador: {count}
      </button>
    </div>
  );
}

export default App;

