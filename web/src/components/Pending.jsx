// Temporary placeholder used only while pages are being ported on the react-mui branch.
import { EmptyState } from './common.jsx';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
export function Pending({ name }) {
  return <EmptyState icon={ConstructionOutlined} title={`${name}: being rebuilt`} text="This page is being ported to the new interface." />;
}
