import BrandLogo from '@/components/BrandLogo';

// Loading screen (also shown during page navigation via PathnameKey): the logo with its
// brackets drawing in stage by stage, the same timing as the old site's bracket loader.
export default function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-[#07080f]">
			<BrandLogo animated className="w-[min(380px,78vw)]" />
		</div>
	);
}
