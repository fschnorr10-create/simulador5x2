import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main style={{ padding: 40, fontFamily: 'system-ui' }}><h1>Não foi possível exibir o simulador.</h1><p>Recarregue a página para restaurar o exemplo inicial. Cenários salvos em JSON podem ser importados novamente.</p><button onClick={() => window.location.reload()}>Recarregar</button></main>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
