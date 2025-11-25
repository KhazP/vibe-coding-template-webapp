import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AnimatePresence } from 'framer-motion';
import { GenerationLoader } from './components/UI';

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const Part1Research = lazy(() => import('./pages/Part1Research'));
const Part2PRD = lazy(() => import('./pages/Part2PRD'));
const Part3Tech = lazy(() => import('./pages/Part3Tech'));
const Part4Agent = lazy(() => import('./pages/Part4Agent'));
const Part5Build = lazy(() => import('./pages/Part5Build'));

const LoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center p-12">
    <GenerationLoader label="Loading Workflow..." />
  </div>
);

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/research" element={<Part1Research />} />
          <Route path="/prd" element={<Part2PRD />} />
          <Route path="/tech" element={<Part3Tech />} />
          <Route path="/agent" element={<Part4Agent />} />
          <Route path="/build" element={<Part5Build />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ProjectProvider>
          <HashRouter>
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </HashRouter>
        </ProjectProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;