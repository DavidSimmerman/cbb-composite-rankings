import type { MetadataRoute } from 'next';
import { getAllTeamData } from '@/lib/espn/espn-team-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = 'https://cbbcomposite.com';
	const now = new Date();

	const staticRoutes: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 1.0,
		},
		{
			url: `${baseUrl}/games`,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 0.8,
		},
		{
			url: `${baseUrl}/bracket`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/march`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/march/factors`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.7,
		},
	];

	const allTeams = await getAllTeamData();
	const teamRoutes: MetadataRoute.Sitemap = Object.keys(allTeams).map(teamKey => ({
		url: `${baseUrl}/${teamKey}`,
		lastModified: now,
		changeFrequency: 'daily' as const,
		priority: 0.6,
	}));

	return [...staticRoutes, ...teamRoutes];
}
