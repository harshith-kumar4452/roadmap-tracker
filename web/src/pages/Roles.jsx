import WorkOutline from '@mui/icons-material/WorkOutline';
import { PageHeader, Loading, ErrorState } from '../components/common.jsx';
import { RoleGrid } from './Roadmaps.jsx';
import { useApi } from '../lib/hooks.js';

export default function Roles() {
  const list = useApi('/roadmaps', { topics: ['roadmaps'] });
  return (
    <>
      <PageHeader title="Job roles" icon={WorkOutline} subtitle="Roadmaps grouped by the job you're preparing for, each with resources, interview patterns, projects and a playground." />
      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <Loading /> : <RoleGrid list={list.data} />}
    </>
  );
}
