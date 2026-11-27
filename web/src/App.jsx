import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { Loading } from './components/common.jsx';

// Each page is its own chunk, so the first load only pays for the shell and the current page.
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Signup })));
const Roadmaps = lazy(() => import('./pages/Roadmaps.jsx'));
const RoadmapGroup = lazy(() => import('./pages/Roadmaps.jsx').then((m) => ({ default: m.RoadmapGroup })));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const Roles = lazy(() => import('./pages/Roles.jsx'));
const RoleHub = lazy(() => import('./pages/RoleHub.jsx'));
const InterviewHome = lazy(() => import('./pages/interview/InterviewHome.jsx'));
const InterviewSession = lazy(() => import('./pages/interview/InterviewSession.jsx'));
const Coding = lazy(() => import('./pages/Coding.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const PageView = lazy(() => import('./pages/PageView.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Import = lazy(() => import('./pages/Import.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<S><Home /></S>} />
        <Route path="login" element={<S><Login /></S>} />
        <Route path="signup" element={<S><Signup /></S>} />
        <Route path="roadmaps" element={<S><Roadmaps /></S>} />
        <Route path="g/:id" element={<S><RoadmapGroup /></S>} />
        <Route path="r/:id" element={<S><Roadmap /></S>} />
        <Route path="roles" element={<S><Roles /></S>} />
        <Route path="role/:id" element={<S><RoleHub /></S>} />
        <Route path="interview" element={<S><InterviewHome /></S>} />
        <Route path="interview/:tab" element={<S><InterviewHome /></S>} />
        <Route path="interview/session/:id" element={<S><InterviewSession /></S>} />
        <Route path="coding" element={<S><Coding /></S>} />
        <Route path="tasks" element={<S><Tasks /></S>} />
        <Route path="calendar" element={<S><Calendar /></S>} />
        <Route path="planner" element={<Navigate to="/calendar" replace />} />
        <Route path="library" element={<S><Library /></S>} />
        <Route path="cheatsheets" element={<S><Library kind="cheatsheet" /></S>} />
        <Route path="projects" element={<S><Library kind="project" /></S>} />
        <Route path="mindmaps" element={<S><Library kind="mindmap" /></S>} />
        <Route path="p/:id" element={<S><PageView /></S>} />
        <Route path="resources" element={<S><Resources /></S>} />
        <Route path="profile" element={<S><Profile /></S>} />
        <Route path="import" element={<S><Import /></S>} />
        <Route path="*" element={<S><NotFound /></S>} />
      </Route>
    </Routes>
  );
}

function S({ children }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
