import Ledger from './ledger';
import { assertPrivateHosting } from '../lib/access';
export const dynamic='force-dynamic';
export default function Home(){assertPrivateHosting();return <Ledger/>}
