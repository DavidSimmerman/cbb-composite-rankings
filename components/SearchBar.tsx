import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';

export default function SearchBar({
	searchQuery,
	setSearchQuery,
	placeholder = 'Search...',
	className
}: {
	searchQuery: string | undefined;
	setSearchQuery: (q: string) => void;
	placeholder?: string;
	className?: string;
}) {
	return (
		<InputGroup className={`h-auto ${className}`}>
			<InputGroupInput placeholder={placeholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
			<InputGroupAddon>
				<Search className={`text-white`} />
			</InputGroupAddon>
		</InputGroup>
	);
}
