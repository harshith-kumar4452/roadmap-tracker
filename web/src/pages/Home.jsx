// PORTING: placeholder until the home page is rebuilt in React + MUI.
import { Pending } from '../components/Pending.jsx';
import TodayWidget from '../components/TodayWidget.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Home() {
  const { admin } = useAuth();
  return <><Pending name="Home" />{admin && <TodayWidget />}</>;
}
