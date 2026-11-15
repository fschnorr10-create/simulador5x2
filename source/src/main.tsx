import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider, useI18n } from './i18n';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <ErrorFallback />;
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useI18n();
  return <main style={{ padding: 40, fontFamily: 'system-ui' }}><h1>{t('Não foi possível exibir o simulador.')}</h1><p>{t('Recarregue a página para restaurar o exemplo inicial. Cenários salvos em JSON podem ser importados novamente.')}</p><button onClick={() => window.location.reload()}>{t('Recarregar')}</button></main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><ErrorBoundary><App /></ErrorBoundary></LanguageProvider></React.StrictMode>);
