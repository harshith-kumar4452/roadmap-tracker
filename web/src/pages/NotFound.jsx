import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';
import ExploreOffOutlined from '@mui/icons-material/ExploreOffOutlined';
import { EmptyState } from '../components/common.jsx';

export default function NotFound() {
  return (
    <EmptyState
      icon={ExploreOffOutlined}
      title="Page not found"
      text="That link doesn't match any page here. It may have moved."
      action={<Button variant="contained" component={RouterLink} to="/">Back to home</Button>}
    />
  );
}
