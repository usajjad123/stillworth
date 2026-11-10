/** Two folded ledger ribbons, interlocking into an angular S. */
export default function BrandMark({className=''}:{className?:string}){
 return <svg className={'brand-symbol '+className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false"><path className="ribbon-one" d="M39 6H19L5 20L19 34H29L15 20L23 12H33L39 6Z"/><path className="ribbon-two" d="M9 42H29L43 28L29 14H19L33 28L25 36H15L9 42Z"/></svg>;
}
