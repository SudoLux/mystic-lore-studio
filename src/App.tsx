import { useAuth } from './hooks/useAuth';
import { CanonicalWorkspaceProvider } from './hooks/useCanonicalWorkspace';
import { getPublicPortfolioRoute } from './lib/appRoutes';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { FirstStudioSetupScreen } from './pages/Auth/FirstStudioSetupScreen';
import { PublicPortfolioRoute } from './routes/PublicPortfolioRoute';
import { StudioAppRoute } from './routes/StudioAppRoute';

/**
 * Application boundary only. Private Studio composition and public projection
 * routing are intentionally isolated so public paths never touch StudioData.
 */
function App() {
  const { isLoading, isPasswordRecovery, requiresStudioSetup, session } = useAuth();
  const publicPortfolioRoute = getPublicPortfolioRoute();

  if (publicPortfolioRoute) {
    return <PublicPortfolioRoute route={publicPortfolioRoute} />;
  }

  if (isLoading || !session || isPasswordRecovery) {
    return <AuthScreen />;
  }

  if (requiresStudioSetup) return <FirstStudioSetupScreen />;

  return (
    <CanonicalWorkspaceProvider accessToken={session.access_token} userId={session.user.id}>
      <StudioAppRoute />
    </CanonicalWorkspaceProvider>
  );
}

export default App;
