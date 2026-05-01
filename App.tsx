import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './AppContext';
import LangScreen from './components/LangScreen';
import AuthScreen from './components/AuthScreen';
import MainApp from './components/MainApp';

function RootContent() {
  const { langChosen, user } = useApp();
  if (!langChosen) return <LangScreen />;
  if (!user)       return <AuthScreen />;
  return <MainApp />;
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor="#0a0a0f" />
      <RootContent />
    </AppProvider>
  );
}
