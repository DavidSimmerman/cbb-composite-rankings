import { useId } from 'react';
import { logoSvg, VIEWBOX_TIGHT } from '@/lib/brand/logo';

/** The CBB Composite logo. `animated` draws the brackets in with the loader animation
 *  (globals.css .bracket-line / .bracket-d0-4). Sized by its container (width 100%). */
export default function BrandLogo({ className, animated = false, viewBox = VIEWBOX_TIGHT }: { className?: string; animated?: boolean; viewBox?: string }) {
	const id = `logo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
	return (
		<span
			className={`block [&>svg]:w-full [&>svg]:h-auto ${className ?? ''}`}
			dangerouslySetInnerHTML={{ __html: logoSvg({ id, viewBox, animated }) }}
		/>
	);
}
