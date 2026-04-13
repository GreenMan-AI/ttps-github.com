import { AppProvider, useApp } from '../AppContext';
import LangScreen from '../components/LangScreen';
import AuthScreen from '../components/AuthScreen';
import MainApp from '../components/MainApp';

function RootNav() {
  const { langChosen, user } = useApp();
  if (!langChosen) return <LangScreen />;
  if (!user) return <AuthScreen />;
  return <MainApp />;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNav />
    </AppProvider>
  );
}
