import { twMerge } from 'tailwind-merge';

export default function TitleBar({ className, title }: { className?: string; title: string | React.ReactNode }) {
	return (
		<div className={twMerge('flex items-center justify-center mt-10 gap-0 mx-4', className)}>
			<svg
				viewBox="0 0 339 124"
				className="w-20 h-10 sm:w-40 sm:h-14 md:w-60 md:h-14 text-neutral-400 -skew-x-12 shrink-0"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
			>
				<line x1="0" y1="2" x2="105" y2="2" />
				<line x1="0" y1="42" x2="105" y2="42" />
				<line x1="105" y1="2" x2="105" y2="42" />
				<line x1="105" y1="22" x2="210" y2="22" />
				<line x1="0" y1="82" x2="105" y2="82" />
				<line x1="0" y1="122" x2="105" y2="122" />
				<line x1="105" y1="82" x2="105" y2="122" />
				<line x1="105" y1="102" x2="210" y2="102" />
				<line x1="210" y1="22" x2="210" y2="102" />
				<line x1="210" y1="62" x2="337" y2="62" />
			</svg>
			<div className="font-kanit text-center font-medium italic text-2xl md:text-5xl mx-2">{title}</div>
			<svg
				viewBox="21 0 339 124"
				className="w-20 h-10 sm:w-40 sm:h-14 md:w-60 md:h-14 text-neutral-400 -skew-x-12 shrink-0"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
			>
				<line x1="360" y1="2" x2="255" y2="2" />
				<line x1="360" y1="42" x2="255" y2="42" />
				<line x1="255" y1="2" x2="255" y2="42" />
				<line x1="255" y1="22" x2="150" y2="22" />
				<line x1="360" y1="82" x2="255" y2="82" />
				<line x1="360" y1="122" x2="255" y2="122" />
				<line x1="255" y1="82" x2="255" y2="122" />
				<line x1="255" y1="102" x2="150" y2="102" />
				<line x1="150" y1="22" x2="150" y2="102" />
				<line x1="150" y1="62" x2="23" y2="62" />
			</svg>
		</div>
	);
}
