import Ledger from './ledger';
import { assertHostingConfigured } from '../lib/access';
export const dynamic='force-dynamic';
export default function Home(){assertHostingConfigured();return <Ledger/>}
