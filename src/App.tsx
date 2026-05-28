import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { QuizOverview } from './pages/QuizOverview';
import { QuizPlayer } from './pages/QuizPlayer';
import { Result } from './pages/Result';
import { CertPage } from './pages/CertPage';
import { VerifyPage } from './pages/VerifyPage';
import { MyCerts } from './pages/MyCerts';
import { About } from './pages/About';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Terms } from './pages/Terms';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quiz/:id" element={<QuizOverview />} />
      <Route path="/quiz/:id/take" element={<QuizPlayer />} />
      <Route path="/quiz/:id/result" element={<Result />} />
      <Route path="/cert/:certId" element={<CertPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/me" element={<MyCerts />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      {/* 404 catch-all — must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
