import { useAuth } from './hooks/useAuth';
import { StudioDataProvider } from './hooks/useStudioData';
import { getPublicPortfolioRoute } from './lib/appRoutes';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { PublicPortfolioRoute } from './routes/PublicPortfolioRoute';
import { StudioAppRoute } from './routes/StudioAppRoute';

/**
 * Application boundary only. Private Studio composition and public projection
 * routing are intentionally isolated so public paths never touch StudioData.
 */
function App() {
  const { isLoading, session } = useAuth();
  const publicPortfolioRoute = getPublicPortfolioRoute();

  if (publicPortfolioRoute) {
    return <PublicPortfolioRoute route={publicPortfolioRoute} />;
  }

  if (isLoading || !session) {
    return <AuthScreen />;
  }

  return (
    <StudioDataProvider userId={session.user.id}>
      <StudioAppRoute />
    </StudioDataProvider>
  );
}

export default App;
